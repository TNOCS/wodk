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
        private lastSelectedName: string;

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

            this.mBusHandles.push(this.messageBusService.subscribe('wodk', (title, f) => {
                this.wodkMessageReceived(title);
            }));

            this.propertyTable = new PropertyTable(this.wodkWidgetSvc, this.layerService, this.$timeout);

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
                this.placesAutocomplete.close();
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

            $('#search-address-rp').on('blur', () => {
                this.placesAutocomplete.close();
            });

            // this.selectedItems = this.wodkWidgetSvc.getSelectionHistoryOfLastSelectedType();
            // this.selectFeature((this.selectedItems.length > 0) ? this.selectedItems : [this.layerService.lastSelectedFeature]);
        }

        private selectLocation(loc: wodk.IPlacesResult, dataset: string) {
            if (!loc || _.isEmpty(loc)) return;
            if (dataset && dataset === 'buurten') {
                if (loc.gm_naam === 'provincie') {
                    let provLayer = this.layerService.findLoadedLayer('provincie');
                    if (!provLayer) return;
                    let f = this.layerService.findFeatureByName(loc.bu_naam);
                    if (f) this.layerService.selectFeature(f);
                    return;
                } else {
                    loc.type = 'buurt';
                    loc.name = loc.bu_naam;
                    loc.administrative = loc.gm_naam;
                    loc.latlng = {
                        lng: 0,
                        lat: 0
                    };
                }
            }
            this.messageBusService.publish('wodk', 'address', loc);
            this.placesAutocomplete.close();
        }

        private selectFeature(fts: IFeature[]) {
            this.lastSelectedName = this.wodkWidgetSvc.getLastSelectedName();
            if (!fts || !_.isArray(fts)) return;
            this.propertyTable.displayFeature(fts);
            this.updateSearchInput();
        }

        private updateSearchInput() {
            let lastPlace: wodk.IAddressResult = this.wodkWidgetSvc.lastLoadedAddress;
            if (lastPlace) {
                this.placesAutocomplete.setVal(`${lastPlace.name}, ${lastPlace.administrative}`);
                this.placesAutocomplete.autocomplete.pin.style.display = 'none';
                this.placesAutocomplete.autocomplete.clear.style.display = '';
                this.placesAutocomplete.close();
            }
        }

        private featureMessageReceived(title: string, f: IFeature): void {
            switch (title) {
                case 'onFeatureDeselect':
                    this.propertyTable.clearTable();
                    break;
                case 'onUpdateWidgets':
                case 'onFeatureSelect':
                    if (f && f.fType && f.fType.name === 'BagPanden') {
                        this.selectedItems.length = 0;
                        this.selectFeature([f]);
                    } else if (f && f.fType && f.fType.name === 'Buurt') {
                        this.selectedItems = this.wodkWidgetSvc.getBuurtSelectionHistory();
                        this.selectFeature(this.selectedItems);
                    } else if (f && f.fType && f.fType.name === 'gemeente') {
                        this.selectedItems = this.wodkWidgetSvc.getGemeenteSelectionHistory();
                        this.selectFeature(this.selectedItems);
                    } else {
                        this.selectedItems = this.wodkWidgetSvc.getSelectionHistoryOfLastSelectedType();
                        this.selectFeature(this.selectedItems);
                    }
                    break;
            };
        }

        private wodkMessageReceived(title: string): void {
            switch (title) {
                case 'clear-rightpanel':
                    this.propertyTable.clearTable();
                    break;
            };
        }

        private removeItem(item: IFeature) {
            this.wodkWidgetSvc.removeItem(item);
            this.lastSelectedName = this.wodkWidgetSvc.getLastSelectedName();
        }

        private compareItems() {
            this.close();
            this.messageBusService.publish('wodk', 'opencompare');
            var modalInstance = this.$uibModal.open({
                templateUrl: 'wodk/WodkCompareModal.tpl.html',
                size: 'lg',
                controller: 'CompareModalCtrl',
                windowClass: 'modal-slide',
                resolve: {
                    features: () => this.selectedItems
                }
            });

            modalInstance.result.then(() => {}, () => {
                console.log('Modal dismissed at: ' + new Date());
                this.layerService.visual.rightPanelVisible = true;
            });
        }

        public publish(msg: string, data ? : any) {
            this.messageBusService.publish('wodk', msg, data);
        }

        public bookmark() {
            this.messageBusService.notifyWithTranslation('BOOKMARK', 'BOOKMARK_MSG');
        }

        public exportToImage() {
            this.wodkWidgetSvc.exportToImage('wodk-rightpanel');
        }

        public close() {
            this.$timeout(() => {
                this.layerService.visual.rightPanelVisible = false;
            }, 0);
        }
    }
}