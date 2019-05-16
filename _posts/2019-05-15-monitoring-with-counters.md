---
layout:     post
title:      "Monitoring with counters"
date:       2019-05-15 07:30:30 +0100
categories: devops
published:  false
---

<script type="text/javascript" src="https://d3js.org/d3.v4.min.js"></script>
<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<style>
div.chart {
  float:left;
  height: 250px;
}

div.full {
  width: 100%;
}

div.half {
  width: 50%;
}
</style>

Text above

<div id="circle" style="border: 1px solid black; display: block; height: 200px; width: 100%;"></div>
<div id="chart1_div" class="chart full"></div>
<div id="chart2_div" class="chart full"></div>
<div id="chart3_div" class="chart full"></div>
   
<script>

// create svg element:
var svg = d3.select("#circle").append("svg").attr("width", 200).attr("height", 200)

// Add the path using this helper function
svg.append('circle')
  .attr('cx', 100)
  .attr('cy', 100)
  .attr('r', 50)
  .attr('stroke', 'black')
  .attr('fill', '#69a3b2');

svg.append('rect')
  .attr('x', 10)
  .attr('y', 120)
  .attr('width', 600)
  .attr('height', 40)
  .attr('stroke', 'black')
  .attr('fill', '#69a3b2');

</script>

<script>
      google.charts.load('current', {'packages':['corechart']});
      google.charts.setOnLoadCallback(drawChart);

      function drawChart() {
        
        // define all the charts you need
          var mycharts = [
            {
              div: 'chart1_div',
              chart: 'queues.length',
              type: 'stacked',
              options: { // these are google chart options
                title: 'Queue lengths',
                vAxis: {minValue: 5}
              }
            },
            {
              div: 'chart2_div',
              chart: 'queues.rates',
              type: 'line',
              options: { // these are google chart options
                title: 'Queue rates',
                curveType: 'function',
                vAxis: {minValue: 5, viewWindow: {min : 0}}
              }
            }
          ];


stages = ["upload", "staged", "plugin", "processed", "complete"];
queues = stages.reduce((obj, x) => { obj[x] = 0; return obj; }, {});
counters = stages.reduce((obj, x) => { obj[x] = 0; return obj; }, {});

function advance(queues, counters) {
  // New arrivals
  input = Math.floor(Math.random() * 2);
  queues["upload"] += input;
  counters["upload"] += input;

  // Items in staging /always/ move to plugin straight away
  queues["plugin"] += queues["staged"];
  counters["plugin"] += queues["staged"];
  queues["staged"] = 0;

  // If we're not staging anything, then stage some things
  if (queues["staged"] + queues["plugin"] + queues["processed"] == 0) {
    queues["staged"] += queues["upload"];
    counters["staged"] += queues["upload"];
    queues["upload"] = 0;
  }

  // If we've finished processing things, then we can output them
  counters["complete"] += queues["processed"]
  queues["processed"] = 0;

  // It takes a certain amount of time to process all items
  if (queues["plugin"] > 0 && Math.random() < 0.5 / queues["plugin"]) {
    queues["processed"] += queues["plugin"];
    counters["processed"] += queues["plugin"];
    queues["plugin"] = 0;
  }
}

function cut(data) {
  if (data.length > 60) data.splice(1, 1);
  return new Date();
}

function fromArray(date, data) {
  let result = Array.concat([date, null, null], data);
  return {"c": result.map(x => {return {"v": x};})};
}

function toArray(data) {
  let result = data["c"].map(x => x["v"]);
  result.splice(0, 3);
  return result;
}

function bump_lengths(data) {
  let date = cut(data);
  data.push(fromArray(date, Object.values(queues).splice(0, stages.length - 1)));
  return data;
}

function bump_counters(data) {
  let date = cut(data);
  data.push(fromArray(date, Object.values(counters)));
}

function bump_rates(data, counters) {
  let date = cut(data);
  let end = counters.length;
  if (end > 2) {
    let array = [counters[end - 2], counters[end - 1]].map(toArray);
    data.push(fromArray(date, Array.from(Array(array[0].length).keys()).map(x => array[1][x] - array[0][x])));
  } else {
    data.push(fromArray(date, stages.map(s => 0)));
  }
}

function labels() {
  return Array.concat([{"label":"time","type":"datetime"},
          {"label":"","type":"string","p":{"role":"annotation"}},
          {"label":"","type":"string","p":{"role":"annotationText"}}],
         stages.map(x => {return {"label": x, "type": "number"};}));
}

function refreshCharts() {
  advance(queues, counters);
  bump_lengths(length_data);
  bump_counters(counters_data);
  bump_rates(rates_data, counters_data);
  mycharts[0].gchart.draw(google.visualization.arrayToDataTable(length_data), mycharts[0].options);
  mycharts[1].gchart.draw(google.visualization.arrayToDataTable(rates_data), mycharts[1].options);
}

length_data = [labels().splice(0, stages.length + 2)];
counters_data = [labels()];
rates_data = [labels()];

        // initialize the google charts
        var len = mycharts.length;
        while(len--) {
          
          switch(mycharts[len].type) {
            case 'stacked':
              mycharts[len].options.isStacked = 'absolute';
              // no break here - render it as area chart
            case 'area':
              mycharts[len].gchart = new google.visualization.AreaChart(document.getElementById(mycharts[len].div));
              break;
            default:
              mycharts[len].gchart = new google.visualization.LineChart(document.getElementById(mycharts[len].div));
              break;
          }
        }
        
        setInterval(function() {
          refreshCharts();
        }, 500);
      }
</script>
Text below
