/*!
 * queues
 * Example of a simple queueing system using d3 and google charts
 * MIT Licensed
 */

'use strict';

// SVG element
var svg = d3.select('#circle').append('svg').attr('viewBox', '0 0 900 240');

// Placement and text of the stages
var stageData = [{ 'x': 160, 'label': 'U' }, { 'x': 480, 'label': 'S' }, { 'x': 800, 'label': 'P' }];

// Placement of the queues
var queueData = [{ 'x': 240, 'y': 110 }, { 'x': 560, 'y': 40 }, { 'x': 560, 'y': 180 }];

// Placement of the arrows (x1, y1, x2, y2)
var arrowData = [
  [40, 130, 120, 130],
  [200, 130, 240, 130],
  [400, 130, 440, 130],
  [480 + 28.3, 130 - 28.3, 560, 60],
  [720, 60, 800 - 28.3, 130 - 28.3],
  [800 - 28.3, 130 + 28.3, 720, 200],
  [560, 200, 480 + 28.3, 130 + 28.3],
  [480, 170, 480, 230]
];

// Placement of the counters and the queues that they reference
var counterData = [
  { 'name': 'upload', 'x': 380, 'y': 130, 'count': 0 },
  { 'name': 'staged', 'x': 700, 'y': 60, 'count': 0 },
  { 'name': 'plugin', 'x': 850, 'y': 130, 'count': 0 },
  { 'name': 'processed', 'x': 700, 'y': 200, 'count': 0 }
];

// In and out "counters" that can be used for transitions
var inoutData = [
  { 'name': 'user', 'x': 0, 'y': 130 },
  { 'name': 'done', 'x': 480, 'y': 130 }
];

// Any transitions to run as [from, to] pairs of counter or inout
var transitionSource = [
];

/*!
 * Draw the queues
 */
function drawQueues () {
  let elem = svg.selectAll('g queue')
    .data(queueData)
    .enter()
    .append('g')
    .attr('transform', function (d) { return 'translate(' + d.x + ', ' + d.y + ')'; });
  elem
    .append('rect')
    .attrs({ 'width': 160, 'height': 40, 'fill': '#69a3b2', 'stroke': 'black' });
  for (let i = 0; i < 160; i += 20) {
    elem
      .append('line')
      .attrs(function (x) { return { 'x1': i, 'x2': i, 'y1': 0, 'y2': 40, 'stroke': 'black' }; });
  }
}

/*!
 * Draw the arrows
 */
function drawArrows () {
  svg.append('svg:defs').append('svg:marker')
    .attr('id', 'triangle')
    .attr('refX', 10)
    .attr('refY', 5)
    .attr('markerWidth', 10)
    .attr('markerHeight', 10)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,0 L0,10 L10,5 z');
  svg.selectAll('g arrow').data(arrowData)
    .enter()
    .append('line')
    .attrs({ 'stroke-width': 2, 'stroke': 'black', 'marker-end': 'url(#triangle)' })
    .attrs(function (d) {
      return { 'x1': d[0], 'y1': d[1], 'x2': d[2], 'y2': d[3] };
    });
}

/*!
 * Draw transitions of items moving between counters
 */
function drawTransitions () {
  let transitions = [];
  transitionSource.forEach(function (t) {
    let transition = {};
    inoutData.concat(counterData).forEach(function (c) {
      if (c['name'] === t[0]) {
        transition['x1'] = c['x'];
        transition['y1'] = c['y'];
      }
      if (c['name'] === t[1]) {
        transition['x2'] = c['x'];
        transition['y2'] = c['y'];
      }
    });
    transitions.push(transition);
  });
  svg.selectAll('g transitions')
    .data(transitions)
    .enter()
    .append('circle')
    .attrs({ 'r': 30, 'stroke': 'black', 'fill': '#eea3b2' })
    .attrs(function (d) { return { 'cx': d.x1, 'cy': d.y1 }; })
    .style('opacity', 0.8)
    .transition()
    .duration(900)
    .attrs(function (d) { return { 'cx': d.x2, 'cy': d.y2 }; });
}

/*!
 * Draw the stage markers
 */
function drawStages () {
  let elem = svg.selectAll('g stage')
    .data(stageData)
    .enter()
    .append('g')
    .attr('transform', function (d) { return 'translate(' + d.x + ', 130)'; });
  elem
    .append('circle')
    .attrs({ 'r': 40, 'stroke': 'black', 'fill': '#69a3b2' });
  elem
    .append('text')
    .attrs({ 'dx': 0, 'dy': 10 })
    .style('text-anchor', 'middle')
    .text(function (d) { return d.label; })
    .style('font-size', '32px');
}

/*!
 * Draw the counters
 */
