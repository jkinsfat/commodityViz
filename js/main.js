
$(function() {
	d3.csv('data/cfs2012Exports.csv', function(error, data){
		d3.json('data/SCTG.json', function(error2, data2){
			d3.json('data/FIPS.json', function(error3, data3){
				data.forEach(function(d) {
					var descriptionFound = false;
					data2.forEach(function(s) {
						if (s.SCTG == d.SCTG) {
							d.SCTG = s.Description;
							descriptionFound = true;
						}
					});
					if (!descriptionFound) {
						d.SCTG = 'Missing Code';
					}

					data3.forEach(function(f) {
						if (f.FIPSCode == d.ORIG_STATE) {
							d.ORIG_STATE = f.USPS;
						}
					});

					if (d.EXPORT_CNTRY == 'O') {
						d.EXPORT_CNTRY = 'Other';
					} else if (d.EXPORT_CNTRY == 'M') {
						d.EXPORT_CNTRY = 'Mexico';
					} else if (d.EXPORT_CNTRY == 'C') {
						d.EXPORT_CNTRY = 'Canada';
					}

					d.SHIPMT_VALUE = d.SHIPMT_WGHT * d.WGT_FACTOR;
				})


				var stateData = [];
				var goodsData = [];

				for(var r = 0; r < data.length; r++) {
					var stateFound = false;
					var goodsFound = false;

					if (stateData.length > 0) {
						for (var i = 0; i < stateData.length; i++) {
							if (stateData[i].State == data[r].ORIG_STATE) {
								stateFound = true;
								for (var k = 0; k < stateData[i].Goods.length; k++) {
									if (stateData[i].Goods[k].Name == data[r].SCTG) {
										stateData[i].Goods[k].Pounds += data[r].SHIPMT_VALUE;
										k = stateData[i].Goods.length;
									}
								}					
							}
						}
					}

					if (!stateFound) {
						var singleState = {
							"State": data[r].ORIG_STATE,
							"Goods": []
						}
						data2.forEach(function(row) {
							var stateGood = ({
								"Name": row.Description,
								"Pounds": 0,
							});
							if (stateGood.Name == data[r].SCTG) {
								stateGood.Pounds += data[r].SHIPMT_VALUE;
							}
							singleState.Goods.push(stateGood);
						});
						stateData.push(singleState);
					}

					if (goodsData.length > 0) {
						for (var i = 0; i < goodsData.length; i++) {
							if (goodsData[i].Good == data[r].SCTG) {
								goodFound = true;
								for (var k = 0; k < goodsData[i].States.length; k++) {
									if (goodsData[i].States[k].Name == data[r].ORIG_STATE) {
										goodsData[i].States[k].Pounds += data[r].SHIPMT_VALUE;
										k = goodsData[i].States.length;
									}
								}
							}
						}
					}

					if (!stateFound) {
						var singleGood = {
							"Good": data[r].SCTG,
							"States": []
						}
						data3.forEach(function(row) {
							var goodState = ({
								"Name": row.USPS,
								"Pounds": 0,
							});
							if (goodState.Name == data[r].ORIG_STATE) {
								goodState.Pounds += data[r].SHIPMT_VALUE;
							}
							singleGood.States.push(goodState);
						});
						goodsData.push(singleGood);
					}
				}

				stateData.sort(function(c, d){
					if(c.State < d.State) return -1;
    				if(c.State > d.State) return 1;
    				return 0;
				});

				stateLabels = [];
				stateData.forEach(function(state) {
					stateLabels.push(state.State);
					state.Goods.sort(function(a, b) {
						return b.Pounds - a.Pounds;
					});
				});

				goodsData.forEach(function(good) {
					good.States.sort(function(a, b) {
						return b.Pounds - a.Pounds;
					});
				});

				goodsLabels = []
				stateData[0].Goods.forEach(function(good) {
					goodsLabels.push(good.Name);
				})

				var margin = { top: 50, right: 0, bottom: 100, left: 30 },
		          width = 1100 - margin.left - margin.right,
		          height = 1100 - margin.top - margin.bottom,
		          gridSize = Math.floor((width - 135) / stateData.length),
		          legendElementWidth = gridSize*5.5,
		          buckets = 9,
		          colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"] // alternatively colorbrewer.YlGnBu[9]

			    var svg1 = d3.select("#heatMap").append("svg")
		          .attr("width", width + margin.left + margin.right)
		          .attr("height", height - 90)
		          .style("margin-right","150px")
		          .append("g")
		          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		        var svg2 = d3.select("#foot").append("svg")
		        	.attr("width", "1000px")
		        	.attr("height", "60px")
    
			    var xLabelling = svg1.selectAll(".xLabel")
			        .data(stateLabels)
			        .enter().append("text")
			          .text(function(d) { return d; })
			          .attr("x", function(d, i) { return (i * gridSize) + 137; })
			          .attr("y", 0)
			          .style("text-anchor", "middle")
			          .style("font-size", "10px")
			          .attr("transform", "translate(" + gridSize /2 + ", -6)")

			    chartData = []
			    	for (var o = 0; o < stateData.length; o++) {
			    		for (var w = 0; w < stateData[o].Goods.length; w++) {
			    			chartData.push({
			    				x: stateData[o].State,
			    				y: stateData[o].Goods[w].Name,
			    				value: stateData[o].Goods[w].Pounds
			    			});
			    		}
			    	}

			    var heatmapChart = function(xdata, colFilter) {
			    	var yRankedLabels = [];
			    	var xRankedLabels = [];
			    	xdata.forEach(function(obj) {
			    		xRankedLabels.push(obj.State);
			    		if (obj.State == colFilter) {
			    			for (var i = 0; i < obj.Goods.length; i++){
			    				yRankedLabels.push(obj.Goods[i].Name);
			    			}
			    		}
			    	});

			        var colorScale = d3.scale.quantile()
			            .domain([0,10000,100000,1000000,10000000,100000000,1000000000,10000000000,d3.max(chartData, function (d) { return d.value; })])
			            .range(colors);

			        var cards = svg1.selectAll("rect")
			            .data(chartData, function(d) {return d.y+':'+d.x;});

			        cards.append("title");

			        cards.enter().append("rect")

			        cards.attr("x", function(d) { return (stateLabels.indexOf(d.x) - 1) * gridSize + 155; })
			            .attr("y", function(d) { return (yRankedLabels.indexOf(d.y) - 1) * gridSize + 20; })
			            .attr("rx", 4)
			            .attr("ry", 4)
			            .attr("width", gridSize)
			            .attr("height", gridSize)
			            .style("fill", colors[0])
			            .on("click", function(d){
			            	if (colFilter !== d.col) {
			            		heatmapChart(stateData, d.x);
			            	}
			            });

			        cards.style("fill", function(d) { return colorScale(d.value); });

			        cards.select("title").text(function(d) { return d.value; });
			          
			        cards.exit().remove();

			        var legend = svg2.selectAll(".legend")
			            .data([0].concat(colorScale.quantiles()), function(d) { return d; });

			        legend.enter().append("g")
			            .attr("class", "legend");

			        legend.append("rect")
			            .attr("x", function(d, i) { return legendElementWidth * i; })
			            .attr("y", 10)
			            .attr("width", legendElementWidth)
			            .attr("height", gridSize / 2)
			            .style("fill", function(d, i) { return colors[i]; });

			        legend.append("text")
			            .text(function(d) { return "≥ " + Math.round(d); })
			            .attr("x", function(d, i) { return legendElementWidth * i; })
			            .attr("y", 30);

			        legend.append("text")
			        	.text("Pounds Per Year")
			        	.attr("x", legendElementWidth * 4.5)
			        	.attr("y", 45)
			        	.style("text-anchor", "middle");

				    var xLabelling = svg1.selectAll(".xLabel")
				        .data(stateLabels)
				        .enter().append("text")
				          .text(function(d) { return d; })
				          .attr("x", function(d, i) { return (i * gridSize) + 137; })
				          .attr("y", 0)
				          .style("text-anchor", "middle")
				          .style("font-size", "10px")
				          .attr("transform", "translate(" + gridSize /2 + ", -6)")


			        var yLabelling = svg1.selectAll(".yLabel").data(yRankedLabels);
			        console.log(yLabelling);
		          	
		          	yLabelling.enter().append("text").attr("class", "yLabel");

		            yLabelling.text(function (d) { return d; })
			            .style("text-anchor", "end")
			            .attr("transform", "translate(-6," + gridSize / 1.5 + ")");

			        yLabelling.transition()
			        	.attr("x", 135)
			            .attr("y", function (d, i) { return i * gridSize; });


			        yLabelling.exit().transition().remove();


			    };  

			    datasets = [stateData];
			    heatmapChart(stateData, 'MT');
			      
			    var datapicker = d3.select("#datapicker").selectAll(".dataset-button")
			      .data([{"Name": "By Good",
			      		"data": data }, 
			      		{"Name": "By State",
			      		"data": data2}]);

			    datapicker.enter()
			        .append("input")
			        .attr("value", function(d){ return "" + d.Name })
			        .attr("type", "button")
			        .attr("class", "dataset-button")
			        .on("click", function(d) {
			          heatmapChart(d);
			      });
			})
		})
	});
});