module WodkNavbar {
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
    myModule.directive('wodkNavbar', [function (): ng.IDirective {
        return {
            restrict: 'E', // E = elements, other options are A=attributes and C=classes
            scope: {}, // isolated scope, separated from parent. Is however empty, as this directive is self contained by using the messagebus.
            templateUrl: 'wodk/WodkNavbar.tpl.html',
            replace: true, // Remove the directive from the DOM
            transclude: false, // Add elements and attributes to the template
            controller: WodkNavbarCtrl
        };
    }]);

    export interface IWodkNavbarScope extends ng.IScope {
        vm: WodkNavbarCtrl;
        isOpen: boolean;
    }

    export interface IPlacesResult {
        name: string;
        administrative: string;
        city: string;
        country: string;
        countryCode: string;
        type: string;
        latlng: {
            lat: number,
            lng: number
        };
        postcode: string;
        highlight: any;
        hit: any;
        hitIndex: number;
        query: string;
        rawAnswer: any;
        value: string;
    }

    export class WodkNavbarCtrl {
        public static $inject = [
            '$scope',
            '$http',
            'layerService',
            'messageBusService',
            'actionService',
            '$timeout',
            '$sce'
        ];

        private elementClass = 'wodk-navbar';
        private placesAutocomplete;
        private lastResult: IPlacesResult;

        constructor(
            private $scope: IWodkNavbarScope,
            private $http: ng.IHttpService,
            public layerService: csComp.Services.LayerService,
            private messageBusService: csComp.Services.MessageBusService,
            private actionService: csComp.Services.ActionService,
            private $timeout: ng.ITimeoutService,
            private $sce: ng.ISCEService
        ) {
            $scope.vm = this;
            $scope.isOpen = true;

            this.placesAutocomplete = (( < any > window).places)({
                container: document.querySelector('#search-address'),
                countries: ['nl'],
                autocompleteOptions: {
                    minLength: 3,
                    openOnFocus: true,
                    dropdownMenuContainer: document.querySelector('#search-suggestions')
                }
            });

            this.placesAutocomplete.on('change', (e) => {
                console.log(e.suggestion);
                this.lastResult = e.suggestion;
                this.messageBusService.publish('wodk', 'address', this.lastResult);
                this.placesAutocomplete.close();
                this.toggle();
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
        }

        public toggle() {
            this.$timeout(() => {
                this.$scope.isOpen = !this.$scope.isOpen;
            }, 0);
        }
    }
}