function drawCounters () {
  let elem = svg.selectAll('g stage')
    .data(counterData)
    .enter()
    .append('g')
    .attr('transform', function (d) { return 'translate(' + d.x + ', ' + d.y + ')'; });
  elem
    .append('circle')
    .attrs({ 'r': 30, 'stroke': 'black', 'fill': '#eea3b2' });
  elem
    .append('text')
    .attrs({ 'dx': 0, 'dy': 10 })
    .style('text-anchor', 'middle')
    .text(function (d) { return d.count; })
    .style('font-size', '32px');
}

/*!
 * Draw/update the diagram
 */
function drawDiagram () {
  drawQueues();
  drawArrows();
  drawTransitions();
  drawStages();
  drawCounters();
}

drawDiagram();

// The stages that an item proceeds through
var stages = ['upload', 'staged', 'plugin', 'processed', 'complete'];

// The queues ({ name : 0 })
var queues = stages.reduce((obj, x) => { obj[x] = 0; return obj; }, {});

// The counters ({ name : 0 })
var counters = stages.reduce((obj, x) => { obj[x] = 0; return obj; }, {});

/*!
 * Update the counter text with a new counter value
 */
function counterText (counters) {
  for (var key in counters) {
    d3.select('#' + key + '_counter').text(counters[key]);
  }
}

/*!
 * Advance the queues and counters one time increment
 */
function advance (queues, counters) {
  // No transitions at the moment
  transitionSource = [];

  // Items in staging /always/ move to plugin straight away
  queues['plugin'] += queues['staged'];
  counters['plugin'] += queues['staged'];
  if (queues['staged'] > 0) transitionSource.push(['staged', 'plugin']);
  queues['staged'] = 0;

  // If we're not staging anything, then stage some things
  if (queues['staged'] + queues['plugin'] + queues['processed'] === 0) {
    let take = Math.min(5, queues['upload']);
    if (take > 0) transitionSource.push(['upload', 'staged']);
    queues['staged'] += take;
    counters['staged'] += take;
    queues['upload'] -= take;
  }

  // If we've finished processing things, then we can output them
  counters['complete'] += queues['processed'];
  if (queues['processed'] > 0) transitionSource.push(['processed', 'done']);
  queues['processed'] = 0;

  // It takes a certain amount of time to process all items
  if (queues['plugin'] > 0 && Math.random() < 1 / (1 + queues['plugin'])) {
    queues['processed'] += queues['plugin'];
    counters['processed'] += queues['plugin'];
    queues['plugin'] = 0;
    transitionSource.push(['plugin', 'processed']);
  }

  // New arrivals
  let input = Math.floor(Math.random() * 2);
  queues['upload'] += input;
  counters['upload'] += input;
  if (input > 0) transitionSource.push(['user', 'upload']);

  // Update the counts on the diagram
  for (let i = 0; i < counterData.length; ++i) {
    for (var key in queues) {
      if (counterData[i]['name'] === key) {
        counterData[i]['count'] = queues[key];
      }
    }
  }
}

/*!
 * Return a date with the number of seconds added to it
 */
function addSeconds (date, value) {
  let result = new Date(date);
  result.setSeconds(result.getSeconds() + value);
  return result;
}

/*!
 * Adjust a chart array to remove the oldest and return the
 * date to be used for the newest
 */
function cut (data) {
  if (data.length < 60) {
    let oldest = new Date();
    if (data.length > 1) oldest = Date(data[1]['c'][0]['v']);
    let items = Array.from(Array(60 - data.length + 1).keys()).map(x =>
      fromArray(addSeconds(oldest, 0 - 60 + x),
        data[0].map(x => 0).splice(0, data[0].length - 3)));
    data.splice.apply(data, [1, 0].concat(items));
  }
  data.splice(1, 1);
  return new Date();
}

/*!
 * Convert a simple array of values to an array for google chart
 */
function fromArray (date, data) {
  let result = Array.concat([date, null, null], data);
  return { 'c': result.map(x => { return { 'v': x }; }) };
}

/*!
 * Convert a google chart value to an array
 */
function toArray (data) {
  let result = data['c'].map(x => x['v']);
  result.splice(0, 3);
  return result;
}

// Add queue lengths to the data
function bumpLengths (data) {
  let date = cut(data);
  data.push(fromArray(date, Object.values(queues).splice(0, stages.length - 1)));
  return data;
}

// Add counters to the data
function bumpCounters (data) {
  let date = cut(data);
  data.push(fromArray(date, Object.values(counters)));
}

