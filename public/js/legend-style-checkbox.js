/**
 * Concrete row chart implementation with square labels and checkboxes.
 *
 * Examples:
 * - {@link http://dc-js.github.com/dc.js/ Nasdaq 100 Index}
 * @class rowChart
 * @memberof dc
 * @mixes dc.capMixin
 * @mixes dc.marginMixin
 * @mixes dc.colorMixin
 * @mixes dc.baseMixin
 * @example
 * // create a row chart under #chart-container1 element using the default global chart group
 * var chart1 = dc.rowChart('#chart-container1');
 * // create a row chart under #chart-container2 element using chart group A
 * var chart2 = dc.rowChart('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.rowChart}
 */
(function (global) {
    customRowChart = function (parent, chartGroup) {

        var _g;

        var _labelOffsetX = 20;
        var _labelOffsetY = 15;
        var _hasLabelOffsetY = false;
        var _dyOffset = '0.35em';  // this helps center labels https://github.com/mbostock/d3/wiki/SVG-Shapes#svg_text
        var _titleLabelOffsetX = 2;

        var _gap = 5;

        var _fixedBarHeight = false;
        var _rowCssClass = 'row';
        var _titleRowCssClass = 'titlerow';
        var _renderTitleLabel = false;

        var _chart = dc.capMixin(dc.marginMixin(dc.colorMixin(dc.baseMixin({}))));

        var _x;

        var _elasticX;

        var _xAxis = d3.svg.axis().orient('bottom');

        var _rowData;

        _chart.rowsCap = _chart.cap;

        function calculateAxisScale() {
            if (!_x || _elasticX) {
                var extent = d3.extent(_rowData, _chart.cappedValueAccessor);
                if (extent[0] > 0) {
                    extent[0] = 0;
                }
                _x = d3.scale.linear().domain(extent)
                    .range([0, _chart.effectiveWidth()]);
            }
            _xAxis.scale(_x);
        }

        function drawAxis() {
            if (!_g) return;
            var axisG = _g.select('g.axis');

            calculateAxisScale();

            if (axisG.empty()) {
                axisG = _g.append('g').attr('class', 'axis');
            }
            axisG.attr('transform', 'translate(0, ' + _chart.effectiveHeight() + ')');
            axisG.attr('opacity', 0);

            dc.transition(axisG, _chart.transitionDuration())
                .call(_xAxis);
        }

        _chart._doRender = function () {
            _chart.resetSvg();

            _g = _chart.svg()
                .append('g')
                .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');

            drawChart();

            return _chart;
        };

        _chart.title(function (d) {
            return _chart.cappedKeyAccessor(d) + ': ' + _chart.cappedValueAccessor(d);
        });

        _chart.label(_chart.cappedKeyAccessor);

        /**
         * Gets or sets the x scale. The x scale can be any d3
         * {@link https://github.com/mbostock/d3/wiki/Quantitative-Scales quantitive scale}
         * @method x
         * @memberof dc.rowChart
         * @instance
         * @see {@link https://github.com/mbostock/d3/wiki/Quantitative-Scales quantitive scale}
         * @param {d3.scale} [scale]
         * @return {d3.scale}
         * @return {dc.rowChart}
         */
        _chart.x = function (scale) {
            if (!arguments.length) {
                return _x;
            }
            _x = scale;
            return _chart;
        };

        function drawGridLines() {
            if (!_g) return;
            _g.selectAll('g.tick')
                .select('line.grid-line')
                .remove();

            _g.selectAll('g.tick')
                .append('line')
                .attr('class', 'grid-line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', 0)
                .attr('y2', function () {
                    return -_chart.effectiveHeight();
                });
        }

        function drawChart() {
            _rowData = _chart.data();

            drawAxis();
            drawGridLines();

            if (!_g) return;
            var rows = _g.selectAll('g.' + _rowCssClass)
                .data(_rowData);

            createElements(rows);
            removeElements(rows);
            updateElements(rows);
        }

        function createElements(rows) {
            var rowEnter = rows.enter()
                .append('g')
                .attr('class', function (d, i) {
                    return _rowCssClass + ' _' + i;
                });

            // rowEnter.append('circle').attr('r', 10);
            // rowEnter.append('polygon').attr('points', "100,10 40,198 190,78 10,78 160,198")
            // .attr('transform', 'scale(0.1)');
            rowEnter.append('rect').attr('width', 32).attr('id', 'legendbox');
            rowEnter.append('rect').attr('width', _chart.effectiveWidth()).attr('id', 'chartrow');
            rowEnter.append('rect').attr('width', 24).attr('id', 'checkboxbox');
            rowEnter.append('path').attr('width', 24).attr('id', 'checkboxcheck');
            rowEnter.append('path').attr('id', 'legendboxtip');

            createLabels(rowEnter);
            updateLabels(rows);
        }

        function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
            var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        }

        function describeArc(x, y, radius, startAngle, endAngle) {
            var start = polarToCartesian(x, y, radius, endAngle);
            var end = polarToCartesian(x, y, radius, startAngle);
            var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
            var d = [
                "M", start.x, start.y,
                "A", radius, radius, 0, arcSweep, 0, end.x, end.y
            ].join(" ");

            return d;
        }

        function removeElements(rows) {
            rows.exit().remove();
        }

        function rootValue() {
            var root = _x(0);
            return (root === -Infinity || root !== root) ? _x(1) : root;
        }

        function updateElements(rows) {
            var n = _rowData.length;

            var height;
            if (!_fixedBarHeight) {
                height = (_chart.effectiveHeight() - (n + 1) * _gap) / n;
                if (height > 32) height = 32;
            } else {
                height = _fixedBarHeight;
            }

            var chartwidth = _chart.effectiveWidth();

            // vertically align label in center unless they override the value via property setter
            if (!_hasLabelOffsetY) {
                _labelOffsetY = height / 2;
            }

            var scale = (height < 24 ? 0.8 : 0.5);
            var checkboxHeight = height * scale;

            rows.attr('transform', function (d, i) {
                return 'translate(' + (checkboxHeight) + ',' + ((i + 1) * _gap + i * height) + ')';
            })

            var square = rows.select('#legendbox')
                .attr('height', height)
                .attr('width', height + checkboxHeight)
                .attr('transform', function (d, i) {
                    return 'translate(' + (-1) + ',0)';
                })
                .attr('fill', _chart.getColor)
                .on('click', onClick);

            var tip = rows.select('#legendboxtip')
                .attr('height', height)
                .attr('width', height)
                .attr('d', describeArc(0, height / 2, height / 2, 180, 360))
                .attr('fill', _chart.getColor)
                .on('click', onClick);

            var rowrect = rows.select('#chartrow')
                .attr('height', height)
                .attr('width', chartwidth - 2 * height - _gap)
                .attr('transform', function (d, i) {
                    return 'translate(' + (height + _gap) + ',0)';
                })
                .attr('fill', 'none')
                .on('click', onClick);

            var checkboxbox = rows.select('#checkboxbox')
                .attr('height', checkboxHeight)
                .attr('transform', function (d, i) {
                    return 'translate(' + (0) + ',' + (((1 - scale) / 2) * height) + ')';
                })
                .attr('width', checkboxHeight)
                .attr('fill', 'white')
                .attr('stroke-width', 0)
                .on('click', onClick)
                .classed('deselected', function (d) {
                    return (_chart.hasFilter()) ? !isSelectedRow(d) : false;
                })
                .classed('selected', function (d) {
                    return (_chart.hasFilter()) ? isSelectedRow(d) : false;
                });

            //Data to represent the check mark
            var x = 0;
            var y = 0;
            var coordinates = [
                { x: x + (checkboxHeight / 8), y: y + (checkboxHeight / 3) },
                { x: x + (checkboxHeight / 2.2), y: (y + checkboxHeight) - (checkboxHeight / 4) },
                { x: (x + checkboxHeight) - (checkboxHeight / 8), y: (y + (checkboxHeight / 10)) }
            ];

            var line = d3.svg.line()
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; })
                .interpolate("basic");

            var mark = rows.select('#checkboxcheck')
                .attr("d", line(coordinates))
                .attr('height', checkboxHeight)
                .attr('width', checkboxHeight)
                .attr('transform', function (d, i) {
                    return 'translate(' + (0) + ',' + (((1 - scale) / 2) * height) + ')';
                })
                .style({
                    "stroke-width": 3,
                    "stroke": "black",
                    "fill": "none"
                })
                .on('click', onClick)
                .classed('deselected', function (d) {
                    return (_chart.hasFilter()) ? !isSelectedRow(d) : false;
                })
                .classed('selected', function (d) {
                    return (_chart.hasFilter()) ? isSelectedRow(d) : false;
                });

            createTitles(rows);
            updateLabels(rows);
        }

        function createTitles(rows) {
            if (_chart.renderTitle()) {
                rows.selectAll('title').remove();
                rows.append('title').text(_chart.title());
            }
        }

        function createLabels(rowEnter) {
            if (_chart.renderLabel()) {
                rowEnter.append('text')
                    .on('click', onClick);
                rowEnter.append('text').attr('id', 'textvalue')
                    .on('click', onClick);
                rowEnter.append('text').attr('id', 'textvalue2')
                    .on('click', onClick);
            }
            if (_chart.renderTitleLabel()) {
                rowEnter.append('text')
                    .attr('class', _titleRowCssClass)
                    .on('click', onClick);
            }
        }

        function updateLabels(rows) {
            var n = _rowData.length;
            var height;
            if (!_fixedBarHeight) {
                height = (_chart.effectiveHeight() - (n + 1) * _gap) / n;
                if (height > 32) height = 32;
            } else {
                height = _fixedBarHeight;
            }
            var all = _chart.dimension().groupAll();

            if (_chart.renderLabel()) {
                var lab = rows.select('text')
                    .attr('x', function (d) {
                        if (d.key && d.key.indexOf("%") === -1) {
                            return 3 * height;
                        } else {
                            return height + 20;
                        }
                    })
                    .attr('y', function (d) {
                        if (d.key && d.key.indexOf("%") === -1) {
                            return _labelOffsetY;
                        } else {
                            return 0.67 * height;
                        }
                    })
                    // .attr('text-anchor', function (d) {
                    //     if (d.key.indexOf("%") === -1) {
                    //         return 'start';
                    //     } else {
                    //         return 'end';
                    //     }
                    // })
                    .attr('dy', _dyOffset)
                    .on('click', onClick)
                    .attr('class', function (d, i) {
                        return _rowCssClass + ' _' + i;
                    })
                    .text(function (d) {
                        if (d.key) {
                            return d.key.replace(/\s/g, String.fromCharCode(160));
                        } else {
                            return _chart.label()(d);
                        }
                    });

                var labb = rows.select('#textvalue')
                    .attr('x', _labelOffsetX + 2 * height)
                    .attr('y', function (d) {
                        if (d.key && d.key.indexOf("%") === -1) {
                            return _labelOffsetY;
                        } else {
                            return height / 5;
                        }
                    })
                    .attr('dy', _dyOffset)
                    .attr('text-anchor', 'end')
                    .attr('font-weight', 'bold')
                    .on('click', onClick)
                    .attr('class', function (d, i) {
                        return _rowCssClass + ' _' + i;
                    })
                    .text(function (d) {
                        return Math.floor(d.value / all.value() * 100) + "%";
                    });

                var lab2 = rows.select('#textvalue2')
                    .attr('x', _chart.effectiveWidth() - height + _gap)
                    .attr('y', function (d) {
                        if (d.key && d.key.indexOf("%") === -1) {
                            return _labelOffsetY;
                        } else {
                            return 6;
                        }
                    })
                    .attr('dy', _dyOffset)
                    .attr('text-anchor', 'end')
                    .on('click', onClick)
                    .attr('class', function (d, i) {
                        return _rowCssClass + ' _' + i;
                    })
                    .text(function (d) {
                        if (d.key && d.key.indexOf("%") === -1) {
                            return "";
                        } else {
                            return String.fromCharCode(160) + "van de buurten hebben"
                        }
                    });

                dc.transition(lab, _chart.transitionDuration())
                    .attr('transform', translateX);
            }
            if (_chart.renderTitleLabel()) {
                var titlelab = rows.select('.' + _titleRowCssClass)
                    .attr('x', _chart.effectiveWidth() - _titleLabelOffsetX)
                    .attr('y', _labelOffsetY)
                    .attr('dy', _dyOffset)
                    .attr('text-anchor', 'end')
                    .on('click', onClick)
                    .attr('class', function (d, i) {
                        return _titleRowCssClass + ' _' + i;
                    })
                    .text(function (d) {
                        return _chart.title()(d);
                    });
                dc.transition(titlelab, _chart.transitionDuration())
                    .attr('transform', translateX);
            }
        }

        /**
         * Turn on/off Title label rendering (values) using SVG style of text-anchor 'end'
         * @method renderTitleLabel
         * @memberof dc.rowChart
         * @instance
         * @param {Boolean} [renderTitleLabel=false]
         * @return {Boolean}
         * @return {dc.rowChart}
         */
        _chart.renderTitleLabel = function (renderTitleLabel) {
            if (!arguments.length) {
                return _renderTitleLabel;
            }
            _renderTitleLabel = renderTitleLabel;
            return _chart;
        };

        function onClick(d) {
            _chart.onClick(d);
        }

        function translateX(d) {
            var x = _x(_chart.cappedValueAccessor(d)),
                x0 = rootValue(),
                s = x > x0 ? x0 : x;
            return 'translate(' + s + ',0)';
        }

        _chart._doRedraw = function () {
            drawChart();
            return _chart;
        };

        /**
         * Get the x axis for the row chart instance.  Note: not settable for row charts.
         * See the {@link https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis d3 axis object}
         * documention for more information.
         * @method xAxis
         * @memberof dc.rowChart
         * @instance
         * @see {@link https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis d3.svg.axis}
         * @example
         * // customize x axis tick format
         * chart.xAxis().tickFormat(function (v) {return v + '%';});
         * // customize x axis tick values
         * chart.xAxis().tickValues([0, 100, 200, 300]);
         * @return {d3.svg.axis}
         */
        _chart.xAxis = function () {
            return _xAxis;
        };

        /**
         * Get or set the fixed bar height. Default is [false] which will auto-scale bars.
         * For example, if you want to fix the height for a specific number of bars (useful in TopN charts)
         * you could fix height as follows (where count = total number of bars in your TopN and gap is
         * your vertical gap space).
         * @method fixedBarHeight
         * @memberof dc.rowChart
         * @instance
         * @example
         * chart.fixedBarHeight( chartheight - (count + 1) * gap / count);
         * @param {Boolean|Number} [fixedBarHeight=false]
         * @return {Boolean|Number}
         * @return {dc.rowChart}
         */
        _chart.fixedBarHeight = function (fixedBarHeight) {
            if (!arguments.length) {
                return _fixedBarHeight;
            }
            _fixedBarHeight = fixedBarHeight;
            return _chart;
        };

        /**
         * Get or set the vertical gap space between rows on a particular row chart instance
         * @method gap
         * @memberof dc.rowChart
         * @instance
         * @param {Number} [gap=5]
         * @return {Number}
         * @return {dc.rowChart}
         */
        _chart.gap = function (gap) {
            if (!arguments.length) {
                return _gap;
            }
            _gap = gap;
            return _chart;
        };

        /**
         * Get or set the elasticity on x axis. If this attribute is set to true, then the x axis will rescle to auto-fit the
         * data range when filtered.
         * @method elasticX
         * @memberof dc.rowChart
         * @instance
         * @param {Boolean} [elasticX]
         * @return {Boolean}
         * @return {dc.rowChart}
         */
        _chart.elasticX = function (elasticX) {
            if (!arguments.length) {
                return _elasticX;
            }
            _elasticX = elasticX;
            return _chart;
        };

        /**
         * Get or set the x offset (horizontal space to the top left corner of a row) for labels on a particular row chart.
         * @method labelOffsetX
         * @memberof dc.rowChart
         * @instance
         * @param {Number} [labelOffsetX=10]
         * @return {Number}
         * @return {dc.rowChart}
         */
        _chart.labelOffsetX = function (labelOffsetX) {
            if (!arguments.length) {
                return _labelOffsetX;
            }
            _labelOffsetX = labelOffsetX;
            return _chart;
        };

        /**
         * Get or set the y offset (vertical space to the top left corner of a row) for labels on a particular row chart.
         * @method labelOffsetY
         * @memberof dc.rowChart
         * @instance
         * @param {Number} [labelOffsety=15]
         * @return {Number}
         * @return {dc.rowChart}
         */
        _chart.labelOffsetY = function (labelOffsety) {
            if (!arguments.length) {
                return _labelOffsetY;
            }
            _labelOffsetY = labelOffsety;
            _hasLabelOffsetY = true;
            return _chart;
        };

        /**
         * Get of set the x offset (horizontal space between right edge of row and right edge or text.
         * @method titleLabelOffsetX
         * @memberof dc.rowChart
         * @instance
         * @param {Number} [titleLabelOffsetX=2]
         * @return {Number}
         * @return {dc.rowChart}
         */
        _chart.titleLabelOffsetX = function (titleLabelOffsetX) {
            if (!arguments.length) {
                return _titleLabelOffsetX;
            }
            _titleLabelOffsetX = titleLabelOffsetX;
            return _chart;
        };

        function isSelectedRow(d) {
            return _chart.hasFilter(_chart.cappedKeyAccessor(d));
        }

        return _chart.anchor(parent, chartGroup);
    };
} (typeof window !== 'undefined' ? window : this));
