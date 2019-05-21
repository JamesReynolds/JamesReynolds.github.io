---
layout:     post
title:      "Monitoring with counters"
date:       2019-05-15 07:30:30 +0100
categories: devops/monitoring
published:  false
---

<script type="text/javascript" src="https://d3js.org/d3.v4.min.js"></script>
<script type="text/javascript" src="https://d3js.org/d3-selection-multi.v1.min.js"></script>
<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<style>
div.chart {
  float:left;
  height: 250px;
  display: block;
}
div.full {
  width: 100%;
}
div.diagram {
  border: 1px solid black;
  display: block;
  width: 100%;
}
</style>

Creating a Netdata monitor for a queueing system using a simple API that returns counts of events.

## A simple packaging system

Recently we've had a number of issues with Nexus' support of RPM repositories:

* There is no progress report for generating metadata
* The RPM is uploaded/deleted prior to metadata generation - so the repository is often inconsistent to its metadata
* Broken RPMs can stall the metadata process until they are removed
* Metadata generation is inconsistent
* Metadata generation is slow

In Nexus' defence we are building a lot of RPMs so the read/write ratio is very
different to more common use cases. Additionally, all of these problems are in
fact bugged and so will perhaps be solved in time.

However, these problems stem from Nexus using a reimplementation of the RPM createrepo
tools and that Nexus does not have a staging area. So we looked at implementing a 
component store that:

* Used a staging area to ensure clean updates
* Use the native packaging tools (`createrepo`, `pep381run`...)
* Can be monitored easily

### Our solution

* Docker containers to separate services and allow minimal "plugins" (for `createrepo` and friends)
* Monitoring via NetData
* File serving using NGINX
* Messaging using RabbitMQ

This creates a system with the following components: 

<div id="circle" class="diagram"></div>
<p/>

* **U**pload watcher - watches the NGINX upload folder for new RPMs
* **S**tager - swaps between two staging areas, so download section is always consistent
* **P**lugin - runs the `createrepo` tool

## Keeping things stateless with counters

We needed to measure the amount of time the `createrepo` tool is taking to construct
the metadata and the amount of time RPMs sit in the upload queue. However... currently
(aside from the filestore) the containers store no state, and we very much like it this way!

The solution we arrived at is to keep track of the arrival rates of RPMs into the queues:
<table>
  <tr><th>Counter</th><th>Value</th></tr>
  <tr><td>Uploaded</td><td id="upload_counter">0</td></tr>
  <tr><td>Staged</td><td id="staged_counter">0</td></tr>
  <tr><td>Plugin</td><td id="plugin_counter">0</td></tr>
  <tr><td>Processed</td><td id="processed_counter">0</td></tr>
  <tr><td>Complete</td><td id="complete_counter">0</td></tr>
</table>

This is done by creating a new queue called `events` that receives messages from any
of the stages when they change state. A simple service then keeps a count of all of
these events and is the *only* extra state in the system - and all in one place!

Queue lengths are simply the difference between these counters, so we can chart
that over time:
<div id="chart1_div" class="chart full"></div>

In our system this is output through a Netdata dashboard, but this blog is using GoogleChart
for examples.

## What can we calculate?

The next thing to calculate is the rate at which items are entering each queue. Netdata
has a rather handy `incremental` graph style, so we can do this with no modifications. In
this example though we have to keep the previous state of the counters so we can find the
change per second:

<div id="chart2_div" class="chart full"></div>

OK, easy enough - but what about serving time?

## Little's theorem

The time taken to serve a request is given by Little's theorem. There are a host of examples
of this to be found - but the long and the short of the thing is this simple formula:

```
L = λ W   or   Length = Arrival Rate * Work time
```

The problem is that these values are _average_ values over a window of time. If we just take
the last two values we get a graph with _really_ extreme values. No good to anyone:

<div id="chart3_div" class="chart full"></div>

### Exponential Smoothing

Exponential smoothing is a technique to calculate a moving average for a dataset without the
need to store multiple values. It has the advantage of being _really_ simple:

```
sᵢ = α xᵢ + (1 - α) xᵢ₋₁
```

There is a fair bit of hand waving to be done to get a good value for `α` but a reasonable
rule of thumb we've found is that `1 / T` where `T` is the amount of time under consideration
is reasonable. So we're using `1 / 60` - meaning that after a minute we should be at 63% of
the "real" signal.

The _really_ nice part here though is we're using _two_ smoothed values to calculate a result,
so the smoothing cancels out in the first order term.

<div id="chart4_div" class="chart full"></div>

## Putting this into netdata

This example is available on [github](https://github.com/JamesReynolds/queues). A new chart
is added by simply pushing the files to the correct places in netdata installation and
ensuring netdata has access:

```
FROM netdata/netdata

## Add information to netdata
COPY queue.chart.py /usr/libexec/netdata/python.d/
COPY queue.conf /usr/lib/netdata/conf.d/python.d/

## Ensure that ownership and python modules are present
RUN chown root:netdata \
        /usr/lib/netdata/conf.d/python.d/queue.conf \
        /usr/libexec/netdata/python.d/queue.chart.py \
        /usr/libexec/netdata/plugins.d/python.d.plugin
```

...and _that_ is it:

<img src="/assets/queues/queues.png"/>

### Troubleshooting

Netdata, as much as I enjoy using it, does have a tedency to not show graphs for a variety
of reasons and leave you wondering why you can't see them.

1. Service timeout
   Use `autodetection_retry: 60` (retry after one minute) and/or
   `timeout: 60` (wait this long for the URL to come back)
2. Zero values
   If you can, make sure incremental values are not zero, even by chance. Netdata seems
   to take this as an error condition.

## This Javascript code

<a href="/assets/queues/queues.js">The Javascript code</a> for this page is not minified so you
can browse how the graphs are put together.

<script type="text/javascript" src="/assets/queues/queues.js"></script>
