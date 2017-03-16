module wodk {
    /**
     * Config
     */
    var moduleName = 'csComp';

    /**
     * Module
     */
    export var myModule;
    try {
        myModule = angular.module(moduleName);
    } catch (err) {
        // named module does not exist, so create one
        myModule = angular.module(moduleName, []);
    }

    /**
     * Directive to display the available map layers.
     */
    myModule.directive('wodklegend', [function (): ng.IDirective {
        return {
            restrict: 'E', // E = elements, other options are A=attributes and C=classes
            scope: {}, // isolated scope, separated from parent. Is however empty, as this directive is self contained by using the messagebus.
            templateUrl: 'wodk/WodkLegend.tpl.html',
            replace: true, // Remove the directive from the DOM
            transclude: false, // Add elements and attributes to the template
            controller: WodkLegendCtrl
        }
    }]);

    export class WodkLegendData {
        title: string;
        rankingProperties: Dictionary < string > ;
        bins: number;
        layerId: string;
        hint: string;
    }

    export interface IWodkLegendScope extends ng.IScope {
        vm: WodkLegendCtrl;
        data: WodkLegendData;
        style: csComp.Services.GroupStyle;
        filter: csComp.Services.GroupFilter;
        minimized: boolean;
        selectedFeature: csComp.Services.IFeature;
        activeLegend: csComp.Services.Legend;
        activeStyleGroup: csComp.Services.ProjectGroup;
        activeStyleProperty: string;
    }

    export class WodkLegendCtrl {
        private scope: IWodkLegendScope;
        private widget: csComp.Services.IWidget;
        private parentWidget: JQuery;
        private mBusHandles: csComp.Services.MessageBusHandle[] = [];
        private exporterAvailable: boolean;
        private selectedProp: csComp.Services.IPropertyType;
        private selectedBins: string;
        private selectableProps: csComp.Services.IPropertyType[] = [];
        private layer: csComp.Services.ProjectLayer;
        private filterValue: number = 0;
        private filterDim: any;

        public static $inject = [
            '$scope',
            '$timeout',
            '$translate',
            'layerService',
            'messageBusService',
            'mapService'
        ];

        constructor(
            private $scope: IWodkLegendScope,
            private $timeout: ng.ITimeoutService,
            private $translate: ng.translate.ITranslateService,
            private $layerService: csComp.Services.LayerService,
            private $messageBus: csComp.Services.MessageBusService,
            private $mapService: csComp.Services.MapService
        ) {
            $scope.vm = this;
            var par = < any > $scope.$parent;
            this.widget = par.widget;
            this.parentWidget = $(`#${this.widget.elementId}-parent`);

            $scope.data = < WodkLegendData > this.widget.data;
            $scope.minimized = false;

            this.mBusHandles.push(this.$messageBus.subscribe('updatelegend', (title: string, data: any) => {
                this.handleLegendUpdate(title, data);
            }));

            this.mBusHandles.push(this.$messageBus.subscribe('wodk', (title, data: any) => {
                this.handleWodkUpdate(title, data);
            }));

            this.init();

            if (this.$layerService.$rootScope.$$phase !== '$apply' && this.$layerService.$rootScope.$$phase !== '$digest') {
                this.$layerService.$rootScope.$apply();
            }
        }

        private init() {
            let dummyProp = {
                title: '- Geen kleuren -'
            };
            this.selectableProps.push(dummyProp);
            if (this.$scope.data && this.$scope.data.rankingProperties) {
                _.each(this.$scope.data.rankingProperties, (p) => {
                    let property = this.$layerService.propertyTypeData[p];
                    if (property) {
                        this.selectableProps.push(property);
                    }
                });
            }
            this.$scope.activeStyleProperty = null;
        }

        private minimize() {
            this.$scope.minimized = !this.$scope.minimized;
            if (this.$scope.minimized) {
                this.parentWidget.css('height', '30px');
            } else {
                this.parentWidget.css('height', this.widget.height);
            }
        }

        private canClose() {
            return (this.$scope.data.hasOwnProperty('canClose')) ?
                this.$scope.data['canClose'] :
                true;
        }

        private close() {
            this.hide();
        }

        public stop() {
            if (this.mBusHandles && this.mBusHandles.length > 0) {
                this.mBusHandles.forEach((mbh) => {
                    this.$messageBus.unsubscribe(mbh);
                });
            }
        }

        private hide() {
            if (this.parentWidget.hasClass('collapse')) {
                this.parentWidget.collapse('hide');
            } else {
                this.parentWidget.hide();
            }
        }

        private show() {
            if (this.parentWidget.hasClass('collapse')) {
                this.parentWidget.collapse('show');
            } else {
                this.parentWidget.show();
            }
        }

        private selectFilter = _.debounce(this.selectFilterDebounced, 750);

        private selectFilterDebounced() {
            this.$messageBus.publish('wodk', 'filter', +this.filterValue);
        }

        private selectProp() {
            let l = this.$scope.activeStyleGroup.layers[0] || new csComp.Services.ProjectLayer();
            this.$layerService.setStyleForProperty(l, this.$scope.activeStyleProperty);
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
            gf.group.ndx.add(_.map(gf.group.markers, (item: any, key) => {
                return item.feature;
            }));
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
                this.updateRowFilterScope(gf);
            });
            this.parentWidget.show();
            if (gf.group.id === 'buurten') {
                (this.filterDim ? this.filterDim.dispose() : null);
                this.filterDim = null;
                this.addBuurtFilter(this.filterValue);
            }
            // var propType = this.$layerService.findPropertyTypeById(this.$scope.layer.typeUrl + '#' + gf.property);
            // this.$layerService.setGroupStyle(this.$scope.style.group, propType);
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
            layer.group.ndx.add(_.map(layer.group.markers, (item: any, key) => {
                return item.feature;
            }));
            // dc.filterAll();
            this.filterValue = minSize;
            var propId = 'data/resourceTypes/Buurt.json#ster_totaal';
            var p = this.$layerService.findPropertyTypeById(propId);
            var propLabel = propId.split('#').pop();
            if (layer.group && layer.group.ndx && !this.filterDim) {
                this.filterDim = layer.group.ndx.dimension(d => {
                    if (!d.properties.hasOwnProperty(propLabel)) return null;
                    let prop = d.properties[propLabel];
                    if (prop === null || prop === undefined || isNaN(prop)) return null;
                    return prop;
                });
            }
            this.applyFilter(this.filterValue, layer.group);
        }

        private applyFilter(filterValue, group) {
            console.log('Apply buurtfilter');
            if (filterValue === null || filterValue === undefined || isNaN(filterValue)) return;
            if (!this.filterDim) return;
            if (filterValue > 0) {
                this.filterDim.filter([filterValue, Infinity]);
            } else {
                this.filterDim.filterAll();
            }
            group.filterResult = this.filterDim.top(Infinity);
            this.$timeout(() => {
            //     this.updateRowVisualizerScope(this.$scope.filter);
                this.updateRowFilterScope(this.$scope.filter);
            });
            // this.$messageBus.publish('filters', 'updateGroup', group.id);
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
            var rowFilterScope = < Filters.IRowFilterScope > rowFilterElm.scope();
            if (!rowFilterScope) {
                console.log('rowFilterScope not found.');
                return;
            } else {
                rowFilterScope.filter = gf;
                rowFilterScope.vm.initRowFilter();
                return;
            }
        }

        private handleLegendUpdate(title: string, data ? : any) {
            switch (title) {
                case 'removelegend':
                    break;
                case 'hidelegend':
                    this.hide();
                    break;
                default:
                    this.show();
                    if (data && data.activeLegend) {
                        this.$scope.activeLegend = data.activeLegend;
                        this.$scope.activeStyleGroup = data.group;
                        this.$scope.activeStyleProperty = data.property;
                    }
                    if (data && !(data.activeLegend && data.activeLegend.id.indexOf('_rank') === 0)) {
                        delete this.$scope.filter;
                        this.$scope.style = data;
                    }
                    if (this.$scope.$root.$$phase !== '$apply' && this.$scope.$root.$$phase !== '$digest') {
                        this.$scope.$apply();
                    }
            }
        }

        private handleWodkUpdate(title: string, data ? : any) {
            switch (title) {
                case 'filter':
                    if (!data && data !== 0) return;
                    (this.filterDim ? this.filterDim.dispose() : null);
                    this.filterDim = null;
                    if (this.$scope.filter) {
                        this.addBuurtFilter(data);
                    } else {
                        this.createChart();
                    }
                    break;
                default:
                    break;
            }
        }
    }
}