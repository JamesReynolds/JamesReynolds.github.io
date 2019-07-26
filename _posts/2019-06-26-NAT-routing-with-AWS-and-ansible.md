---
layout:     post
title:      "NAT routing with AWS and ansible"
date:       2019-06-26 17:30:30 +0100
categories: devops aws
published:  true
---

Creating a true private network in EC2 with network address translation for
ingress and egress.

# In brief

The EC2 Nat Gateway doesn't support ingress traffic and the network load
balancer doesn't support egress traffic. If you want both directions you have
to use both (or a public IP).

## Schematic

The plan is to create a private subnet `10.0.2.0/24` with our machine(s) under
test and a public subnet `10.0.1.0/24` with other test components. All machines
need to access the internet but the machines in `10.0.2.0/24` are really
restricted in what they can do.

![schematic](/assets/schematic.svg)

The load balancer configuration is the only _really_ unusual (i.e. not what
you'd normally see in the cloud) deployment:

1. Each machine under test is its own target group
2. A mapping exists for various C&C ports to each group 


## Why?!

We needed a test network that matched, very very closely, and existing network
so that the legacy application could be tested on EC2 exactly as if it were
running on-prem. Messy... but its a stepping stone to breaking this particular
monolith. Our steps are:

1. Setup an Ansible stack so that everything is reproducible
2. Construct an environment in EC2 that matches prod _as closely as possible_
3. Load the existing application (with latest data) into the environment
4. Test the application in the environment automatically

Now, any changes to the application during its decomposition can be made after
step 4:

5. Make the change
6. Hit the big red test button

![red button](/assets/button.jpg){: .center-image }
(Should that button be green? Its not risky anymore!)

## Steps

Creating this is pretty easy, the only _real_ gotcha is that you _must_ have a 
public subnet and internet gateway - otherwise the NAT Gateway has no egress
route.

1. Create a VPC (`10.0.0.0/16`) with public (`10.0.1.0/24`) and private (`10.0.2.0/24`) subnets
2. Create an internet and a NAT gateway
3. Create the routing tables
4. Create a target group for ingress targets and a load balancer
5. Create the security groups and machines

### 1. Constructing the VPC and subnets

Constructing the VPC and subnets is pretty easy. The following in the playbook
will do it:

```
{% raw %}
- name: Create VPC
  ec2_vpc_net:
      state:          'present'
      name:           'Test VPC'
      cidr_block:     '10.0.0.0/16'
      region:         'eu-west-1'
  register: result_vpc

- name: Create public subnet
  ec2_vpc_subnet:
    state:            'present'
    vpc_id:           "{{ result_vpc.vpc.id }}"
    cidr:             '10.0.1.0/16'
    az:               'eu-west-1a'
    region:           'eu-west-1'
    map_public:       true
  register: result_public_subnet

- name: Create private subnet
  ec2_vpc_subnet:
    state:            'present'
    vpc_id:           "{{ result_vpc.vpc.id }}"
    cidr:             '10.0.2.0/16'
    az:               'eu-west-1a'
    region:           'eu-west-1'
    map_public:       false
  register: result_private_subnet
{% endraw %}
```

### 2. Construct the gateways

Constructing the gateways is pretty simple too. ...but... we _must_ have a
public subnet for the NAT gateway to work.

```
{% raw %}
- name: Create Internet Gateway for VPC
  ec2_vpc_igw:
     state:           'present'
     vpc_id:          "{{ result_vpc.vpc.id }}"
     region:          'eu-west-1'
  register: result_igw

- name: Create NAT Gateway
  ec2_vpc_nat_gateway:
    state:                  'present'
    subnet_id:              "{{ result_public_subnet.subnet.id }}"
    wait:                   yes
    if_exist_do_not_create: true
    release_eip:            true
  register: result_nat_gateway
{% endraw %}
```

Adding in `release_eip` and `if_exist_do_not_create` keeps things nice and
neat as the gateway creation is idempotent and when we destroy it we get
rid of the EIP too.

### 3. Create the routing tables 

This is pretty easy. As we control all the machines we don't
need to worry about particular routes, we just tell the machines
how to access the outside world:

```
{% raw %}
- name: Set up the public subnet route table
  ec2_vpc_route_table:
    vpc_id:           "{{ result_vpc.vpc.id }}"
    region:           'eu-west-1'
    subnets:          "{{ result_public_subnet.subnet.id }}"
    routes:
      - dest:         '0.0.0.0/0'
        gateway_id:   "{{ result_igw.gateway_id }}"
  register: result_public_route

- name: Set up private subnet route table
  ec2_vpc_route_table:
    vpc_id:           "{{ result_vpc.vpc.id }}"
    region:           'eu-west-1'
    subnets:          "{{ result_private_subnet.subnet.id }}"
    routes:
      - dest:         '0.0.0.0/0'
        gateway_id:   "{{ result_nat_gateway.nat_gateway_id }}"
  register: result_private_route
{% endraw %}
```

### 4. Construct the target groups and load balancer

This is where things get hairy! We defined the machines as a list in 
Ansible so we can loop over them to make the target groups and fit them
into the balancer:

```
{% raw %}
machines:
  - name: machine1
    address: 10.0.2.101
    routes:
        - from_port: 80
          to_port: 80
        - from_port: 43000
          to_port: 22
  - name: machine2
    address: 10.0.2.102
    routes:
        - from_port: 443
          to_port: 443
        - from_port: 43001
          to_port: 22
{% endraw %}
```

Now we _"just"_ have to make a bunch of target groups:
```
{% raw %}
- name: Create website target group
  elb_target_group:
    name:              "{{ item.0.name + '-' + item.1.from_port|string }}"
    protocol:          'tcp'
    port:              "{{ item.1.from_port }}"
    vpc_id:            "{{ result_vpc.vpc.id }}"
    target_type:       'ip'
    targets:
      - Id:            "{{ item.0.address }}"
        Port:          "{{ item.1.to_port }}"
    state:             present
  loop: "{{ machines | subelements('routes') | list }}"
{% endraw %}
```

...and we _"just_" have to supply these as listeners to the load balancer:

```
{% raw %}
- name: Set listeners fact
  set_fact:
    listeners: >-
      {{ (listeners | default([])) + [{
        'Protocol':          'tcp',
        'Port':              item.1.from_port,
        'DefaultActions': {
          'Type':            'forward',
          'TargetGroupName': item.0.name + '-' + item.1.from_port|string
        }
      }] }}
  loop: "{{ machines | subelements('routes') | list }}"

- name: Create network load balancer
  elb_network_lb:
    state:                   'present'
    name:                    'locallb'
    subnets:                 "{{ result_public_subnet.subnet.id }}"
    listeners:               "{{ listeners }}"
  register: result_network_lb

{% endraw %}
```

# Jinja2 templating

This looks a bit crazy at first but the process isn't too bad once its broken
down:

```
machines:
  - name: machine1
    routes:
      - port: 1
      - port: 2
  - name: machine2
    routes:
      - port: 3
      - port: 4
```

to:

```
- 
  - name: machine1
    routes:
      - port: 1
      - port: 2
  - port: 1
-
  - name: machine1
    ...
  - port: 2
-
  - name: machine2
    ...
  - port: 3
...
```

So `item.0.name = machine1..machine2` and `item.1.port = 1..4`. Creating the `listeners` fact
uses a handy Ansible pattern where we can default an undefined value to an empty list (or dictionary):

```
{% raw %}
- set_fact:
    variable: >-
      {{ (variable | default([])) + [...] }}
  loop: " {{ ... }}"
{% endraw %}
```

so we can build up the list of listeners by iterating over the machines and ports.

# Does it work?

It does! We can construct a Virtual Private Cloud with a completely controlled private network in 
just over 30 seconds. If the machines are available as AMIs then the whole test process can be
completed in a matter of minutes and torn down afterwards.


