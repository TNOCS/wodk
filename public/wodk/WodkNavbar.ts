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
        private lastResult: wodk.IPlacesResult;
        private lastSuggestion: wodk.IPlacesResult;
        private lastSuggestionDataset: string;
        private msgBusHandle: csComp.Services.MessageBusHandle;

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

            this.msgBusHandle = this.messageBusService.subscribe('wodk', (message, data) => {
                this.handleMessage(message, data);
            });

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
                console.log(e.dataset, e.suggestion);
                this.selectLocation(e.suggestion, e.dataset);
            });

            this.placesAutocomplete.on('suggestions', (e) => {
                // console.log(e.suggestions);
                this.lastSuggestion = (e.suggestions ? e.suggestions[0] : {});
                this.lastSuggestionDataset = (e.dataset ? e.dataset : '');
            });

            this.placesAutocomplete.on('limit', (e) => {
                console.log(e.message);
                this.messageBusService.notifyError('Limiet bereikt', `De limiet voor de adressen-zoekfunctie is bereikt. ${e.message}`);
            });

            this.placesAutocomplete.on('error', (e) => {
                console.log(e.message);
            });

            setTimeout(() => {
                // this.test();
            }, 5000);
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
            this.lastResult = loc;
            this.messageBusService.publish('wodk', 'address', this.lastResult);
            this.placesAutocomplete.setVal('');
            this.placesAutocomplete.close();
            this.toggle();
        }

        private handleMessage(message: string, data ? : any) {
            switch (message) {
                case 'closenavbar':
                    this.toggle(true);
                    break;
                default:
                    break;
            }
        }

        private openTable() {
            this.toggle(true);
            var db = this.layerService.findDashboardById('datatable');
            this.messageBusService.publish('dashboard-main', 'activated', db);
        }

        private publish(message: string) {
            this.messageBusService.publish('wodk', message);
        }

        private selectFirstResult() {
            this.selectLocation(this.lastSuggestion, this.lastSuggestionDataset);
        }

        public toggle(forceClose ? : boolean) {
            this.$timeout(() => {
                this.$scope.isOpen = (forceClose ? false : !this.$scope.isOpen);
            }, 0);
            this.$timeout(() => {
                if (this.$scope.isOpen) {
                    document.getElementById('search-address').focus();
                    this.layerService.visual.rightPanelVisible = false;
                }
            }, 100);
        }

        private test() {
            let res = {
                'name': 'Heerenveen',
                'administrative': 'Friesland',
                'country': 'Nederland',
                'countryCode': 'nl',
                'type': 'city',
                'latlng': {
                    'lat': 52.9568,
                    'lng': 5.92701
                },
                'highlight': {
                    'name': '<em>Heere</em>nveen',
                    'administrative': 'Friesland',
                    'country': 'Nederland'
                },
                'hit': {
                    'is_city': true,
                    'is_country': false,
                    '_tags': [
                        'boundary',
                        'boundary/administrative',
                        'country/nl',
                        'city'
                    ],
                    'postcode': [],
                    'country_code': 'nl',
                    'country': 'Nederland',
                    'admin_level': 8,
                    'locale_names': [
                        'Heerenveen'
                    ],
                    'importance': 16,
                    'is_highway': false,
                    'is_popular': false,
                    'administrative': [
                        'Friesland'
                    ],
                    'population': 29000,
                    '_geoloc': {
                        'lat': 52.9568,
                        'lng': 5.92701
                    },
                    'objectID': '156149878_403072',
                    '_highlightResult': {
                        'country': {
                            'value': 'Nederland',
                            'matchLevel': 'none',
                            'matchedWords': []
                        },
                        'locale_names': [{
                            'value': '<em>Heere</em>nveen',
                            'matchLevel': 'full',
                            'fullyHighlighted': false,
                            'matchedWords': [
                                'heere'
                            ]
                        }],
                        'administrative': [{
                            'value': 'Friesland',
                            'matchLevel': 'none',
                            'matchedWords': []
                        }]
                    }
                },
                'hitIndex': 0,
                'query': 'heere',
                'rawAnswer': {
                    'hits': [{
                        'is_city': true,
                        'is_country': false,
                        '_tags': [
                            'boundary',
                            'boundary/administrative',
                            'country/nl',
                            'city'
                        ],
                        'postcode': [],
                        'country_code': 'nl',
                        'country': 'Nederland',
                        'admin_level': 8,
                        'locale_names': [
                            'Heerenveen'
                        ],
                        'importance': 16,
                        'is_highway': false,
                        'is_popular': false,
                        'administrative': [
                            'Friesland'
                        ],
                        'population': 29000,
                        '_geoloc': {
                            'lat': 52.9568,
                            'lng': 5.92701
                        },
                        'objectID': '156149878_403072',
                        '_highlightResult': {
                            'country': {
                                'value': 'Nederland',
                                'matchLevel': 'none',
                                'matchedWords': []
                            },
                            'locale_names': [{
                                'value': '<em>Heere</em>nveen',
                                'matchLevel': 'full',
                                'fullyHighlighted': false,
                                'matchedWords': [
                                    'heere'
                                ]
                            }],
                            'administrative': [{
                                'value': 'Friesland',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }]
                        }
                    }, {
                        'is_city': true,
                        'is_country': false,
                        '_tags': [
                            'place',
                            'place/village',
                            'country/nl',
                            'city'
                        ],
                        'postcode': [
                            '6624'
                        ],
                        'country_code': 'nl',
                        'country': 'Nederland',
                        'admin_level': 15,
                        'locale_names': [
                            'Heerewaarden'
                        ],
                        'importance': 19,
                        'is_highway': false,
                        'is_popular': false,
                        'administrative': [
                            'Gelderland'
                        ],
                        'population': 1000,
                        '_geoloc': {
                            'lat': 51.8182,
                            'lng': 5.38917
                        },
                        'objectID': '220244_43949067',
                        '_highlightResult': {
                            'postcode': [{
                                'value': '6624',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }],
                            'country': {
                                'value': 'Nederland',
                                'matchLevel': 'none',
                                'matchedWords': []
                            },
                            'locale_names': [{
                                'value': '<em>Heere</em>waarden',
                                'matchLevel': 'full',
                                'fullyHighlighted': false,
                                'matchedWords': [
                                    'heere'
                                ]
                            }],
                            'administrative': [{
                                'value': 'Gelderland',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }]
                        }
                    }, {
                        'is_city': true,
                        'is_country': false,
                        '_tags': [
                            'place',
                            'place/village',
                            'country/nl',
                            'city'
                        ],
                        'postcode': [],
                        'country_code': 'nl',
                        'country': 'Nederland',
                        'locale_names': [
                            `s -Heerenberg`
                        ],
                        'admin_level': 15,
                        'importance': 19,
                        'is_highway': false,
                        'county': [
                            'Stadsregio Arnhem Nijmegen'
                        ],
                        'is_popular': false,
                        'administrative': [
                            'Gelderland'
                        ],
                        'population': 5000,
                        '_geoloc': {
                            'lat': 51.8778,
                            'lng': 6.25533
                        },
                        'objectID': '223642_44196313',
                        '_highlightResult': {
                            'country': {
                                'value': 'Nederland',
                                'matchLevel': 'none',
                                'matchedWords': []
                            },
                            'locale_names': [{
                                'value': `s-<em>Heere </em>nberg`,
                                'matchLevel': 'full',
                                'fullyHighlighted': false,
                                'matchedWords': [
                                    'heere'
                                ]
                            }],
                            'county': [{
                                'value': 'Stadsregio Arnhem Nijmegen',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }],
                            'administrative': [{
                                'value': 'Gelderland',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }]
                        }
                    }, {
                        'is_city': false,
                        'is_country': false,
                        'postcode': [
                            '1012 ZA',
                            '1012EZ'
                        ],
                        '_tags': [
                            'highway',
                            'highway/unclassified',
                            'country/nl',
                            'address'
                        ],
                        'country_code': 'nl',
                        'country': 'Nederland',
                        'city': [
                            'Amsterdam'
                        ],
                        'locale_names': [
                            'Grimburgwal',
                            'Heerenlogementsbrug'
                        ],
                        'admin_level': 15,
                        'importance': 26,
                        'village': [
                            'Centrum'
                        ],
                        'suburb': [
                            'Amsterdam'
                        ],
                        'county': [
                            'Metropoolregio Amsterdam',
                            'MRA'
                        ],
                        'is_highway': true,
                        'is_popular': false,
                        'administrative': [
                            'Noord-Holland'
                        ],
                        'population': 825080,
                        '_geoloc': {
                            'lat': 52.3693,
                            'lng': 4.8948
                        },
                        'objectID': '71607827_38314625',
                        '_highlightResult': {
                            'postcode': [{
                                'value': '1012 ZA',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }, {
                                'value': '1012EZ',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }],
                            'country': {
                                'value': 'Nederland',
                                'matchLevel': 'none',
                                'matchedWords': []
                            },
                            'city': [{
                                'value': 'Amsterdam',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }],
                            'locale_names': [{
                                'value': 'Grimburgwal',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }, {
                                'value': '<em>Heere</em>nlogementsbrug',
                                'matchLevel': 'full',
                                'fullyHighlighted': false,
                                'matchedWords': [
                                    'heere'
                                ]
                            }],
                            'village': [{
                                'value': 'Centrum',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }],
                            'suburb': [{
                                'value': 'Amsterdam',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }],
                            'county': [{
                                'value': 'Metropoolregio Amsterdam',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }, {
                                'value': 'MRA',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }],
                            'administrative': [{
                                'value': 'Noord-Holland',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }]
                        }
                    }, {
                        'is_city': true,
                        'is_country': false,
                        '_tags': [
                            'place',
                            'place/village',
                            'country/nl',
                            'city'
                        ],
                        'postcode': [],
                        'country_code': 'nl',
                        'country': 'Nederland',
                        'admin_level': 15,
                        'locale_names': [
                            `s -Heerenhoek`
                        ],
                        'importance': 19,
                        'is_highway': false,
                        'is_popular': false,
                        'administrative': [
                            'Zeeland'
                        ],
                        'population': 1939,
                        '_geoloc': {
                            'lat': 51.4536,
                            'lng': 3.76904
                        },
                        'objectID': '220533_42666235',
                        '_highlightResult': {
                            'country': {
                                'value': 'Nederland',
                                'matchLevel': 'none',
                                'matchedWords': []
                            },
                            'locale_names': [{
                                'value': `s-<em>Heere </em>nhoek`,
                                'matchLevel': 'full',
                                'fullyHighlighted': false,
                                'matchedWords': [
                                    'heere'
                                ]
                            }],
                            'administrative': [{
                                'value': 'Zeeland',
                                'matchLevel': 'none',
                                'matchedWords': []
                            }]
                        }
                    }],
                    'nbHits': 5,
                    'processingTimeMS': 13,
                    'query': 'heere',
                    'params': 'countries=%5B%22nl%22%5D&hitsPerPage=5&language=nl&query=heere',
                    'degradedQuery': false
                },
                'value': 'Heerenveen, Friesland, Nederland',
                'administrationLevel': wodk.AdministrationLevel.gemeente
            };
            this.selectLocation(res, '');
        }
    }
}