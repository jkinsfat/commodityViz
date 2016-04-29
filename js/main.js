
$(function() {
	d3.csv('data/cfs2012Exports.csv', function(error, data){//Exports Data
		d3.json('data/SCTG.json', function(error2, data2){//Government classification codes for goods
			d3.json('data/FIPS.json', function(error3, data3){//State Shipping codes
				data.forEach(function(d) {
					//Going through export data and translating the codes to their english equivalent
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

					d.SHIPMT_VALUE = d3.round(d.SHIPMT_WGHT * d.WGT_FACTOR);
					//Calculates actual pounds of a good over the year. See CFS User guide in Data folder
				})


				var stateData = [];//Will hold the good values ranked for each state
				var goodsData = [];//will hold the ranked states for each good

				//Sorts the data by good and state so it can be ranked
				for(var r = 0; r < data.length; r++) {
					var stateFound = false;
					var goodsFound = false;

					//Fills stateData
					if (stateData.length > 0) {
						for (var i = 0; i < stateData.length; i++) {
							if (stateData[i].State == data[r].ORIG_STATE) {
								stateFound = true;
								for (var k = 0; k < stateData[i].Goods.length; k++) {
									if (stateData[i].Goods[k].Name == data[r].SCTG) {
										//One good shipped out of one state can have multiple rows so they all have to be added together
										stateData[i].Goods[k].Pounds += data[r].SHIPMT_VALUE; 
										k = stateData[i].Goods.length;
									}
								}					
							}
						}
					}

					//creates a new state if not already made
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

					//Fills goodsData
					if (goodsData.length > 0) {
						for (var i = 0; i < goodsData.length; i++) {
							if (goodsData[i].Good == data[r].SCTG) {
								goodsFound = true;
								for (var k = 0; k < goodsData[i].States.length; k++) {
									if (goodsData[i].States[k].Name == data[r].ORIG_STATE) {
										//One good shipped out of one state can have multiple rows so they all have to be added together
										goodsData[i].States[k].Pounds += data[r].SHIPMT_VALUE;
										k = goodsData[i].States.length;
									}
								}
							}
						}
					}

					//Creates new good if not already made
					if (!goodsFound) {
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

				//Alphabetizes the States
				stateData.sort(function(c, d){
					if(c.State < d.State) return -1;
    				if(c.State > d.State) return 1;
    				return 0;
				});

				//Ranks the goods exported from each state from highest to lowest
				//Creates List of State Names
				stateLabels = [];
				stateData.forEach(function(state) {
					stateLabels.push(state.State);
					state.Goods.sort(function(a, b) {
						return b.Pounds - a.Pounds;
					});
				});

				//Ranks States by the pounds they exported for each good from high to low
				goodsData.forEach(function(good) {
					good.States.sort(function(a, b) {
						return b.Pounds - a.Pounds;
					});
				});

				//Creates list of good names
				goodsLabels = []
				stateData[0].Goods.forEach(function(good) {
					goodsLabels.push(good.Name);
				})

				//The data that goes on the heatmap
				chartData = []
		    	for (var o = 0; o < stateData.length; o++) {
		    		for (var w = 0; w < stateData[o].Goods.length; w++) {
		    			chartData.push({
		    				x: stateData[o].State,//Nominal
		    				y: stateData[o].Goods[w].Name,//Nominal
		    				value: stateData[o].Goods[w].Pounds//Quantitative
		    			});
		    		}
		    	}

		    	//Chart Dimensions 
				var margin = { top: 50, right: 0, bottom: 100, left: 30 },
		          width = 1100 - margin.left - margin.right,
		          height = 1100 - margin.top - margin.bottom,
		          gridSize = Math.floor((width - 135) / stateData.length),
		          legendElementWidth = gridSize*5.5,
		          buckets = 9,
		          //Colors for the squares, alternatively colorbrewer.YlGnBu[9]
		          colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"],
		          //Ranks the squares based on data from this axis
		          filterAxis = "xAxis"

		        //initializes main chart
			    var svg1 = d3.select("#heatMap").append("svg")
		          .attr("width", width + margin.left + margin.right)
		          .attr("height", height - 90)
		          .style("margin-right","150px")
		          .append("g")
		          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		        //Intializes footer svg for the legend and data switching buttons
		        var svg2 = d3.select("#foot").append("svg")
		        	.attr("width", "1000px")
		        	.attr("height", "60px")

		        //Sets up the domains for the values to be converted into the 9 discrete colors
	        	var colorScale = d3.scale.quantile()
		            .domain([0,10000,100000,1000000,10000000,100000000,1000000000,10000000000,d3.max(chartData, function (d) { return d.value; })])
		            .range(colors);

		        //Initializes Legend
	        	var legend = svg2.selectAll(".legend")
		            .data([0].concat(colorScale.quantiles()), function(d) { return d; });

		        legend.enter().append("g")
		            .attr("class", "legend");
		        //Legend colors
		        legend.append("rect")
		            .attr("x", function(d, i) { return legendElementWidth * i; })
		            .attr("y", 10)
		            .attr("width", legendElementWidth)
		            .attr("height", gridSize / 2)
		            .style("fill", function(d, i) { return colors[i]; });
		        //Legend numbers
		        legend.append("text")
		            .text(function(d) { return "≥ " + Math.round(d); })
		            .attr("x", function(d, i) { return legendElementWidth * i; })
		            .attr("y", 30);
		        //Legend title
		        legend.append("text")
		        	.text("Pounds Exported in 2012")
		        	.attr("x", legendElementWidth * 4.5)
		        	.attr("y", 45)
		        	.style("text-anchor", "middle");
		       	//Intializes the x and y labels and first filter: the state alaska
		        var yRankedLabels = [];
			    var xRankedLabels = [];
			    var filter = "AK";
			    //Charts the data
			    var heatmapChart = function(stableLabels) {
			    	yRankedLabels = [];
			    	xRankedLabels = [];
			    	//Sets up labels on the filtered Axis so nominal filter clicked on is closest origin followed by last clicked on
			    	if (filterAxis == "xAxis") {
			    		xRankedLabels.push(filter);
				    	stableLabels.forEach(function(obj) {
				    		if(obj != filter) {
				    			xRankedLabels.push(obj);
				    		} else {
				    			var stateInd = stateData.map(function(d) {
				    				return d.State;
				    			}).indexOf(filter);
				    			for (var i = 0; i < stateData[stateInd].Goods.length; i++){
				 					yRankedLabels.push(stateData[stateInd].Goods[i].Name);
				    			}
				    		}
				    	});
			    	}
			    	if (filterAxis == "yAxis") {
			    		yRankedLabels.push(filter);
			    		stableLabels.forEach(function(obj) {
			    			if(obj != filter) {
			    				yRankedLabels.push(obj);
			    			} else {
			    				console.log(goodsData);
			    				var goodInd = goodsData.map(function(d) {
			    					return d.Good;
			    				}).indexOf(filter);
			    				for (var i = 0; i < goodsData[goodInd].States.length; i++){
			    					xRankedLabels.push(goodsData[goodInd].States[i].Name);
			    				}
			    			}
			    		});
			    	}

			    	//The squares on the map
			        var squares = svg1.selectAll("rect")
			            .data(chartData, function(d) {return d.y+':'+d.x;});

			        squares.append("title");

			        squares.enter().append("rect")

			        squares.attr("x", function(d) { return (xRankedLabels.indexOf(d.x) - 1) * gridSize + 155; })
			            .attr("y", function(d) { return (yRankedLabels.indexOf(d.y) - 1) * gridSize + 20; })
			            .attr("rx", 4)
			            .attr("ry", 4)
			            .attr("width", gridSize)
			            .attr("height", gridSize)
			            .style("fill", colors[0])
			            .on("click", function(d){
			            	if (filterAxis == "yAxis") {
			            		filter = d.y;
			            		heatmapChart(yRankedLabels);
			            	} else {
			            		filter = d.x;
			            		heatmapChart(xRankedLabels);
			            	}
			            });

			        squares.transition().duration(1500).style("fill", function(d) { return colorScale(d.value); });

			        squares.select("title").text(function(d) { return d.value; });
			          
			        squares.exit().remove();

			        //Initializes xlabels
				    var xLabelling = svg1.selectAll(".xLabel").data(xRankedLabels)
				        
				    xLabelling.enter().append("text").attr("class", "xLabel");

				    xLabelling.text(function(d) { return d; })
				          .style("text-anchor", "middle")
				          .style("font-size", "10px")
				          .attr("transform", "translate(" + gridSize /2 + ", -6)");

				    //Transitions for labels don't work :0 plz send help
				    xLabelling.transition().duration(1500)
				    	.attr("x", function(d, i) { return (i * gridSize) + 137; })
				        .attr("y", 0)

				    //Initializes ylabels
			        var yLabelling = svg1.selectAll(".yLabel").data(yRankedLabels);
		          	
		          	yLabelling.enter().append("text").attr("class", "yLabel");

		            yLabelling.text(function (d) { return d; })
			            .style("text-anchor", "end")
			            .attr("transform", "translate(-6," + gridSize / 1.5 + ")");

			        yLabelling.transition()
			        	.attr("x", 135)
			            .attr("y", function (d, i) { return i * gridSize; });

			        yLabelling.exit().transition().remove();
			    };  
			    //First generates chart 
			    heatmapChart(stateLabels);
			    
			    //Sets up axis picking buttons
			    var datapicker = d3.select("#axispicker").selectAll(".axis-button")
			      .data([{"Name":"By Good",
			      		"filter": "yAxis" }, 
			      		{"Name": "By State",
			      		"filter": "xAxis"}]);

			    datapicker.enter()
			        .append("input")
			        .attr("value", function(d){ return "" + d.Name })
			        .attr("type", "button")
			        .attr("class", "axis-button")
			        .on("click", function(d) {//Regenerates chart filtered by selected axis
			          filterAxis = d.filter;
			          if (filterAxis == "yAxis") {
			          	filter = yRankedLabels[0];
			          	heatmapChart(yRankedLabels);
			          } else {
			          	filter = xRankedLabels[0];
			          	heatmapChart(xRankedLabels);
			          }
			      	});
			})
		})
	});
});