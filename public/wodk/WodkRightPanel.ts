module WodkRightPanel {
    /** Config */
    var moduleName = 'csComp';

    /** Module */
    export var myModule;
    try {
        myModule = angular.module(moduleName);
    } catch (err) {
        // named module does not exist, so create one
        myModule = angular.module(moduleName, []);
    }

    /** Directive to send a message to a REST endpoint. Similar in goal to the Chrome plugin POSTMAN. */
    myModule.directive('wodkrightpanel', [function (): ng.IDirective {
        return {
            restrict: 'E', // E = elements, other options are A=attributes and C=classes
            scope: {}, // isolated scope, separated from parent. Is however empty, as this directive is self contained by using the messagebus.
            templateUrl: 'wodk/WodkRightPanel.tpl.html',
            replace: true, // Remove the directive from the DOM
            transclude: false, // Add elements and attributes to the template
            controller: WodkRightPanelCtrl
        };
    }]);

    export interface IWodkRightPanelScope extends ng.IScope {
        vm: WodkRightPanelCtrl;
        data: any;
    }

    export interface IWodkRightPanel {
        id: string;
        name: string;
    }

    export class WodkRightPanelCtrl {

        private placesAutocomplete;
        private propertyTable: PropertyTable;
        private selectedItems: IFeature[];
        private mBusHandles: csComp.Services.MessageBusHandle[] = [];

        public static $inject = [
            '$scope',
            '$http',
            'layerService',
            'messageBusService',
            'actionService',
            '$timeout',
            '$translate',
            '$sce',
            '$uibModal',
            'wodkWidgetSvc'
        ];

        constructor(
            private $scope: IWodkRightPanelScope,
            private $http: ng.IHttpService,
            public layerService: csComp.Services.LayerService,
            private messageBusService: csComp.Services.MessageBusService,
            private actionService: csComp.Services.ActionService,
            private $timeout: ng.ITimeoutService,
            private $translate: ng.translate.ITranslateService,
            private $sce: ng.ISCEService,
            private $uibModal: ng.ui.bootstrap.IModalService,
            private wodkWidgetSvc: wodk.WODKWidgetSvc
        ) {
            $scope.vm = this;

            var par = < any > $scope.$parent;
            if (par.widget) {
                $scope.data = < any > par.widget.data;
            } else {
                $scope.data = < any > par.data;
            }

            this.mBusHandles.push(this.messageBusService.subscribe('feature', (title, f) => {
                this.featureMessageReceived(title, f);
            }));

            this.propertyTable = new PropertyTable(this.layerService, this.$timeout, this.$http);

            this.init();
        }

        public init() {
            this.placesAutocomplete = (( < any > window).places)({
                container: document.querySelector('#search-address-rp'),
                countries: ['nl'],
                autocompleteOptions: {
                    minLength: 3,
                    openOnFocus: true,
                    dropdownMenuContainer: document.querySelector('#search-suggestions-rp')
                }
            });

            this.placesAutocomplete.on('change', (e) => {
                console.log(e.dataset, e.suggestion);
                this.selectLocation(e.suggestion, e.dataset);
            });

            this.placesAutocomplete.on('suggestions', (e) => {
                // console.log(e.suggestions);
            });

            this.placesAutocomplete.on('limit', (e) => {
                console.log(e.message);
                this.messageBusService.notifyError('Limiet bereikt', `De limiet voor de adressen-zoekfunctie is bereikt. ${e.message}`);
            });

            this.placesAutocomplete.on('error', (e) => {
                console.log(e.message);
            });

            this.selectedItems = this.wodkWidgetSvc.getSelectionHistory();
            this.selectFeature(this.layerService.lastSelectedFeature);
        }

        private selectLocation(loc: wodk.IPlacesResult, dataset: string) {
            if (!loc || _.isEmpty(loc)) return;
            if (dataset && dataset === 'buurten') {
                loc.type = 'buurt';
                loc.name = loc.bu_naam;
                loc.administrative = loc.gm_naam;
                loc.latlng = {
                    lng: 0,
                    lat: 0
                };
            }
            this.messageBusService.publish('wodk', 'address', loc);
            this.placesAutocomplete.close();
        }

        private selectFeature(f: IFeature) {
            if (!f || _.isEmpty(f)) return;
            this.propertyTable.displayFeature(f);
            this.updateSearchInput();
        }

        private updateSearchInput() {
            let lastPlace: wodk.IAddressResult = this.wodkWidgetSvc.lastLoadedAddress;
            if (lastPlace) {
                this.placesAutocomplete.setVal(`${lastPlace.name}, ${lastPlace.administrative}`);
                this.placesAutocomplete.autocomplete.pin.style.display = 'none';
                this.placesAutocomplete.autocomplete.clear.style.display = '';
            }
        }

        private featureMessageReceived(title: string, f: IFeature): void {
            switch (title) {
                case 'onFeatureDeselect':
                    break;
                case 'onFeatureSelect':
                    this.selectFeature(f);
                    this.selectedItems = this.wodkWidgetSvc.getSelectionHistory();
                    break;
            };
        }

        private selectItem(item: IFeature) {
            this.propertyTable.displayFeature(item);
        }

        private removeItem(item: IFeature) {
            this.wodkWidgetSvc.removeItem(item);
        }

        private compareItems() {
            this.close();
            this.messageBusService.publish('wodk', 'closenavbar');
            var modalInstance = this.$uibModal.open({
                templateUrl: 'wodk/WodkCompareModal.tpl.html',
                size: 'lg',
                controller: 'CompareModalCtrl',
                resolve: {
                    features: () => this.selectedItems
                }
            });

            modalInstance.result.then(() => { }, () => {
                console.log('Modal dismissed at: ' + new Date());
            });
        }

        public publish(msg: string, data ? : any) {
            this.messageBusService.publish('wodk', msg, data);
        }

        public close() {
            this.$timeout(() => {
                this.layerService.visual.rightPanelVisible = false;
            }, 0);
        }
    }
}