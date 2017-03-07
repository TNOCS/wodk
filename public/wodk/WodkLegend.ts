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
                this.parentWidget.parent().collapse('hide');
            } else {
                this.parentWidget.hide();
            }
        }

        private show() {
            if (this.parentWidget.hasClass('collapse')) {
                this.parentWidget.parent().collapse('show');
            } else {
                this.parentWidget.show();
            }
        }

        private selectProp() {
            let l = this.$scope.activeStyleGroup.layers[0] || new csComp.Services.ProjectLayer();
            this.$layerService.setStyleForProperty(l, this.$scope.activeStyleProperty);
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
                    if (this.$scope.$root.$$phase !== '$apply' && this.$scope.$root.$$phase !== '$digest') {
                        this.$scope.$apply();
                    }
            }
        }
    }
}