// Calculate and add rates to the data
function bumpRates (data, counters) {
  let date = cut(data);
  let end = counters.length;
  if (end > 2) {
    let array = [counters[end - 2], counters[end - 1]].map(toArray);
    data.push(fromArray(date, Array.from(Array(array[0].length).keys()).map(x => array[1][x] - array[0][x])));
  } else {
    data.push(fromArray(date, stages.map(s => 0)));
  }
}

// Create labels for a new graph
function labels () {
  return Array.concat([
    { 'label': 'time', 'type': 'datetime' },
    { 'label': '', 'type': 'string', 'p': { 'role': 'annotation' } },
    { 'label': '', 'type': 'string', 'p': { 'role': 'annotationText' } }],
  stages.map(x => { return { 'label': x, 'type': 'number' }; }));
}

/*!
 * Update an average by smoothing with an alpha value
 */
function updateAverage (data, rawData, alpha) {
  let date = cut(data);
  let last = stages.map(x => 0);
  let array = toArray(rawData[rawData.length - 1]);
  if (data.length >= 2) {
    last = toArray(data[data.length - 1]);
  }
  data.push(fromArray(date, Array.from(Array(array.length).keys()).map(x => last[x] * (1 - alpha) + alpha * array[x])));
  return data;
}

/*!
 * Update a time value by adding a new calculated time
 */
function bumpTimes (data, averageRates, averageLengths) {
  let date = cut(data);
  let rates = toArray(averageRates[averageRates.length - 1]);
  let lengths = toArray(averageLengths[averageLengths.length - 1]);
  data.push(fromArray(date, rates.map(function (x, i) { return lengths[i] / x; })));
}

// Simple data
var lengthData = [labels().splice(0, stages.length + 2)];
var countersData = [labels()];
var ratesData = [labels()];

// Average calculations
var averageRatesData = [labels()];
var averageLengthData = [labels()];
var timesData = [labels()];
var fastAverageRatesData = [labels()];
var fastAverageLengthData = [labels()];
var fastTimesData = [labels()];

// Charts
var charts = [
  {
    div: 'chart1_div',
    chart: 'queues.length',
    type: 'stacked',
    options: { // these are google chart options
      title: 'Queue lengths',
      vAxis: { minValue: 5 }
    }
  },
  {
    div: 'chart2_div',
    chart: 'queues.rates',
    type: 'line',
    options: { // these are google chart options
      title: 'Queue rates',
      curveType: 'function',
      vAxis: { minValue: 5, viewWindow: { min: 0 } }
    }
  },
  {
    div: 'chart3_div',
    chart: 'queues.times',
    type: 'line',
    options: { // these are google chart options
      title: 'Queue service time',
      curveType: 'function',
      vAxis: { minValue: 5, viewWindow: { min: 0 } }
    }
  },
  {
    div: 'chart4_div',
    chart: 'queues.times',
    type: 'line',
    options: { // these are google chart options
      title: 'Queue service time',
      curveType: 'function',
      vAxis: { minValue: 5, viewWindow: { min: 0 } }
    }
  }
];

function refreshCharts () {
  advance(queues, counters);
  counterText(counters);
  bumpLengths(lengthData);
  bumpCounters(countersData);
  bumpRates(ratesData, countersData);
  updateAverage(averageRatesData, ratesData, 1 / 60.0);
  updateAverage(averageLengthData, lengthData, 1 / 60.0);
  bumpTimes(timesData, averageRatesData, averageLengthData);
  updateAverage(fastAverageRatesData, ratesData, 0.5);
  updateAverage(fastAverageLengthData, lengthData, 0.5);
  bumpTimes(fastTimesData, fastAverageRatesData, fastAverageLengthData);
  charts[0].gchart.draw(google.visualization.arrayToDataTable(lengthData), charts[0].options);
  charts[1].gchart.draw(google.visualization.arrayToDataTable(ratesData), charts[1].options);
  charts[2].gchart.draw(google.visualization.arrayToDataTable(fastTimesData), charts[2].options);
  charts[3].gchart.draw(google.visualization.arrayToDataTable(timesData), charts[3].options);
  drawDiagram();
}

function drawCharts () {
  // initialize the google charts
  for (var len = 0; len < charts.length; ++len) {
    switch (charts[len].type) {
      case 'stacked':
        charts[len].options.isStacked = 'absolute';
        // no break here - render it as area chart
        // eslint-disable-next-line no-fallthrough
      case 'area':
        charts[len].gchart = new google.visualization.AreaChart(document.getElementById(charts[len].div));
        break;
      default:
        charts[len].gchart = new google.visualization.LineChart(document.getElementById(charts[len].div));
        break;
    }
  }

  setInterval(function () {
    refreshCharts();
  }, 1000);
}

google.charts.load('current', { 'packages': ['corechart'] });
google.charts.setOnLoadCallback(drawCharts);
