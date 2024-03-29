var dateMap = [];
var dateNames = [];

d3.selectAll("h1").style("color", "black");

d3.json("sentimentParsed.json", function(data) {

    var dataSortedByDate = data.sort(function(a, b) {
        for (var i = 0; i < 3; i++) {
            if (a.DateArray[i] > b.DateArray[i]) {
                return 1;
            }
            if (a.DateArray[i] < b.DateArray[i]) {
                return -1;
            }
        }
        return 0;
    });

    // var dateMap = [];
    // var dateNames = [];

    for (var i = 0; i < dataSortedByDate.length; i++) {
        var tempArray = dataSortedByDate[i].DateArray;
        var dateString = tempArray[0] + "-" + tempArray[1] + "-" + tempArray[2];
        if(tempArray[0] >= 2016) {
          if (dateString in dateMap) {
              // First, check to make sure the responses actually have a count, and aren't undefined.
              // If they are, insert at the back.
              if (isNaN(dataSortedByDate[i].Data.Responses)) {
                  dataSortedByDate[i].Data["Responses"] = 0;
              }

              // Traverse array, inserting where the response count is lower in the next element.
              var inserted = false;
              for (var j = 0; j < dateMap[dateString].length; j++) {
                  if (dataSortedByDate[i].Data.Responses > dateMap[dateString][j].Data.Responses || isNaN(dateMap[dateString][j].Data.Responses)) {
                      dateMap[dateString].splice(j, 0, dataSortedByDate[i]);
                      inserted = true;
                      break;
                  }
              }

              // If not inserted earlier, push now.
              if (!inserted) {
                  dateMap[dateString].push(dataSortedByDate[i]);
              }

          } else {
              dateNames.push(dateString);
              dateMap[dateString] = [];
              dateMap[dateString].push(dataSortedByDate[i]);
          }
        }
    }
    // create arrays that will hold data for the graphs
    var linechart = [];
    var pieChart = [];

    var colors = ['purple', 'blue', 'pink', 'gray', 'brown'];

    var hashtags = [];
    var tagCounts = [];
    // push one plot point for each separate date
    for (var i = 0; i < dateNames.length; i++) {
        var entries = dateMap[dateNames[i]];
        var totalSentimentScore = 0;
        var averageSentimentScore = 0;
        var topPostArray = [];
        var topCountArray = [];
        var topSentiments = [];

        var localEntities = [];

        for (var j = 0; j < entries.length; j++) {
            totalSentimentScore = totalSentimentScore + entries[j].DocSentiment.Score;
            if(j < 3) {
              topPostArray.push(entries[j].Data.Text);
              topCountArray.push(entries[j].Data.Responses);
              topSentiments.push(entries[j].DocSentiment.Type);
            }

            localEntities = entries[j].Entities;
            for(var k = 0; k < localEntities.length; k++) {
              if(localEntities[k].Type == "Hashtag") {
                var index = hashtags.indexOf(localEntities[k].Text.toLowerCase());
                if(index > -1) {
                  tagCounts[index] += 1;
                } else {
                  hashtags.push(localEntities[k].Text.toLowerCase());
                  tagCounts.push(1);
                }
              }
            }
        }
        averageSentimentScore = totalSentimentScore / entries.length;
        var newVal = Math.round(averageSentimentScore*100)/100;
        var newType = "";

        if(newVal > 0) {
          newType += "Positive";
        } else if (newVal < 0) {
          newType += "Negative";
        } else {
          newType += "Neutral"
        }
        linechart.push({
            date: dateNames[i],
            value: newVal,
            topPosts: topPostArray,
            counts: topCountArray,
            type: newType,
            sentiments: topSentiments
        });
    }

    var slotTags = [];
    var slotCounts = [];

    while(slotTags.length < 5) {
      var maximum = Math.max.apply(Math, tagCounts);
      var index = tagCounts.indexOf(maximum);
      if(hashtags[index] != "#nyu") {
        slotTags.push(hashtags[index]);
        slotCounts.push(tagCounts[index]);
      }
      tagCounts[index] = 0;
    }

    var total = 0;
    var tagLine = "";
    var minorityTotal = 0;

    for(var i = 0; i < slotTags.length; i++) {
      total += slotCounts[i];
      if(i > 0) {
        minorityTotal += slotCounts[i];
      }
      tagLine += slotTags[i] + ", ";
    }

    for(var i = 0; i < slotTags.length; i++) {
      var amount = (1 / total) * slotCounts[i];
      var descripString = "";

      if(amount > 0.4) {
        descripString += slotTags[i] + " appeared " + slotCounts[i] + " times total. A staggering amount! We had to filter out #nyu, as it accounted for over 90% of reported tags.";
      } else {
        descripString += tagLine + " were the other featured hashtags, appearing " + minorityTotal + " times in total. This percentage represents a staggeringly large gap between the first place #nyc and second place " + slotTags[i] + ".";
      }

      pieChart.push({
        color: colors[i],
        description: descripString,
        title: slotTags[i],
        value: amount
      });
    }


    // add arrays to data object to populate graphs
    var data = {};
    data["linechart"] = linechart;
    data["pieChart"] = pieChart;

    var DURATION = 1500;
    var DELAY = 500;
    var XCOOR = 0;
    /**
     * draw the fancy line chart
     *
     * @param {String} elementId elementId
     * @param {Array}  data      data
     */
    function drawLineChart(elementId, data) {
        // parse helper functions on top
        var parse = d3.time.format('%Y-%m-%d').parse;
        var outputInfo = d3.time.format('%x');
        // data manipulation first
        data = data.map(function(datum) {
            datum.date = parse(datum.date);
            return datum;
        });

        // TODO code duplication check how you can avoid that
        var containerEl = document.getElementById(elementId),
            width = containerEl.clientWidth,
            height = width * 0.4,
            margin = {
                top: 30,
                right: 10,
                left: 10
            },

            detailWidth = 98,
            detailHeight = 55,
            detailMargin = 10,

            container = d3.select(containerEl),
            svg = container.select('svg')
            .attr('width', width)
            .attr('height', height + margin.top),

            x = d3.time.scale().range([0, width - detailWidth]),
            xAxis = d3.svg.axis().scale(x)
            .ticks(8)
            .tickSize(-height),
            xAxisTicks = d3.svg.axis().scale(x)
            .ticks(d3.time.month, 4)
            .tickSize(-height)
            .tickFormat(''),
            y = d3.scale.linear().range([height, 0]),
            yAxisTicks = d3.svg.axis().scale(y)
            .ticks(12)
            .tickSize(width)
            .tickFormat('')
            .orient('right'),

            area = d3.svg.area()
            .interpolate('linear')
            .x(function(d) {
                return x(d.date) + detailWidth / 2;
            })
            .y0(height)
            .y1(function(d) {
                return y(d.value);
            }),
            line = d3.svg.line()
            .interpolate('linear')
            .x(function(d) {
                return x(d.date) + detailWidth / 2;
            })
            .y(function(d) {
                return y(d.value);
            }),

            startData = data.map(function(datum) {
                return {
                    date: datum.date,
                    value: 0
                };
            }),

            circleContainer;

        // Compute the minimum and maximum date, and the maximum price.
        x.domain([data[0].date, data[data.length - 1].date]);
        // hacky hacky hacky :(
        // y.domain([0, d3.max(data, function(d) {
        //     return d.value;
        // }) + 700]);
        y.domain([-1.0, 1.0]);


        svg.append('g')
            .attr('class', 'lineChart--xAxisTicks')
            .attr('transform', 'translate(' + detailWidth / 2 + ',' + height + ')')
            .call(xAxisTicks);

        svg.append('g')
            .attr('class', 'lineChart--xAxis')
            .attr('transform', 'translate(' + detailWidth / 2 + ',' + (height + 7) + ')')
            .call(xAxis);

        svg.append('g')
            .attr('class', 'lineChart--yAxisTicks')
            .call(yAxisTicks);

        // Add the line path.
        svg.append('path')
            .datum(startData)
            .attr('class', 'lineChart--areaLine')
            .attr('d', line)
            .transition()
            .duration(DURATION)
            .delay(DURATION / 2)
            .attrTween('d', tween(data, line))
            .each('end', function() {
                drawCircles(data);
            });


        // Add the area path.
        svg.append('path')
            .datum(startData)
            .attr('class', 'lineChart--area')
            .attr('d', area)
            .transition()
            .duration(DURATION)
            .attrTween('d', tween(data, area));

        // Helper functions!!!
        function drawCircle(datum, index) {
            circleContainer.datum(datum)
                .append('circle')
                .attr('class', 'lineChart--circle')
                .attr('r', 0)
                .attr(
                    'cx',
                    function(d) {

                        return x(d.date) + detailWidth / 2;
                    }
                )
                .attr(
                    'cy',
                    function(d) {
                        return y(d.value);
                    }
                )
                .on('mouseenter', function(d) {
                    d3.select(this)
                        .attr(
                            'class',
                            'lineChart--circle lineChart--circle__highlighted'
                        )
                        .attr('r', 7);

                    d.active = true;

                    showLabel(d);
                })
                .on('mouseout', function(d) {
                    d3.select(this)
                        .attr(
                            'class',
                            'lineChart--circle'
                        )
                        .attr('r', 6);

                    if (d.active) {
                        hideCircleDetails();

                        d.active = false;
                    }
                })
                .on('click', function(d) {
                    if (d.active) {
                        showCircleDetail(d)
                    } else {
                        hideCircleDetails();
                    }
                })
                .transition()
                .delay(DURATION / 10 * index)
                .attr('r', 6);
        }

        function drawCircles(data) {
            circleContainer = svg.append('g');

            data.forEach(function(datum, index) {
                drawCircle(datum, index);
            });
        }

        function hideCircleDetails() {
            circleContainer.selectAll('.lineChart--bubble')
                .remove();
        }

        function showCircleDetail(data) {
          showLabel(data);
                d3.select("#info").selectAll("h2").remove();
                d3.select("#info").selectAll("h3").remove();
                d3.select("#info").selectAll("p").remove();
                d3.select("#info").append("h2").html("Top Posts from " + outputInfo(data.date) + ":");

                update(data, 0);
        }

        function showLabel(data) {

          var details = circleContainer.append('g')
              .attr('class', 'lineChart--bubble')
              .attr(
                  'transform',
                  function() {
                      var result = 'translate(';

                      result += x(data.date);
                      result += ', ';
                      result += y(data.value) - detailHeight - detailMargin;
                      result += ')';

                      return result;
                  }
              );

          details.append('path')
              .attr('d', 'M2.99990186,0 C1.34310181,0 0,1.34216977 0,2.99898218 L0,47.6680579 C0,49.32435 1.34136094,50.6670401 3.00074875,50.6670401 L44.4095996,50.6670401 C48.9775098,54.3898926 44.4672607,50.6057129 49,54.46875 C53.4190918,50.6962891 49.0050244,54.4362793 53.501875,50.6670401 L94.9943116,50.6670401 C96.6543075,50.6670401 98,49.3248703 98,47.6680579 L98,2.99898218 C98,1.34269006 96.651936,0 95.0000981,0 L2.99990186,0 Z M2.99990186,0')
              .attr('width', detailWidth)
              .attr('height', detailHeight);
          var text = details.append('text')
              .attr('class', 'lineChart--bubble--text');

          text.append('tspan')
              .attr('class', 'lineChart--bubble--label')
              .attr('x', detailWidth / 2)
              .attr('y', detailHeight / 3)
              .attr('text-anchor', 'middle')
              .text(data.type);

          text.append('tspan')
              .attr('class', 'lineChart--bubble--value')
              .attr('x', detailWidth / 2)
              .attr('y', detailHeight / 4 * 3)
              .attr('text-anchor', 'middle')
              .text(data.value);
        }

        function update(data, i) {
          d3.select("#info").selectAll("h3").remove();
          d3.select("#info").selectAll("p").remove();
          d3.select("#info").selectAll("button").remove();
          d3.select("#info").append("h3").html("Post " + (i + 1));
          d3.select("#info").append("p").html(data.topPosts[i]);
          d3.select("#info").append("p").append("b").html("Emotion: " + data.sentiments[i]);
          d3.select("#info").append("p").append("b").html("Popularity Count: " + data.counts[i]);
          d3.select("#info").append("button").attr("id", "next").html("Next Post");
          document.getElementById("next").addEventListener("click", function(){
            if(i == data.topPosts.length - 1) {
              update(data, 0)
            } else {
              update(data, i + 1);
            }
          });
        }

        function tween(b, callback) {
            return function(a) {
                var i = d3.interpolateArray(a, b);

                return function(t) {
                    return callback(i(t));
                };
            };
        }
    }

    /**
     * draw the fancy pie chart
     *
     * @param {String} elementId elementId
     * @param {Array}  data      data
     */
    function drawPieChart(elementId, data) {
        // TODO code duplication check how you can avoid that
        var containerEl = document.getElementById(elementId),
            width = containerEl.clientWidth,
            height = width * 0.4,
            radius = Math.min(width, height) / 2,
            container = d3.select(containerEl),
            svg = container.select('svg')
            .attr('width', width)
            .attr('height', height);
        var pie = svg.append('g')
            .attr(
                'transform',
                'translate(' + width / 2 + ',' + height / 2 + ')'
            );

        var detailedInfo = svg.append('g')
            .attr('class', 'pieChart--detailedInformation');

        var twoPi = 2 * Math.PI;
        var pieData = d3.layout.pie()
            .value(function(d) {
                return d.value;
            });

        var arc = d3.svg.arc()
            .outerRadius(radius - 20)
            .innerRadius(0);

        var pieChartPieces = pie.datum(data)
            .selectAll('path')
            .data(pieData)
            .enter()
            .append('path')
            .attr('class', function(d) {
                return 'pieChart__' + d.data.color;
            })
            .attr('filter', 'url(#pieChartInsetShadow)')
            .attr('d', arc)
            .each(function() {
                this._current = {
                    startAngle: 0,
                    endAngle: 0
                };
            })
            .transition()
            .duration(DURATION)
            .attrTween('d', function(d) {
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);

                return function(t) {
                    return arc(interpolate(t));
                };
            })
            .each('end', function handleAnimationEnd(d) {
                if(d.data.value >= 0.14 && d.data.value <= 0.30){
                  d.data.value = 0.55;
                  drawDetailedInformation(d.data, this);
                } else if (d.data.value > 0.15){
                  drawDetailedInformation(d.data, this);
                }
            });

        drawChartCenter();

        function drawChartCenter() {
            var centerContainer = pie.append('g')
                .attr('class', 'pieChart--center');

            centerContainer.append('circle')
                .attr('class', 'pieChart--center--outerCircle')
                .attr('r', 0)
                .attr('filter', 'url(#pieChartDropShadow)')
                .transition()
                .duration(DURATION)
                .delay(DELAY)
                .attr('r', radius - 90);

            centerContainer.append('circle')
                .attr('id', 'pieChart-clippy')
                .attr('class', 'pieChart--center--innerCircle')
                .attr('r', 0)
                .transition()
                .delay(DELAY)
                .duration(DURATION)
                .attr('r', radius - 95)
                .attr('fill', '#fff');
        }

        function drawDetailedInformation(data, element) {
            var bBox = element.getBBox(),
                infoWidth = width * 0.3,
                anchor,
                infoContainer,
                position;

            if ((bBox.x + bBox.width / 2) > 0) {
                infoContainer = detailedInfo.append('g')
                    .attr('width', infoWidth)
                    .attr(
                        'transform',
                        'translate(' + (width - infoWidth) + ',' + (bBox.height + bBox.y) + ')'
                    );
                anchor = 'end';
                position = 'right';
            } else {
                infoContainer = detailedInfo.append('g')
                    .attr('width', infoWidth)
                    .attr(
                        'transform',
                        'translate(' + 0 + ',' + (bBox.height + bBox.y) + ')'
                    );
                anchor = 'start';
                position = 'left';
            }

            infoContainer.data([data.value * 100])
                .append('text')
                .text('0 %')
                .attr('class', 'pieChart--detail--percentage')
                .attr('x', (position === 'left' ? 0 : infoWidth))
                .attr('y', -10)
                .attr('text-anchor', anchor)
                .attr('color', '#fff')
                .transition()
                .duration(DURATION)
                .tween('text', function(d) {
                    var i = d3.interpolateRound(+this.textContent.replace(/\s%/ig, ''),
                        d
                    );

                    return function(t) {
                        this.textContent = i(t) + ' %';
                    };
                });

            infoContainer.append('line')
                .attr('class', 'pieChart--detail--divider')
                .attr('x1', 0)
                .attr('x2', 0)
                .attr('y1', 0)
                .attr('y2', 0)
                .transition()
                .duration(DURATION)
                .attr('x2', infoWidth);

            infoContainer.data([data.description])
                .append('foreignObject')
                .attr('width', infoWidth)
                .attr('height', 100)
                .attr(
                    'class',
                    'pieChart--detail--textContainer ' + 'pieChart--detail__' + position
                )
                .html(data.description);
        }
    }

    // function ಠ_ಠ() {
    drawPieChart('pieChart', data.pieChart);
    drawLineChart('lineChart', data.linechart);
});
