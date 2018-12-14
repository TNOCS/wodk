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

    /** The preselected style should be shown to the user. Therefore, 
     *  the propType label must be converted to a readable title, 
     *  which requires the resource type.
     */
    // const RESOURCE_TYPE_URL: string = '/bagwoningen/public/data/resourceTypes/Buurt.json';
    const RESOURCE_TYPE_URL: string = '/data/resourceTypes/Buurt.json';
    
    export class WodkNavbarCtrl {
        public static $inject = [
            '$scope',
            '$location',
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
        private msgBusHandles: csComp.Services.MessageBusHandle[] = [];
        private gemeenteQuery: string;
        private foundCities: string[] = [];
        private gemeenteOnly: boolean;
        private resourceTypeLoaded: boolean = false;
        private selectedStyleTitle: string = '1';

        constructor(
            private $scope: IWodkNavbarScope,
            private $location: ng.ILocationService,
            private $http: ng.IHttpService,
            public layerService: csComp.Services.LayerService,
            private messageBusService: csComp.Services.MessageBusService,
            private actionService: csComp.Services.ActionService,
            private $timeout: ng.ITimeoutService,
            private $sce: ng.ISCEService
        ) {
            $scope.vm = this;
            $scope.isOpen = true;

            this.msgBusHandles.push(this.messageBusService.subscribe('wodk', (message, data) => {
                this.handleMessage(message, data);
            }));

            this.msgBusHandles.push(this.messageBusService.subscribe('layer', (topic, layer) => {
                if (topic === 'activated' && layer.id === 'gemeente') {
                    this.shouldUseSelectedCity();
                }
            }));

            this.loadResourceType(RESOURCE_TYPE_URL);

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

            // this.shouldUseSelectedCity();
        }

        private loadResourceType(url: string) {
            this.layerService.loadTypeResources(url, false, () => {
                this.resourceTypeLoaded = true;
            });
        }

        private selectLocation(loc: wodk.IPlacesResult, dataset: string) {
            if (!loc || _.isEmpty(loc)) return;
            if (dataset && dataset === 'buurten') {
                if (loc.gm_naam === 'provincie') {
                    let provLayer = this.layerService.findLoadedLayer('provincie');
                    if (!provLayer) return;
                    let f = _.find(provLayer.data.features, (f: IFeature) => {
                        return f.properties['Name'] === loc.bu_naam;
                    });
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
            this.lastResult = loc;
            this.messageBusService.publish('wodk', 'address', this.lastResult);
            this.placesAutocomplete.setVal('');
            this.placesAutocomplete.close();
            this.toggle();
        }

        private handleMessage(message: string, data ? : any) {
            switch (message) {
                case 'openrightpanel':
                case 'openstylepanel':
                case 'opencompare':
                case 'opentoelichting':
                    this.toggle(true);
                    break;
                default:
                    break;
            }
        }

        private openPdfs() {
            this.toggle(true);
            this.$timeout(() => {
                this.messageBusService.publish('wodk', 'opentoelichting');
            }, 200);
        }

        private openTable() {
            this.toggle(true);
            this.$timeout(() => {
                var db = this.layerService.findDashboardById('datatable');
                this.messageBusService.publish('dashboard-main', 'activated', db);
            }, 200);
        }

        private publish(message: string) {
            this.messageBusService.publish('wodk', message);
        }

        private selectFirstResult() {
            this.selectLocation(this.lastSuggestion, this.lastSuggestionDataset);
        }

        private selectFirstGemeente() {
            if (!this.foundCities || this.foundCities.length === 0) return;
            this.selectStyledGemeente(this.foundCities[0])
        }

        private filterGemeente() {
            let query = this.gemeenteQuery;
            this.foundCities.length = 0;
            if (query.length < 2 || typeof query !== 'string') return;
            query = query.toLowerCase();
            const maxFound = 15;
            let found = [];
            wodk.gemeentes.some(c => {
                if (c.toLowerCase().indexOf(query) < 0) return false;
                found.push(c);
                if (found.length === maxFound) return true;
            });
            this.foundCities = found;
        }

        public toggle(forceClose ? : boolean) {
            this.$timeout(() => {
                this.$scope.isOpen = (forceClose ? false : !this.$scope.isOpen);
            }, 0);
            this.$timeout(() => {
                if (this.$scope.isOpen) {
                    document.getElementById('search-address').focus();
                    this.layerService.visual.rightPanelVisible = false;
                    this.messageBusService.publish('wodk', 'opennavbar');
                }
            }, 100);
        }
        
        private shouldUseSelectedCity() {
            var searchParams = this.$location.search();
            if (searchParams && searchParams.hasOwnProperty('selectcity')) {
                this.gemeenteOnly = true;
                if (typeof searchParams['styleproperty'] === 'string' && this.resourceTypeLoaded) {
                    let propType = this.layerService.findPropertyTypeById(RESOURCE_TYPE_URL.concat('#', searchParams['styleproperty']));
                    if (propType) {
                        this.selectedStyleTitle = propType.title;
                    } else {
                        this.selectedStyleTitle = '';
                    }
                } else {
                    this.selectedStyleTitle = '';                    
                }
                if (typeof searchParams['selectcity'] === 'string') {
                    this.selectStyledGemeente(searchParams['selectcity']);
                }
            }
        }

        private selectStyledGemeente(city: string) {
            var searchParams = this.$location.search();
            var styleProp = searchParams['styleproperty'];
            this.$location.search('selectcity', city);
            if (!styleProp || typeof styleProp !== 'string') styleProp = 'aant_inw';
            var data = {city: city, style: styleProp};
            this.messageBusService.publish('wodk', 'city', data);
            this.gemeenteOnly = false;
            this.foundCities.length = 0;
            this.gemeenteQuery = '';
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