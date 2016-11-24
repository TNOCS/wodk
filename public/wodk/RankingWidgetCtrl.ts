module wodk {
    export class RankingWidgetData {
        rankingProperties: Dictionary < string > ;
        bins: number;
        layerId: string;
    }

    export interface IRankingWidgetScope extends ng.IScope {
        vm: RankingWidgetCtrl;
        data: RankingWidgetData;
        style: csComp.Services.GroupStyle;
        filter: csComp.Services.GroupFilter;
        minimized: boolean;
        selectedFeature: csComp.Services.IFeature;
        activeLegend: csComp.Services.Legend;
        activeStyleGroup: csComp.Services.ProjectGroup;
        activeStyleProperty: csComp.Services.IPropertyType;
    }

    declare var String;

    export class RankingWidgetCtrl {
        private scope: IRankingWidgetScope;
        private widget: csComp.Services.IWidget;
        private parentWidget: JQuery;
        private mBusHandles: csComp.Services.MessageBusHandle[] = [];
        private exporterAvailable: boolean;
        private selectedProp: string;
        private selectedBins: string;

        public static $inject = [
            '$scope',
            '$timeout',
            '$translate',
            'layerService',
            'messageBusService',
            'mapService'
        ];

        constructor(
            private $scope: IRankingWidgetScope,
            private $timeout: ng.ITimeoutService,
            private $translate: ng.translate.ITranslateService,
            private $layerService: csComp.Services.LayerService,
            private $messageBus: csComp.Services.MessageBusService,
            private $mapService: csComp.Services.MapService
        ) {
            $scope.vm = this;
            var par = < any > $scope.$parent;
            this.widget = par.widget;
            this.parentWidget = $("#" + this.widget.elementId).parent();

            $scope.data = < RankingWidgetData > this.widget.data;
            $scope.minimized = false;

            this.selectedProp = ($scope.data.hasOwnProperty('rankingProperties') ? Object.keys($scope.data.rankingProperties)[0] : null);
            this.selectedBins = ($scope.data.hasOwnProperty('bins') ? $scope.data.bins.toFixed(0) : '10');

            if (( < any > window).canvg) {
                this.exporterAvailable = true;
            } else {
                this.exporterAvailable = false;
            }

            // this.mBusHandles.push(this.$messageBus.subscribe('feature', (action: string, feature: csComp.Services.IFeature) => {
            //     switch (action) {
            //         case 'onFeatureDeselect':
            //         case 'onFeatureSelect':
            //             this.selectFeature(feature);
            //             break;
            //         default:
            //             break;
            //     }
            // }));

            this.mBusHandles.push(this.$messageBus.subscribe('layer', (title, l: csComp.Services.ProjectLayer) => {
                if (title === 'activated') {
                    if (l && l.id.toLowerCase() === $scope.data.layerId) {
                        this.createLegend(l);
                    }
                }
            }));

            this.mBusHandles.push(this.$messageBus.subscribe('updatelegend', (title, gs: csComp.Services.GroupStyle) => {
                switch (title) {
                    case 'hidelegend':
                        // this.close();
                        break;
                    default:
                        if (gs && gs.activeLegend && gs.activeLegend.id.indexOf('_rank') === 0) {
                            $timeout(() => {
                                $scope.activeLegend = gs.activeLegend;
                            }, 0);
                        }
                        break;
                }
            }));

            if (this.$layerService.$rootScope.$$phase !== '$apply' && this.$layerService.$rootScope.$$phase !== '$digest') {
                this.$layerService.$rootScope.$apply(); 
            }
        }

        private minimize() {
            this.$scope.minimized = !this.$scope.minimized;
            if (this.$scope.minimized) {
                this.parentWidget.css("height", "30px");
            } else {
                this.parentWidget.css("height", this.widget.height);
            }
        }

        private canClose() {
            return (this.$scope.data.hasOwnProperty('canClose')) ?
                this.$scope.data['canClose'] :
                true;
        }

        private close() {
            this.parentWidget.hide();
        }

        public stop() {
            if (this.mBusHandles && this.mBusHandles.length > 0) {
                this.mBusHandles.forEach((mbh) => {
                    this.$messageBus.unsubscribe(mbh);
                });
            }
        }

        // private selectFeature(feature: csComp.Services.IFeature) {
        //     if (!feature || !feature.isSelected) {
        //         return;
        //     } else {
        //         this.parentWidget.show();
        //     }
        // }

        private selectProp() {
            let l = this.$layerService.findLoadedLayer(this.$scope.data.layerId);
            if (!l || !this.selectedProp) return;
            if (this.selectedProp === 'geen') {
                var oldStyles = l.group.styles.filter((s: csComp.Services.GroupStyle) => { return s.property.startsWith('_rank'); });
                oldStyles.forEach((s) => {
                    this.$layerService.removeStyle(s);
                });
                var oldFilters = l.group.filters.filter((f: csComp.Services.GroupFilter) => { return f.property.startsWith('_rank'); });
                oldFilters.forEach((f) => {
                    this.$layerService.removeFilter(f);
                });
                this.$layerService.rebuildFilters(l.group);
                this.$timeout(() => {
                    this.$scope.activeLegend = null;
                });
            }
            this.createLegend(l);
        }

        private createLegend(l: csComp.Services.ProjectLayer) {
            if (!l) return;
            let pInfo: csComp.Services.PropertyInfo = this.$layerService.calculatePropertyInfo(l.group, this.selectedProp);
            let pType = this.$layerService.findPropertyTypeById(`${l.typeUrl}#${this.selectedProp}`);
            if (!pType) return;
            let rankProp = `_rank_${this.selectedProp}`;
            let rankPType: csComp.Services.IPropertyType = JSON.parse(JSON.stringify(pType));
            rankPType.label = rankProp;
            rankPType.id = rankPType.id.replace(this.selectedProp, rankProp);
            let scale: any = d3.scale.linear().domain([pInfo.min, pInfo.max]);
            let bins = scale.nice().ticks(+this.selectedBins);
            if (bins.length === 1) {
                if (bins[0] !== 0) {
                    bins = [0].concat(bins);
                }
            }
            console.log(`bins: ${JSON.stringify(bins)}`);
            if (bins.length !== +this.selectedBins) {
                let chosenBins = +this.selectedBins;
                this.$timeout(() => {
                    this.$messageBus.notify('Opmerking', `Het aantal van ${chosenBins} levert geen mooie verdeling op en wordt daarom gewijzigd naar ${bins.length}`, csComp.Services.NotifyLocation.TopBar, csComp.Services.NotifyType.Info, 2000);
                    this.selectedBins === bins.length.toFixed(0);
                }, 0);
            }
            this.selectedBins = bins.length.toFixed(0);
            let rankLegend = this.createLegendEntries(rankPType, bins);
            rankPType.legend = rankLegend;
            this.$layerService.addPropertyType(rankPType, true);
            let gs = new csComp.Services.GroupStyle(this.$translate);
            gs.id = csComp.Helpers.getGuid();
            gs.title = rankPType.title;
            gs.visualAspect = 'fillColor';
            gs.canSelectColor = gs.visualAspect.toLowerCase().indexOf('color') > -1;
            gs.property = rankProp;
            gs.info = pInfo;
            gs.fixedColorRange = true;
            gs.enabled = true;
            gs.group = l.group;
            gs.activeLegend = rankLegend;
            gs.legends[rankPType.title] = gs.activeLegend;
            let dummy = {
                feature: {
                    featureTypeName: l.url + '#' + rankProp,
                    layer: l
                },
                property: rankProp,
                key: rankProp
            }
            this.$layerService.project.features.forEach((f) => {
                if (!f.fType || f.fType.name !== 'gemeente') return;
                if (!f.properties.hasOwnProperty(this.selectedProp)) return;
                f.properties[rankProp] = f.properties[this.selectedProp];
            });
            this.$layerService.setStyle(dummy, false, pInfo, gs);
            this.$scope.activeLegend = gs.activeLegend;
            this.$scope.activeStyleGroup = gs.group;
            // this.$scope.activeStyleProperty = null;
            this.$scope.activeStyleProperty = rankPType;
            console.log(`Created legend for ${rankProp}`);
            // var propType = this.$layerService.findPropertyTypeById(this.$scope.layer.typeUrl + '#' + gf.property);
            // this.$layerService.setGroupStyle(this.$scope.style.group, propType);
        }

        private createLegendEntries(pType: csComp.Services.IPropertyType, bins: number[]): csComp.Services.Legend {
            let colorscale = chroma.scale(['#f7f7ff', '#7caeff', '#001575']).mode('lab').domain([0, bins.length - 1]);
            let leg = new csComp.Services.Legend();
            let stringFmt = pType.stringFormat || '{0:#,#.###}';
            leg.id = `_rank_${this.selectedProp}`;
            leg.description = pType.title;
            leg.legendKind = 'discrete';
            leg.legendEntries = [];
            leg.defaultLabel = 'onbekend';
            leg.visualAspect = 'fillColor';
            for (var c = 0; c < +this.selectedBins; c++) {
                let le = new csComp.Services.LegendEntry();
                le.color = colorscale(c).hex();
                le.sortKey = String.fromCharCode(65 + c);
                if (c === (+this.selectedBins - 1)) {
                    le.label = `>= ${String.format(stringFmt, bins[c])}`;
                    le.interval = {
                        min: bins[c],
                        max: Infinity
                    };
                } else if (c === 0) {
                    le.label = `< ${String.format(stringFmt, bins[c + 1])}`;
                    le.interval = {
                        min: -Infinity,
                        max: bins[c + 1]
                    };
                } else {
                    le.label = `${String.format(stringFmt, bins[c])} - ${String.format(stringFmt, bins[c + 1])}`;
                    le.interval = {
                        min: bins[c],
                        max: bins[c + 1]
                    };
                }
                leg.legendEntries.push(le);
            }
            return leg;
        }

        public toggleFilter(legend: csComp.Services.Legend, le: csComp.Services.LegendEntry) {
            if (!legend || !le) return;
            var projGroup = this.$scope.activeStyleGroup;
            var property = this.$scope.activeStyleProperty;
            if (!projGroup || !property) return;
            //Check if filter already exists. If so, remove it.
            var exists: boolean = projGroup.filters.some((f: csComp.Services.GroupFilter) => {
                if (f.property === property.label) {
                    this.$layerService.removeFilter(f);
                    return true;
                }
            });
            if (!exists) {
                var gf = new csComp.Services.GroupFilter();
                gf.property = property.label;//prop.split('#').pop();
                gf.id = 'buttonwidget_filter';
                gf.group = projGroup;
                gf.filterType = 'row';
                gf.title = property.title;
                gf.rangex = [le.interval.min, le.interval.max];
                gf.filterLabel = le.label;
                console.log('Setting filter');
                this.$layerService.rebuildFilters(projGroup);
                projGroup.filters = projGroup.filters.filter((f) => { return f.id !== gf.id; });
                this.$layerService.setFilter(gf, projGroup);
            }
        }
    }
}