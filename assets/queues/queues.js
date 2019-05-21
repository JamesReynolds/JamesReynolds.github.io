// create svg element:
var svg = d3.select("#circle").append("svg").attr('viewBox', '0 0 900 240')

// Add the path using this helper function

stage_data = [{"x": 160, "label": "U"}, {"x": 480, "label": "S"}, {"x": 800, "label": "P"}]
queue_data = [{"x": 240, "y": 110}, {"x": 560, "y": 40}, {"x": 560, "y": 180}]
arrow_data = [
  [40, 130, 120, 130],
  [200, 130, 240, 130],
  [400, 130, 440, 130],
  [480 + 28.3, 130 - 28.3, 560, 60],
  [720, 60, 800 - 28.3, 130 - 28.3],
  [800 - 28.3, 130 + 28.3, 720, 200],
  [560, 200, 480 + 28.3, 130 + 28.3],
  [480, 170, 480, 230]
];
counter_data = [
  {"name" : "upload", "x": 380, "y": 130, "count": 0},
  {"name" : "staged", "x": 700, "y": 60, "count": 0},
  {"name" : "plugin", "x": 850, "y": 130, "count": 0},
  {"name" : "processed", "x": 700, "y": 200, "count": 0},
];
transition_source = [
];
inout_data = [
  {"name" : "user", "x" : 0, "y": 130},
  {"name" : "done", "x" : 480, "y" : 130}
];

function draw_diagram() {
    // Queues
    {
      let elem = svg.selectAll("g queue").data(queue_data);
      let elemEnter = elem.enter().append("g").attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });
      let rectangle = elemEnter.append("rect").attrs({"width" : 160, "height" : 40, "fill" : '#69a3b2', 'stroke': 'black'});
      for(let i = 0 ; i < 160 ; i += 20) {
        elemEnter.append("line").attrs(function (x) { return {"x1": i, "x2": i, "y1": 0, "y2": 40, "stroke": 'black'}; });
      }
    }
    
    // Arrows
    {
      svg.append("svg:defs").append("svg:marker")
        .attr("id", "triangle")
        .attr("refX", 10)
        .attr("refY", 5)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,0 L0,10 L10,5 z");
    
      let elem = svg.selectAll("g arrow").data(arrow_data).enter().append("line").attrs(function (d) {
        return {"x1": d[0], "y1": d[1], "x2": d[2], "y2": d[3], "stroke-width": 2, "stroke": "black", "marker-end": "url(#triangle)"};
      });
    }
    
    // Transitions
    {
      transitions = []
      transition_source.forEach(function (t) {
        transition = {}
        inout_data.concat(counter_data).forEach(function (c) {
          if (c['name'] == t[0]) {
            transition['x1'] = c['x'];
            transition['y1'] = c['y'];
          }
          if (c['name'] == t[1]) {
            transition['x2'] = c['x'];
            transition['y2'] = c['y'];
          }
        });
        transitions.push(transition);
      });
      let elem = svg.selectAll("g transitions").data(transitions).enter();
      let circle = elem.append("circle").attr("r", 30).attr('stroke', 'black').attr('fill', '#eea3b2').attrs(function (d) { return {'cx' : d.x1, 'cy' : d.y1};})
      let next = circle.style('opacity', 0.8).transition().duration(900).attrs(function (d) { return {'cx' : d.x2, 'cy' : d.y2};})
    }

    // Stages
    {
      let elem = svg.selectAll("g stage").data(stage_data);
      let elemEnter = elem.enter().append("g").attr("transform", function(d) { return "translate(" + d.x + ", 130)"; });
      let circle = elemEnter.append("circle").attr("r", 40).attr('stroke', 'black').attr('fill', '#69a3b2')
      let text = elemEnter.append("text").attrs({"dx" : -10, "dy" : 10}).text(function(d) { return d.label; }).style('font-size', '32px');
    }
    
    // Counters
    {
      let elem = svg.selectAll("g stage").data(counter_data);
      let elemEnter = elem.enter().append("g").attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });
      let circle = elemEnter.append("circle").attr("r", 30).attr('stroke', 'black').attr('fill', '#eea3b2')
      let text = elemEnter.append("text").attrs({"dx" : -10, "dy" : 10}).text(function(d) { return d.count; }).style('font-size', '32px');
    }
}

draw_diagram();
    
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
            },
            {
              div: 'chart3_div',
              chart: 'queues.times',
              type: 'line',
              options: { // these are google chart options
                title: 'Queue service time',
                curveType: 'function',
                vAxis: {minValue: 5, viewWindow: {min : 0}}
              }
            },
            {
              div: 'chart4_div',
              chart: 'queues.times',
              type: 'line',
              options: { // these are google chart options
                title: 'Queue service time',
                curveType: 'function',
                vAxis: {minValue: 5, viewWindow: {min : 0}}
              }
            }
          ];


