module wodk {
    export class WODKWidgetData {
        title: string;
        dynamicProperties: string[];
        content: string;
        mdText: string;
        url: string;
    }

    export interface IWODKWidgetScope extends ng.IScope {
        vm: WODKWidgetCtrl;
        data: WODKWidgetData;
        style: csComp.Services.GroupStyle;
        filter: csComp.Services.GroupFilter;
        minimized: boolean;
        selectedFeature: csComp.Services.IFeature;
    }

    export class WODKWidgetCtrl {
        private scope: IWODKWidgetScope;
        private widget: csComp.Services.IWidget;
        private parentWidget: JQuery;
        private mBusHandles: csComp.Services.MessageBusHandle[] = [];
        private exporterAvailable: boolean;

        public static $inject = [
            '$scope',
            '$timeout',
            '$translate',
            'layerService',
            'messageBusService',
            'mapService',
            'wodkWidgetSvc'
        ];

        constructor(
            private $scope: IWODKWidgetScope,
            private $timeout: ng.ITimeoutService,
            private $translate: ng.translate.ITranslateService,
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

            if ((<any>window).canvg) {
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
                        this.selectFeature(feature);
                        break;
                    default:
                        break;
                }
            }));

            this.parentWidget.hide();

            this.mBusHandles.push(this.$messageBus.subscribe('layer', (title, l: csComp.Services.ProjectLayer) => {
                if (title === 'activated') {
                    if ($scope.filter) {
                        this.updateChart();
                    }
                }
            }));

            this.mBusHandles.push(this.$messageBus.subscribe('updatelegend', (title, gs: csComp.Services.GroupStyle) => {
                switch (title) {
                    case 'hidelegend':
                        this.close();
                        break;
                    default:
                        if (gs) {
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
                        this.addBuurtFilter(value);
                        break;
                    case 'back':
                        this.wodkWidgetSvc.stepBack();
                        break;
                    case 'forward':
                        this.wodkWidgetSvc.stepForward();
                        break;
                    case 'refresh':
                        this.$layerService.actionService.execute('reload project');
                        break;
                    case 'home':
                        location.href = "http://www.zorgopdekaart.nl";
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
            var propId = 'data/resourceTypes/Buurt.json#ster_totaal';
            var layer = this.$layerService.findLoadedLayer('bagbuurten');
            if (!layer) return;
            var p = this.$layerService.findPropertyTypeById(propId);
            var propLabel = propId.split('#').pop();
            var filterDim;
            if (layer.group.ndx) {
                filterDim = layer.group.ndx.dimension(d => {
                    if (!d.properties.hasOwnProperty(propLabel)) return null;
                    let prop = d.properties[propLabel];
                    if (prop === null || prop === undefined || isNaN(prop)) return null;
                    return prop;
                });
                this.applyFilter(filterDim, minSize, layer.group);
            }
        }

        private applyFilter(filterDim, filterValue, group) {
            if (filterValue === null || filterValue === undefined || isNaN(filterValue)) return;
            if (!filterDim) return;
            if (filterValue > 0) {
                filterDim.filter([filterValue, Infinity]);
            } else {
                filterDim.filterAll();
            }
            //group.filterResult = filterDim.top(Infinity);
            this.$messageBus.publish('filters', 'updateGroup', group.id);
            // this.$layerService.updateMapFilter(this.group);
        }

        private selectCity(name: string) {
            var foundFeature: csComp.Services.IFeature = this.findFeatureByBestMatchingPropertyValue('Name', name);
            if (foundFeature) {
                this.$layerService.selectFeature(foundFeature);
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
            if (!feature || !feature.isSelected || feature.fType.name === 'BagPanden') {
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
                this.parentWidget.show();
                this.$scope.data.mdText = md;
            }, 0);
        }

        private escapeRegExp(str: string) {
            return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
        }

        private replaceAll(str: string, find: string, replace: string) {
            return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
        }

        private createChart() {
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
            gf.group.filters = [];
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
            // var propType = this.$layerService.findPropertyTypeById(this.$scope.layer.typeUrl + '#' + gf.property);
            // this.$layerService.setGroupStyle(this.$scope.style.group, propType);
        }

        private updateChart() {
            this.$scope.filter.group.ndx = crossfilter([]);
            this.$scope.filter.group.ndx.add(_.map(this.$scope.filter.group.markers, (item: any, key) => { return item.feature; }));
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
            var rowFilterElm = angular.element($("#visualizer_" + this.widget.id));
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

        public exportToImage() {
            var canvg = (<any>window).canvg || undefined;
            if (!canvg) return;
            var svg = new XMLSerializer().serializeToString(document.getElementById("visualizer_" + this.widget.id).firstChild);
            var canvas = document.createElement('canvas');
            document.body.appendChild(canvas);
            canvg(canvas, svg, {
                renderCallback: () => {
                    var img = canvas.toDataURL("image/png");
                    var fileName = this.$scope.filter.title || 'rowfilter-export';
                    csComp.Helpers.saveImage(img, fileName + '.png', 'png');
                    canvas.parentElement.removeChild(canvas);
                }
            });
        }
    }
}
