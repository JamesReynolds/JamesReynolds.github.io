---
layout:     post
title:      "Integration testing with docker-compose"
date:       2019-04-07 17:30:30 +0100
categories: linux windows
published:  true
---

As part of a recent pet project I wanted to test an abstraction running over
the top of RabbitMQ. 

# API

The API of the abstraction is pretty simple:

~~~
spec = TaskQueue('exchange', 'queue', host='rabbitmq')
with spec.open() as queue:
    queue.send('ping')
    for key, item in queue.recv(timeout=100):
        logger.info(item)
        queue.ack()
~~~
{: .language-python}

# Integration Testing

The tests for this are quite simple (to start with):

![RPC Example](/assets/rpc.png)

In my case the server is a simple echo server and the client just checks the responses.

In order to run this though... I needed a rabbitmq instance, step up docker-compose!

# Docker-compose

The docker compose file is pretty simple to start with:

~~~
version: "3"

services:

  rabbitmq:
    image: rabbitmq:3-management
    expose:
      - 5672

  task_queue_test:
    build:
      dockerfile: tests/task_queue/Dockerfile
      context: ../../
    depends_on:
      - rabbitmq
    links:
      - rabbitmq
~~~
{: language-yaml}

The fires up the container and runs the tests. In fact, there is a perfect switch to test this all out:

~~~
docker-compose up --abort-on-container-exit
task_queue_test_1  | ============================= test session starts ==============================
task_queue_test_1  | platform linux -- Python 3.6.8, pytest-4.4.0, py-1.8.0, pluggy-0.9.0
task_queue_test_1  | rootdir: /code
task_queue_test_1  | plugins: repeat-0.8.0
task_queue_test_1  | collected 10 items
task_queue_test_1  | 
rabbitmq_1         | 2019-04-12 14:54:11.757 [info] <0.282.0> 
rabbitmq_1         |  Starting RabbitMQ 3.7.14 on Erlang 21.3.3
....
task_queue_test_1  | code/test_task_queue.py ..........                                       [100%]
task_queue_test_1  | 
task_queue_test_1  | -------------- generated xml file: /results/task_queue_junit.xml ---------------
task_queue_test_1  | ========================== 10 passed in 5.53 seconds ===========================
taskqueue_task_queue_test_1 exited with code 0
Aborting on container exit...
Stopping taskqueue_rabbitmq_1 ... done
Stopping taskqueue_access_1   ... done
~~~

# Getting stuff out

Unfortunately.... it becomes tricky to extract the test results as the container exits. I found
a neat trick to avoid this:

1. Create a permanent "access" service
2. Wait for container exit
3. Pull the results out using "access"

~~~
    ...
    volumes:
      - .:/results

  access:
    image: python:3.6-alpine
    command: tail -f /dev/null
    volumes:
      - .:/results
~~~
{: .language-yaml}

In _theory_ it would be possible to just map that volume locally (as it appears). However... in some
CI systems (e.g. Circle-CI) this isn't possible... so another trick is needed.

# Circle-CI

In Circle-CI the access container is used to pull the results out, and `docker-compose exec`
is used to continually test the running test container. Once the running test is done, the
results are collected using `cat` to the local folder:

~~~
- run:
  name: Run task_queue integration tests
  command: |
    docker-compose build
    docker-compose up -d
    while docker-compose exec test_task_queue true; do true; done
    docker-compose exec access cat /results/test_task_queue_juint.xml > results.xml
~~~
{: .language-yaml}

Perfect! Test results on Circle-CI _and_ they don't require use of a machine, which means the builds
are faster as there are more containers available than there are machine:

![Successful build](/assets/circleci.jpg)