stages = ["upload", "staged", "plugin", "processed", "complete"];
queues = stages.reduce((obj, x) => { obj[x] = 0; return obj; }, {});
counters = stages.reduce((obj, x) => { obj[x] = 0; return obj; }, {});

function counter_text(counters) {
  for(var key in counters) {
    d3.select('#' + key + '_counter').text(counters[key]);
  }
}

function advance(queues, counters) {
  transition_source = []

  // Items in staging /always/ move to plugin straight away
  queues["plugin"] += queues["staged"];
  counters["plugin"] += queues["staged"];
  if (queues["staged"] > 0) transition_source.push(["staged", "plugin"])
  queues["staged"] = 0;

  // If we're not staging anything, then stage some things
  if (queues["staged"] + queues["plugin"] + queues["processed"] == 0) {
    take = Math.min(5, queues["upload"]);
    if (take > 0) transition_source.push(["upload", "staged"])
    queues["staged"] += take;
    counters["staged"] += take;
    queues["upload"] -= take;
  }

  // If we've finished processing things, then we can output them
  counters["complete"] += queues["processed"]
  if (queues["processed"] > 0) transition_source.push(["processed", "done"])
  queues["processed"] = 0;

  // It takes a certain amount of time to process all items
  if (queues["plugin"] > 0 && Math.random() < 1 / (1 + queues["plugin"])) {
    queues["processed"] += queues["plugin"];
    counters["processed"] += queues["plugin"];
    queues["plugin"] = 0;
    transition_source.push(["plugin", "processed"])
  }

  // New arrivals
  input = Math.floor(Math.random() * 2);
  queues["upload"] += input;
  counters["upload"] += input;
  if (input > 0) transition_source.push(["user", "upload"])


  for(let i = 0 ; i < counter_data.length ; ++i) {
    for(var key in queues) {
      if (counter_data[i]['name'] == key) {
        counter_data[i]['count'] = queues[key];
      }
    }
  }
}

function addSeconds(date, value) {
  let result = new Date(date);
  result.setSeconds(result.getSeconds() + value);
  return result;
}

function cut(data) {
  if (data.length < 60) {
    let oldest = new Date();
    if (data.length > 1) oldest = Date(data[1]["c"][0]["v"]);
    let items = Array.from(Array(60 - data.length + 1).keys()).map(x => 
      fromArray(addSeconds(oldest, 0 - 60 + x),
        data[0].map(x => 0).splice(0, data[0].length - 3)));
    data.splice.apply(data, [1, 0].concat(items));
  }
  data.splice(1, 1);
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

function update_average(data, raw_data, alpha) {
  let date = cut(data);
  let last = stages.map(x => 0);
  let array = toArray(raw_data[raw_data.length - 1]);
  if (data.length >= 2) {
    last = toArray(data[data.length - 1]);
  }
  data.push(fromArray(date, Array.from(Array(array.length).keys()).map(x => last[x] * (1 - alpha) + alpha * array[x])));
  return data;
}

function bump_times(data, average_rates, average_lengths) {
  let date = cut(data);
  let rates = toArray(average_rates[average_rates.length - 1]);
  let lengths = toArray(average_lengths[average_lengths.length - 1]);
  data.push(fromArray(date, rates.map(function (x, i) { return lengths[i] / x; })));
}

function refreshCharts() {
  advance(queues, counters);
  counter_text(counters);
  bump_lengths(length_data);
  bump_counters(counters_data);
  bump_rates(rates_data, counters_data);
  update_average(average_rates_data, rates_data, 1 / 60.0);
  update_average(average_length_data, length_data, 1 / 60.0);
  bump_times(times_data, average_rates_data, average_length_data);
  update_average(fast_average_rates_data, rates_data, 0.5);
  update_average(fast_average_length_data, length_data, 0.5);
  bump_times(fast_times_data, fast_average_rates_data, fast_average_length_data);
  mycharts[0].gchart.draw(google.visualization.arrayToDataTable(length_data), mycharts[0].options);
  mycharts[1].gchart.draw(google.visualization.arrayToDataTable(rates_data), mycharts[1].options);
  mycharts[2].gchart.draw(google.visualization.arrayToDataTable(fast_times_data), mycharts[2].options);
  mycharts[3].gchart.draw(google.visualization.arrayToDataTable(times_data), mycharts[3].options);
  draw_diagram();
}


length_data = [labels().splice(0, stages.length + 2)];
counters_data = [labels()];
rates_data = [labels()];

average_rates_data = [labels()];
average_length_data = [labels()];
times_data = [labels()];
fast_average_rates_data = [labels()];
fast_average_length_data = [labels()];
fast_times_data = [labels()];

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
        }, 1000);
      }
