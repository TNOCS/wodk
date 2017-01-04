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
            templateUrl: '/wodk/WodkRightPanel.tpl.html',
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

        public static $inject = [
            '$scope',
            '$http',
            'layerService',
            'messageBusService',
            'actionService',
            '$timeout',
            '$sce',
            'wodkWidgetSvc'
        ];

        constructor(
            private $scope: IWodkRightPanelScope,
            private $http: ng.IHttpService,
            public layerService: csComp.Services.LayerService,
            private messageBusService: csComp.Services.MessageBusService,
            private actionService: csComp.Services.ActionService,
            private $timeout: ng.ITimeoutService,
            private $sce: ng.ISCEService,
            private wodkWidgetSvc: wodk.WODKWidgetSvc
        ) {
            $scope.vm = this;

            var par = < any > $scope.$parent;
            if (par.widget) {
                $scope.data = < any > par.widget.data;
            } else {
                $scope.data = < any > par.data;
            }

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
                console.log(e.suggestion);
                this.selectLocation(e.suggestion);
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

            let lastPlace: wodk.IAddressResult = this.wodkWidgetSvc.lastLoadedAddress;
            if (lastPlace) {
                this.placesAutocomplete.setVal(`${lastPlace.name}, ${lastPlace.province}`);
                this.placesAutocomplete.autocomplete.pin.style.display = 'none';
                this.placesAutocomplete.autocomplete.clear.style.display = '';
            }
        }

        private selectLocation(loc: wodk.IPlacesResult) {
            this.messageBusService.publish('wodk', 'address', loc);
            this.placesAutocomplete.close();
        }

        public publish(msg: string) {
            this.messageBusService.publish('wodk', msg);
        }

        public close() {
            this.$timeout(() => {
                this.layerService.visual.rightPanelVisible = false;
            }, 0);
            this.$timeout(() => {
                this.layerService.visual.rightPanelVisible = true;
            }, 1000);
        }
    }
}