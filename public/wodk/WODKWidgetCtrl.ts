module wodk {
    export class WODKWidgetData {
        title: string;
        dynamicProperties: string[];
        content: string;
        mdText: string;
        url: string;
        fileName: string;
    }

    export interface IWODKWidgetScope extends ng.IScope {
        vm: WODKWidgetCtrl;
        data: WODKWidgetData;
        style: csComp.Services.GroupStyle;
        filter: csComp.Services.GroupFilter;
        minimized: boolean;
        selectedFeature: csComp.Services.IFeature;
        lastSelectedName: string;
    }

    export class WODKWidgetCtrl {
        private scope: IWODKWidgetScope;
        private widget: csComp.Services.IWidget;
        private parentWidget: JQuery;
        private mBusHandles: csComp.Services.MessageBusHandle[] = [];
        private exporterAvailable: boolean;
        private buurtFilterDim: any;
        private buurtFilterVal: number;

        public static $inject = [
            '$scope',
            '$timeout',
            '$translate',
            '$http',
            'layerService',
            'messageBusService',
            'mapService',
            'wodkWidgetSvc'
        ];

        constructor(
            private $scope: IWODKWidgetScope,
            private $timeout: ng.ITimeoutService,
            private $translate: ng.translate.ITranslateService,
            private $http: ng.IHttpService,
            private $layerService: csComp.Services.LayerService,
            private $messageBus: csComp.Services.MessageBusService,
            private $mapService: csComp.Services.MapService,
            private wodkWidgetSvc: wodk.WODKWidgetSvc
        ) {
            $scope.vm = this;
            var par = <any>$scope.$parent;
            this.widget = par.widget;
            this.parentWidget = $("#" + this.widget.elementId).parent();

            $scope.data = <WODKWidgetData>this.widget.data;
            $scope.minimized = false;

            if ((<any>window).document) {
                this.exporterAvailable = true;
            } else {
                this.exporterAvailable = false;
            }

            if (!(typeof $scope.data.url === 'undefined')) {
                $.get($scope.data.url, (md) => {
                    $timeout(() => {
                        $scope.data.content = $scope.data.mdText = md;
                    }, 0);
                });
            }

            this.mBusHandles.push(this.$messageBus.subscribe('feature', (action: string, feature: csComp.Services.IFeature) => {
                switch (action) {
                    case 'onFeatureDeselect':
                    case 'onFeatureSelect':
                    case 'onUpdateWidgets':
                        this.selectFeature(feature);
                        break;
                    default:
                        break;
                }
            }));

            this.parentWidget.hide();

            this.mBusHandles.push(this.$messageBus.subscribe('layer', (title, l: csComp.Services.ProjectLayer) => {
                if (title === 'activated') {
                    if ($scope.filter && $scope.filter.group && $scope.filter.group.id) {
                        let g = this.$layerService.findGroupByLayerId(l);
                        if (g && g.id === $scope.filter.group.id) {
                            this.updateChart();
                        }
                    }
                }
            }));

            this.mBusHandles.push(this.$messageBus.subscribe('updatelegend', (title, gs: csComp.Services.GroupStyle) => {
                switch (title) {
                    case 'hidelegend':
                        this.close();
                        break;
                    default:
                        if (gs && !(gs.activeLegend && gs.activeLegend.id.indexOf('_rank') === 0)) {
                            delete $scope.filter;
                            $scope.style = gs;
                            this.createChart();
                        }
                        break;
                }
            }));

            this.mBusHandles.push(this.$messageBus.subscribe('wodk', (title, value: any) => {
                switch (title) {
                    case 'city':
                        if (!value) return;
                        this.selectCity(value);
                        break;
                    case 'filter':
                        if (!value && value !== 0) return;
                        (this.buurtFilterDim ? this.buurtFilterDim.dispose() : null);
                        this.buurtFilterDim = null;                      
                        this.addBuurtFilter(value);
                        break;
                    case 'back':
                        this.wodkWidgetSvc.stepBack();
                        break;
                    case 'forward':
                        this.wodkWidgetSvc.stepForward();
                        break;
                    case 'refresh':
                        this.wodkWidgetSvc.clearHistory();
                        this.$layerService.actionService.execute('reload project');
                        break;
                    case 'home':
                        location.href = "http://www.zorgopdekaart.nl";
                        break;
                    case 'address':
                        this.wodkWidgetSvc.loadAddress(value);
                        break;
                    default:
                        break;
                }
            }));
        }

        private canMinimize() {
            return (this.$scope.data.hasOwnProperty('canMinimize'))
                ? this.$scope.data['canMinimize']
                : true;
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
            return (this.$scope.data.hasOwnProperty('canClose'))
                ? this.$scope.data['canClose']
                : true;
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

        private addBuurtFilter(minSize: number) {
            var layer = this.$layerService.findLoadedLayer('bagbuurten');
            if (!layer) {
                return;
            }
            if (layer.group.ndx) {
                layer.group.ndx.remove();
            }
            layer.group.ndx = crossfilter([]);
            layer.group.ndx.add(_.map(layer.group.markers, (item: any, key) => { return item.feature; }));
            // dc.filterAll();
            this.buurtFilterVal = minSize;
            var propId = 'data/resourceTypes/Buurt.json#ster_totaal';
            var p = this.$layerService.findPropertyTypeById(propId);
            var propLabel = propId.split('#').pop();
            if (layer.group && layer.group.ndx && !this.buurtFilterDim) {
                this.buurtFilterDim = layer.group.ndx.dimension(d => {
                    if (!d.properties.hasOwnProperty(propLabel)) return null;
                    let prop = d.properties[propLabel];
                    if (prop === null || prop === undefined || isNaN(prop)) return null;
                    return prop;
                });
            }
            this.applyFilter(this.buurtFilterVal, layer.group);
        }

        private applyFilter( filterValue, group) {
            console.log('Apply buurtfilter');
            if (filterValue === null || filterValue === undefined || isNaN(filterValue)) return;
            if (!this.buurtFilterDim) return;
            if (filterValue > 0) {
                this.buurtFilterDim.filter([filterValue, Infinity]);
            } else {
                this.buurtFilterDim.filterAll();
            }
            group.filterResult = this.buurtFilterDim.top(Infinity);
            this.$timeout(() => {
                this.updateRowVisualizerScope(this.$scope.filter);
                this.updateRowFilterScope(this.$scope.filter);
            });
            // this.$messageBus.publish('filters', 'updateGroup', group.id);
        }

        private selectCity(name: string) {
            var foundFeature: csComp.Services.IFeature = this.findFeatureByBestMatchingPropertyValue('Name', name);
            if (foundFeature) {
                if (foundFeature.geometry.type.toLowerCase() !== 'point') {
                    this.wodkWidgetSvc.zoomNextFeatureFlag = true;
                    this.$layerService.selectFeature(foundFeature);
                } else {
                    // City is already selected, only zoom to it
                    this.$mapService.getMap().flyTo(new L.LatLng(foundFeature.geometry.coordinates[1], foundFeature.geometry.coordinates[0]));
                }
            }
        }

        public findFeatureByBestMatchingPropertyValue(property: string, value: string): IFeature {
            var fts = this.$layerService.project.features;
            var maxScore = -1;
            var bestMatch;
            fts.forEach((f: IFeature) => {
                if (f.properties.hasOwnProperty(property) && typeof f.properties[property] === 'string') {
                    var score = value.score(f.properties[property]);
                    if (score > maxScore && f.fType.name === 'gemeente') {
                        maxScore = score;
                        bestMatch = f;
                    }
                }
            });
            return bestMatch;
        }

        private selectFeature(feature: csComp.Services.IFeature) {
            if (!feature || !feature.isSelected || feature.layerId === 'bagcontouren') {
                return;
            }
            this.$timeout(() => {
                var md = this.$scope.data.content;
                var i = 0;
                if (!this.$scope.data.dynamicProperties) return;
                this.$scope.data.dynamicProperties.forEach(p => {
                    var searchPattern = '{{' + i++ + '}}';
                    var displayText = '';
                    if (feature.properties.hasOwnProperty(p)) {
                        var pt = this.$layerService.getPropertyType(feature, p);
                        displayText = csComp.Helpers.convertPropertyInfo(pt, feature.properties[p]);
                    }
                    md = this.replaceAll(md, searchPattern, displayText);
                });
                this.wodkWidgetSvc.setLastSelectedName(feature.properties['Name']);
                this.parentWidget.show();
                this.$scope.data.mdText = md;
                if (feature.properties.hasOwnProperty('bu_code')) {
                    this.getSets(feature.properties['bu_code'], (set) => {
                        this.$scope.data.fileName = `LZW set ${set.s}.pdf#page=${set.p}`;
                    });
                } else if (feature.properties.hasOwnProperty('GM_CODE')) {
                    this.getSets(feature.properties['GM_CODE'], (set) => {
                        this.$scope.data.fileName = `LZW set ${set.s}.pdf#page=${set.p}`;
                    });
                } else {
                    this.$scope.data.fileName = null;
                }
                if (feature.geometry.type.toLowerCase() === 'point') {
                    this.updateChart();
                }
            }, 0);
        }

        private escapeRegExp(str: string) {
            return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
        }

        private replaceAll(str: string, find: string, replace: string) {
            return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
        }

        private createChart() {
            console.log(`Create chart ${this.widget.id}`);
            var gf = new csComp.Services.GroupFilter();
            gf.property = this.$scope.style.property;
            gf.id = this.widget.id;
            gf.group = this.$scope.style.group;
            if (gf.group.ndx) {
                gf.group.ndx.remove();
            }
            gf.group.ndx = crossfilter([]);
            gf.group.ndx.add(_.map(gf.group.markers, (item: any, key) => { return item.feature; }));
            gf.title = this.$scope.style.title;
            gf.filterLabel = null;
            gf.filterType = 'row';
            this.$layerService.removeAllFilters(gf.group);
            gf.group.filters.push(gf);
            this.$timeout(() => {
                this.$scope.filter = gf;
                this.$scope.filter.showInWidget = true;
            });
            this.$timeout(() => {
                this.updateRowVisualizerScope(gf);
                this.updateRowFilterScope(gf);
            });
            this.parentWidget.show();
            if (gf.group.id === "buurten") {
                (this.buurtFilterDim ? this.buurtFilterDim.dispose() : null);
                this.buurtFilterDim = null;
                this.addBuurtFilter(this.buurtFilterVal);
            }
            // var propType = this.$layerService.findPropertyTypeById(this.$scope.layer.typeUrl + '#' + gf.property);
            // this.$layerService.setGroupStyle(this.$scope.style.group, propType);
        }

        private updateChart() {
            // this.$scope.filter.group.ndx = crossfilter([]);
            // this.$scope.filter.group.ndx.add(_.map(this.$scope.filter.group.markers, (item: any, key) => { return item.feature; }));
            this.$timeout(() => {
                this.updateRowVisualizerScope(this.$scope.filter);
                this.updateRowFilterScope(this.$scope.filter);
            });
        }

        private updateRowFilterScope(gf: csComp.Services.GroupFilter) {
            if (!gf || !gf.group) {
                console.log('No filter provided.');
                return;
            }
            var rowFilterElm = angular.element($("#filter_" + this.widget.id));
            if (!rowFilterElm) {
                console.log('rowFilterElm not found.');
                return;
            }
            var rowFilterScope = <Filters.IRowFilterScope>rowFilterElm.scope();
            if (!rowFilterScope) {
                console.log('rowFilterScope not found.');
                return;
            } else {
                rowFilterScope.filter = gf;
                rowFilterScope.vm.initRowFilter();
                return;
            }
        }

        private updateRowVisualizerScope(gf: csComp.Services.GroupFilter) {
            if (!gf || !gf.group) {
                console.log('No visualizer provided.');
                return;
            }
            var rowFilterElm = angular.element($('#visualizer_' + this.widget.id));
            if (!rowFilterElm) {
                console.log('rowVisualizerElm not found.');
                return;
            }
            var rowFilterScope = <wodk.IRowVisualizerScope>rowFilterElm.scope();
            if (!rowFilterScope) {
                console.log('rowVisualizerScope not found.');
                return;
            } else {
                rowFilterScope.filter = gf;
                rowFilterScope.vm.initRowVisualizer();
                return;
            }
        }

        private getHTML(id: string) {
               var content = `<html><head>`;
               $.each(document.getElementsByTagName('link'), (ind: number, val: HTMLLinkElement) => { content += val.outerHTML; });
               $.each(document.getElementsByTagName('script'), (ind: number, val: HTMLLinkElement) => { content += val.outerHTML; });
               content += `</head><body>`;                       
               content += $(id).parent().parent().prop('outerHTML');
               content += `</body></html>`;
               return content;
        }

        private getDimensions(id: string) {
            let dom = $(id).parent().parent();
            let w = dom.outerWidth(true);
            let h = dom.outerHeight(true);
            return {width: w, height: h};
        }

        public exportToImage(id: string) {
            let dim = this.getDimensions('#' + id);
            this.$http({
                method: 'POST',
                url: "screenshot",
                data: { html: this.getHTML('#' + id), width: dim.width, height: dim.height, topOffset: 100 },
            }).then((response) => {
                csComp.Helpers.saveImage(response.data.toString(), 'Woningaanpassingen screenshot', 'png', true);
            }, (error) => {
                console.log(error);
            });
            console.log('Screenshot command sent');
            this.$messageBus.notifyWithTranslation('IMAGE_REQUESTED', 'IMAGE_WILL_APPEAR');
        }

        private getSets(query, cb: Function) {
            this.$http.get(`http://www.zorgopdekaart.nl/bagwoningen/public/findlzwset/${query}`)
                .then((res) => {
                    cb(res.data);
                })
                .catch(() => {
                    console.log('Find lzw set');
                    cb();
                });
        }
}}
