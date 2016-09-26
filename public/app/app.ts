module App {
    import IFeature = csComp.Services.IFeature;

    export interface IAppLocationService extends ng.ILocationService {
        $$search: { layers: string };
    }

    export interface IAppScope extends ng.IScope {
        vm: AppCtrl;
        title: string;
        showMenuRight: boolean;
        featureSelected: boolean;
        layersLoading: number;
        sv: boolean;
    }

    // TODO For setting the current culture for string formatting (note you need to include public/js/cs/stringformat.YOUR-CULTURE.js. See sffjs.1.09.zip for your culture.)
    declare var sffjs;
    declare var String;
    declare var omnivore;
    declare var L;

    export class AppCtrl {
        // It provides $injector with information about dependencies to be injected into constructor
        // it is better to have it close to the constructor, because the parameters must match in count and type.
        // See http://docs.angularjs.org/guide/di
        static $inject = [
            '$scope',
            '$location',
            '$http',
            'mapService',
            'layerService',
            'messageBusService',
            'dashboardService',
            'wodkWidgetSvc',
            'geoService',
            '$timeout'
        ];

        // public areaFilter: AreaFilter.AreaFilterModel;
        public contourAction: ContourAction.ContourActionModel;

        public searchCache: { [key: string]: csComp.Services.IEsriSearchResult } = {};
        public filterValues: number[] = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
        public filterValue = this.filterValues[0];
        public foundAddresses: { [key: string]: wodk.IAddressResult } = {};
        public addressQuery: string;
        public foundCities: string[] = [];
        public cityQuery: string;
        public cities: string[] = ['Aa en Hunze', 'Aalburg', 'Aalsmeer', 'Aalten', 'Achtkarspelen', 'Alblasserdam', 'Albrandswaard', 'Alkmaar', 'Almelo', 'Almere', 'Alphen aan den Rijn', 'Alphen-Chaam', 'Ameland', 'Amersfoort', 'Amstelveen', 'Amsterdam', 'Apeldoorn', 'Appingedam', 'Arnhem', 'Assen', 'Asten', 'Baarle-Nassau', 'Baarn', 'Barendrecht', 'Barneveld', 'Bedum', 'Beek', 'Beemster', 'Beesel', 'Bellingwedde', 'Berg en Dal', 'Bergeijk', 'Bergen (Limburg)', 'Bergen (Noord-Holland)', 'Bergen op Zoom', 'Berkelland', 'Bernheze', 'Best', 'Beuningen', 'Beverwijk', 'Binnenmaas', 'Bladel', 'Blaricum', 'Bloemendaal', 'Bodegraven-Reeuwijk', 'Boekel', 'Bonaire', 'Borger-Odoorn', 'Borne', 'Borsele', 'Boxmeer', 'Boxtel', 'Breda', 'Brielle', 'Bronckhorst', 'Brummen', 'Brunssum', 'Bunnik', 'Bunschoten', 'Buren', 'Capelle aan den IJssel', 'Castricum', 'Coevorden', 'Cranendonck', 'Cromstrijen', 'Cuijk', 'Culemborg', 'Dalfsen', 'Dantumadeel', 'De Bilt', 'De Friese Meren', 'De Marne', 'De Ronde Venen', 'De Wolden', 'Delft', 'Delfzijl', 'Den Haag (\'s-Gravenhage)', 'Den Helder', 'Deurne', 'Deventer', 'Diemen', 'Dinkelland', 'Doesburg', 'Doetinchem', 'Dongen', 'Dongeradeel', 'Dordrecht', 'Drechterland', 'Drimmelen', 'Dronten', 'Druten', 'Duiven', 'Echt-Susteren', 'Edam-Volendam', 'Ede', 'Eemnes', 'Eemsmond', 'Eersel', 'Eijsden-Margraten', 'Eindhoven', 'Elburg', 'Emmen', 'Enkhuizen', 'Enschede', 'Epe', 'Ermelo', 'Etten-Leur', 'Ferwerderadeel', 'Franekeradeel', 'Geertruidenberg', 'Geldermalsen', 'Geldrop-Mierlo', 'Gemert-Bakel', 'Gennep', 'Giessenlanden', 'Gilze en Rijen', 'Goeree-Overflakkee', 'Goes', 'Goirle', 'Gooise Meren', 'Gorinchem (Gorcum of Gorkum)', 'Gouda', 'Grave', 'Groningen', 'Grootegast', 'Gulpen-Wittem', 'Haaksbergen', 'Haaren', 'Haarlem', 'Haarlemmerliede en Spaarnwoude', 'Haarlemmermeer', 'Halderberge', 'Hardenberg', 'Harderwijk', 'Hardinxveld-Giessendam', 'Haren', 'Harlingen', 'Hattem', 'Heemskerk', 'Heemstede', 'Heerde', 'Heerenveen', 'Heerhugowaard', 'Heerlen', 'Heeze-Leende', 'Heiloo', 'Hellendoorn/Nijverdal', 'Hellevoetsluis', 'Helmond', 'Hendrik-Ido-Ambacht', 'Hengelo (Overijssel)', '\'s-Hertogenbosch (Den Bosch)', 'Het Bildt', 'Heumen', 'Heusden', 'Hillegom', 'Hilvarenbeek', 'Hilversum', 'Hof van Twente', 'Hollands Kroon', 'Hoogeveen', 'Hoogezand-Sappemeer', 'Hoorn', 'Horst aan de Maas', 'Houten', 'Huizen', 'Hulst', 'IJsselstein', 'Kaag en Braassem', 'Kampen', 'Kapelle', 'Katwijk', 'Kerkrade', 'Koggenland', 'Kollumerland en Nieuwkruisland', 'Korendijk', 'Krimpen aan den IJssel', 'Krimpenerwaard', 'Laarbeek', 'Landerd', 'Landgraaf', 'Landsmeer', 'Langedijk', 'Lansingerland', 'Laren', 'Leek', 'Leerdam', 'Leeuwarden', 'Leeuwarderadeel', 'Leiden', 'Leiderdorp', 'Leidschendam-Voorburg', 'Lelystad', 'Leudal', 'Leusden', 'Lingewaal', 'Lingewaard', 'Lisse', 'Littenseradeel', 'Lochem', 'Loon op Zand', 'Lopik', 'Loppersum', 'Losser', 'Maasdriel', 'Maasgouw', 'Maassluis', 'Maastricht', 'Marum', 'Medemblik', 'Meerssen', 'Menaldumadeel', 'Menterwolde', 'Meppel', 'Middelburg', 'Midden-Delfland', 'Midden-Drenthe', 'Mill en Sint Hubert', 'Moerdijk', 'Molenwaard', 'Montferland', 'Montfoort', 'Mook en Middelaar', 'Neder-Betuwe', 'Nederweert', 'Neerijnen', 'Nieuwegein', 'Nieuwkoop', 'Nijkerk', 'Nijmegen', 'Nissewaard', 'Noord-Beveland', 'Noordenveld', 'Noordoostpolder', 'Noordwijk', 'Noordwijkerhout', 'Nuenen', ' Gerwen en Nederwetten', 'Nunspeet', 'Nuth', 'Oegstgeest', 'Oirschot', 'Oisterwijk', 'Oldambt', 'Oldebroek', 'Oldenzaal', 'Olst-Wijhe', 'Ommen', 'Onderbanken', 'Oost Gelre', 'Oosterhout', 'Ooststellingwerf', 'Oostzaan', 'Opmeer', 'Opsterland', 'Oss', 'Oud-Beijerland', 'Oude IJsselstreek', 'Ouder-Amstel', 'Oudewater', 'Overbetuwe', 'Papendrecht', 'Peel en Maas', 'Pekela', 'Pijnacker-Nootdorp', 'Purmerend', 'Putten', 'Raalte', 'Reimerswaal', 'Renkum', 'Renswoude', 'Reusel-De Mierden', 'Rheden', 'Rhenen', 'Ridderkerk', 'Rijnwaarden', 'Rijssen-Holten', 'Rijswijk', 'Roerdalen', 'Roermond', 'Roosendaal', 'Rotterdam', 'Rozendaal', 'Rucphen', 'Saba', 'Schagen', 'Scherpenzeel', 'Schiedam', 'Schiermonnikoog', 'Schijndel', 'Schinnen', 'Schouwen-Duiveland', 'Simpelveld', 'Sint Anthonis', 'Sint Eustatius', 'Sint-Michielsgestel', 'Sint-Oedenrode', 'Sittard-Geleen', 'Sliedrecht', 'Slochteren', 'Sluis', 'Smallingerland', 'Soest', 'Someren', 'Son en Breugel', 'Stadskanaal', 'Staphorst', 'Stede Broec', 'Steenbergen', 'Steenwijkerland', 'Stein', 'Stichtse Vecht', 'Strijen', 'Súdwest-Fryslân', 'Ten Boer', 'Terneuzen', 'Terschelling', 'Texel', 'Teylingen', 'Tholen', 'Tiel', 'Tietjerksteradeel', 'Tilburg', 'Tubbergen', 'Twenterand', 'Tynaarlo', 'Uden', 'Uitgeest', 'Uithoorn', 'Urk', 'Utrecht', 'Utrechtse Heuvelrug', 'Vaals', 'Valkenburg aan de Geul', 'Valkenswaard', 'Veendam', 'Veenendaal', 'Veere', 'Veghel', 'Veldhoven', 'Velsen', 'Venlo', 'Venray', 'Vianen', 'Vlaardingen', 'Vlagtwedde', 'Vlieland', 'Vlissingen', 'Voerendaal', 'Voorschoten', 'Voorst', 'Vught', 'Waalre', 'Waalwijk', 'Waddinxveen', 'Wageningen', 'Wassenaar', 'Waterland', 'Weert', 'Weesp', 'Werkendam', 'West Maas en Waal', 'Westerveld', 'Westervoort', 'Westland', 'Weststellingwerf', 'Westvoorne', 'Wierden', 'Wijchen', 'Wijdemeren', 'Wijk bij Duurstede', 'Winsum', 'Winterswijk', 'Woensdrecht', 'Woerden', 'Wormerland', 'Woudenberg', 'Woudrichem', 'Zaanstad', 'Zaltbommel', 'Zandvoort', 'Zederik', 'Zeewolde', 'Zeist', 'Zevenaar', 'Zoetermeer', 'Zoeterwoude', 'Zuidhorn', 'Zuidplas', 'Zundert', 'Zutphen', 'Zwartewaterland', 'Zwijndrecht', 'Zwolle'];

        activeLayer: csComp.Services.ProjectLayer;

        // dependencies are injected via AngularJS $injector
        // controller's name is registered in Application.ts and specified from ng-controller attribute in index.html
        constructor(
            private $scope: IAppScope,
            private $location: IAppLocationService,
            private $http: ng.IHttpService,
            private $mapService: csComp.Services.MapService,
            private $layerService: csComp.Services.LayerService,
            private $messageBusService: csComp.Services.MessageBusService,
            private $dashboardService: csComp.Services.DashboardService,
            private wodkWidgetSvc: wodk.WODKWidgetSvc,
            private geoService: csComp.Services.GeoService,
            private $timeout: ng.ITimeoutService
        ) {
            sffjs.setCulture('nl-NL');

            $scope.vm = this;
            $scope.showMenuRight = false;
            $scope.featureSelected = false;
            $scope.layersLoading = 0;

            $messageBusService.subscribe('project', (action: string) => {
                if (action === 'loaded') {

                    this.$dashboardService.widgetTypes['rowvisualizer'] = <csComp.Services.IWidget>{
                        id: 'rowvisualizer',
                        icon: 'images/rowvisualizer.png',
                        description: 'Show rowfilter without filter functionality'
                    }

                    this.$dashboardService.widgetTypes['rangewidget'] = <csComp.Services.IWidget>{
                        id: 'rangewidget',
                        icon: 'images/rangewidget.png',
                        description: 'Show rangewidget with filter functionality'
                    }

                    // this.areaFilter = new AreaFilter.AreaFilterModel();
                    // this.$layerService.addActionService(this.areaFilter);
                    this.contourAction = new ContourAction.ContourActionModel();
                    this.$layerService.addActionService(this.contourAction);

                    this.$layerService.actionService.addAction('load woningen', (options: csComp.Services.IButtonActionOptions) => {
                        console.log('load woningen');
                        if ($scope.layersLoading != 0) {
                            this.$layerService.$messageBusService.notify('Bezig met laden...', 'Wacht tot het laden voltooid is.', 3000);
                            return;
                        }
                        this.wodkWidgetSvc.laadWoningen();
                    });

                    this.$layerService.actionService.addAction('load buurten', (options: csComp.Services.IButtonActionOptions) => {
                        console.log('load buurten');
                        if ($scope.layersLoading != 0) {
                            this.$layerService.$messageBusService.notify('Bezig met laden...', 'Wacht tot het laden voltooid is.', 3000);
                            return;
                        }
                        this.wodkWidgetSvc.laadBuurten();
                    });

                    this.$layerService.actionService.addAction('select provincie', (options: csComp.Services.IButtonActionOptions) => {
                        console.log('select provincie');
                        this.wodkWidgetSvc.selecteerProvincie();
                    });

                    this.$layerService.actionService.addAction('step back', (options: csComp.Services.IButtonActionOptions) => {
                        console.log('step back');
                        if ($scope.layersLoading != 0) {
                            this.$layerService.$messageBusService.notify('Bezig met laden...', 'Wacht tot het laden voltooid is.', 3000);
                            return;
                        }
                        this.wodkWidgetSvc.stepBack();
                    });

                    // NOTE EV: You may run into problems here when calling this inside an angular apply cycle.
                    // Alternatively, check for it or use (dependency injected) $timeout.
                    if ($scope.$root.$$phase !== '$apply' && $scope.$root.$$phase !== '$digest') { $scope.$apply(); }
                    //$scope.$apply();
                }
            });

            //$messageBusService.subscribe('sidebar', this.sidebarMessageReceived);
            $messageBusService.subscribe('feature', this.featureMessageReceived);
            $messageBusService.subscribe('layer', this.layerMessageReceived);

            var rpt = csComp.Helpers.createRightPanelTab('featureprops', 'featureprops', null, 'Selected feature', '{{\'FEATURE_INFO\' | translate}}', 'info');
            this.$messageBusService.publish('rightpanel', 'activate', rpt);
            this.$layerService.visual.rightPanelVisible = false; // otherwise, the rightpanel briefly flashes open before closing.

            this.$layerService.openSolution('data/projects/projects.json', $location.$$search.layers);
        }

        /**
         * Simple filter that returns a list of cities that match the criteria.
         *
         * @param {string} query
         */
        filterCity(query: string) {
            this.foundCities.length = 0;
            if (query.length < 2 || typeof query !== 'string') return;
            query = query.toLowerCase();
            const maxFound = 15;
            let found = [];
            this.cities.some(c => {
                if (c.toLowerCase().indexOf(query) < 0) return false;
                found.push(c);
                if (found.length === maxFound) return true;
            });
            this.foundCities = found;
        }

        /**
         * Select the city and broadcast it.
         *
         * @param {string} city
         */
        selectCity(city: string) {
            $('#search-city').val('');
            this.$messageBusService.publish('wodk', 'city', city);
        }

        /**
         * Select the first search result.
         */
        selectFirstCity() {
            if (this.foundCities.length > 0) {
                this.selectCity(this.foundCities[0]);
            }
        }

        filterAddress = _.debounce(this.filterAddressDebounced, 750);

        filterAddressDebounced() {
            let q = this.addressQuery;
            if (this.searchCache.hasOwnProperty(q)) {
                this.geocodeCallback(this.searchCache[q], q);
            } else {
                let uri = 'https://services.arcgisonline.nl/arcgis/rest/services/Geocoder_BAG/GeocodeServer/findAddressCandidates?f=pjson';
                uri += `&SingleLine=${encodeURIComponent(q)}&outFields=Match_addr,City,Subregion,Region`;
                this.$http.get(uri)
                    .success((r: csComp.Services.IEsriSearchResult) => {
                        this.geocodeCallback(r, q);
                    })
                    .error((data, status, error, thing) => {
                        console.log('Error contacting Esri')
                    });
            }
        }

        geocodeCallback(r: csComp.Services.IEsriSearchResult, q: string) {
            this.searchCache[q] = r;
            this.foundAddresses = {};
            this.$timeout(() => {
                r.candidates.forEach(f => {
                    if (f.score > 80) {
                        this.foundAddresses[f.address] = { name: f.attributes['Match_addr'], score: (f.score / 101), province: f.attributes['Region'], coordinates: [f.location.x, f.location.y] }
                    }
                });
            }, 0);
        }

        selectAddress(address: any) {
            $('#search-address').val('');
            this.foundAddresses = {};
            this.$messageBusService.publish('wodk', 'address', address);
        }

        selectFirstAddress() {
            if (!_.isEmpty(this.foundAddresses)) {
                this.selectAddress(JSON.parse(JSON.stringify(this.foundAddresses[Object.keys(this.foundAddresses)[0]])));
            }
        }

        /**
         * When a filter is selected, broadcast it.
         *
         * @param {number} fv
         */
        selectFilter(fv: number) {
            this.filterValue = fv;
            this.$messageBusService.publish('wodk', 'filter', +fv);
        }

        /**
         * Publish a message on the bus.
         *
         * @param {string} msg
         */
        publish(msg: string) {
            this.$messageBusService.publish('wodk', msg);
        }

        toggleShowAttribution() {
            let attr = $('.leaflet-control-attribution');
            if (attr.is(':visible')) {
                attr.fadeOut();
            } else {
                attr.fadeIn();
            }
        }

        get showNavigation() { return this.$dashboardService._search.isActive; }

        /**
         * Publish a toggle request.
         */
        toggleMenuRight() {
            this.$messageBusService.publish('sidebar', 'toggle');
        }

        private layerMessageReceived = (title: string, layer: csComp.Services.ProjectLayer): void => {
            switch (title) {
                case 'loading':
                    this.$scope.layersLoading += 1;
                    console.log('Loading');
                    break;
                case 'activated':
                    if (this.$scope.layersLoading >= 1) this.$scope.layersLoading -= 1;
                    // if (layer.id === 'bagcontouren') {
                    // var gemeente = this.$layerService.findLoadedLayer('gemeente');
                    // if (gemeente) this.$layerService.removeLayer(gemeente);
                    // }
                    break;
                case 'error':
                    this.$scope.layersLoading = 0;
                    console.log('Error loading');
                    break;
                case 'deactivate':
                    break;
            }

            var $contextMenu = $('#contextMenu');

            $('body').on('contextmenu', 'table tr', function (e) {
                $contextMenu.css({
                    display: 'block',
                    left: e.pageX,
                    top: e.pageY
                });
                return false;
            });

            $contextMenu.on('click', 'a', function () {
                $contextMenu.hide();
            });

            // NOTE EV: You need to call apply only when an event is received outside the angular scope.
            // However, make sure you are not calling this inside an angular apply cycle, as it will generate an error.
            if (this.$scope.$root.$$phase !== '$apply' && this.$scope.$root.$$phase !== '$digest') {
                this.$scope.$apply();
            }
        }

        private featureMessageReceived = (title: string): void => {
            switch (title) {
                case 'onFeatureSelect':
                    this.$scope.featureSelected = true;
                    break;
                case 'onFeatureDeselect':
                    this.$scope.featureSelected = false;
                    break;
            }

            // NOTE EV: You need to call apply only when an event is received outside the angular scope.
            // However, make sure you are not calling this inside an angular apply cycle, as it will generate an error.
            // if (this.$scope.$root.$$phase != '$apply' && this.$scope.$root.$$phase != '$digest') {
            //     this.$scope.$apply();
            // }
        }

        /**
         * Callback function
         * @see {http://stackoverflow.com/questions/12756423/is-there-an-alias-for-this-in-typescript}
         * @see {http://stackoverflow.com/questions/20627138/typescript-this-scoping-issue-when-called-in-jquery-callback}
         * @todo {notice the strange syntax, which is to preserve the this reference!}
         */
        private sidebarMessageReceived = (title: string): void => {
            switch (title) {
                case 'toggle':
                    this.$scope.showMenuRight = !this.$scope.showMenuRight;
                    break;
                case 'show':
                    this.$scope.showMenuRight = true;
                    break;
                case 'hide':
                    this.$scope.showMenuRight = false;
                    break;
                default:
            }
        }

        private getHTML() {
            var content = `<html><head>`;
            $.each(document.getElementsByTagName('link'), (ind: number, val: HTMLLinkElement) => { content += val.outerHTML; });
            //    $.each(document.getElementsByTagName('script'), (ind: number, val: HTMLLinkElement) => { content += val.outerHTML; });
            content += `</head>`;
            content += document.body.outerHTML;
            content += `</html>`;
            return content;
        }

        private getDimensions() {
            let dom = $("body");
            let w = dom.outerWidth(true);
            let h = dom.outerHeight(true);
            return { width: w, height: h };
        }

        public exportToImage() {
            let dim = this.getDimensions();
            this.$http({
                method: 'POST',
                url: "screenshot",
                data: { html: this.getHTML(), width: dim.width, height: dim.height, fullScreen: true },
            }).then((response) => {
                csComp.Helpers.saveImage(response.data.toString(), 'Woningaanpassingen screenshot', 'png', true);
            }, (error) => {
                console.log(error);
            });
            console.log('Screenshot command sent');
            this.$messageBusService.notifyWithTranslation('SCREENSHOT_REQUESTED', 'IMAGE_WILL_APPEAR');
        }


        toggleMenu(): void {
            this.$mapService.invalidate();
        }

        toggleSidebar(): void {
            this.$messageBusService.publish('sidebar', 'toggle');
            window.console.log('Publish toggle sidebar');
        }

        //public showTable(tableVisible: boolean) {
        //    this.$mapService.mapVisible = !tableVisible;
        //}

        isActive(viewLocation: string) {
            return viewLocation === this.$location.path();
        }
    }

    // http://jsfiddle.net/mrajcok/pEq6X/
    //declare var google;

    // Start the application
    angular.module('csWebApp', [
        'csComp',
        'ngSanitize',
        'ui.bootstrap',
        'ui.select',
        'LocalStorageModule',
        'angularUtils.directives.dirPagination',
        'pascalprecht.translate',
        'ngCookies',
        'angularSpectrumColorpicker',
        'wiz.markdown',
        'ngAnimate'
    ])
        .config(localStorageServiceProvider => {
            localStorageServiceProvider.prefix = 'csMap';
        })
        .config(TimelineServiceProvider => {
            TimelineServiceProvider.setTimelineOptions({
                'width': '100%',
                'height': 'auto',
                'cluster': true,
                // The minimal margin in pixels between events.
                'eventMargin': 5,
                // The minimal margin in pixels between events and the horizontal axis.
                'eventMarginAxis': 0,
                // Also load timeline-locales.js
                'locale': 'nl',
                'editable': false,
                // If true, the events on the timeline are selectable. When an event is selected, the select event is fired.
                'selectable': true,
                // If true, the timeline shows a red, vertical line displaying the current time. This time can be synchronized with a server via the method setCurrentTime.
                'showCurrentTime': true,
                'showCustomTime': true,
                'layout': 'box'
            });
        })
        .config(($locationProvider) => {
            $locationProvider.html5Mode({
                enabled: true,
                requireBase: false
            })
        })
        .config($translateProvider => {
            // TODO ADD YOUR LOCAL TRANSLATIONS HERE, OR ALTERNATIVELY, CHECK OUT
            // http://angular-translate.github.io/docs/#/guide/12_asynchronous-loading
            // Translations.English.locale['MAP_LABEL'] = 'MY AWESOME MAP';
            // Append local translations if present
            if (Translations.DutchAdditional && Translations.DutchAdditional.locale) {
                $translateProvider.translations('nl', $.extend(Translations.Dutch.locale, Translations.DutchAdditional.locale));
            } else {
                $translateProvider.translations('nl', Translations.Dutch.locale);
            }
            if (Translations.EnglishAdditional && Translations.EnglishAdditional.locale) {
                $translateProvider.translations('en', $.extend(Translations.English.locale, Translations.EnglishAdditional.locale));
            } else {
                $translateProvider.translations('en', Translations.English.locale);
            }
            $translateProvider.preferredLanguage('nl');
            // Enable escaping of HTML
            $translateProvider.useSanitizeValueStrategy('escape');
        })
        .config($languagesProvider => {
            // Defines the GUI languages that you wish to use in your project.
            // They will be available through a popup menu.
            var languages = [];
            languages.push({ key: 'nl', name: 'Nederlands', img: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAALCAIAAAD5gJpuAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAFXSURBVHjaYvzPgAD/UNlYEUAAkuTgCAAIBgJggq5VoAs1qM0vdzmMz362vezjokxPGimkEQ5WoAQEKuK71zwCCKyB4c//J8+BShn+/vv/+w/D399AEox+//8FJH/9/wUU+cUoKw20ASCAWBhEDf/LyDOw84BU//kDtgGI/oARmAHRDJQSFwVqAAggxo8fP/Ly8oKc9P8/AxjiAoyMjA8ePAAIIJZ///5BVIM0MOBWDpRlZPzz5w9AALH8gyvCbz7QBrCJAAHEyKDYX15r/+j1199//v35++/Xn7+///77DST/wMl/f4Dk378K4jx7O2cABBALw7NP77/+ev3xB0gOpOHfr99AdX9/gTVASKCGP//+8XCyMjC8AwggFoZfIHWSwpwQk4CW/AYjsKlA8u+ff////v33998/YPgBnQQQQIzAaGNg+AVGf5AYf5BE/oCjGEIyAQQYAGvKZ4C6+xXRAAAAAElFTkSuQmCC' });
            languages.push({ key: 'en', name: 'English', img: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAALCAIAAAD5gJpuAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAflJREFUeNpinDRzn5qN3uFDt16+YWBg+Pv339+KGN0rbVP+//2rW5tf0Hfy/2+mr99+yKpyOl3Ydt8njEWIn8f9zj639NC7j78eP//8739GVUUhNUNuhl8//ysKeZrJ/v7z10Zb2PTQTIY1XZO2Xmfad+f7XgkXxuUrVB6cjPVXef78JyMjA8PFuwyX7gAZj97+T2e9o3d4BWNp84K1NzubTjAB3fH0+fv6N3qP/ir9bW6ozNQCijB8/8zw/TuQ7r4/ndvN5mZgkpPXiis3Pv34+ZPh5t23//79Rwehof/9/NDEgMrOXHvJcrllgpoRN8PFOwy/fzP8+gUlgZI/f/5xcPj/69e/37//AUX+/mXRkN555gsOG2xt/5hZQMwF4r9///75++f3nz8nr75gSms82jfvQnT6zqvXPjC8e/srJQHo9P9fvwNtAHmG4f8zZ6dDc3bIyM2LTNlsbtfM9OPHH3FhtqUz3eXX9H+cOy9ZMB2o6t/Pn0DHMPz/b+2wXGTvPlPGFxdcD+mZyjP8+8MUE6sa7a/xo6Pykn1s4zdzIZ6///8zMGpKM2pKAB0jqy4UE7/msKat6Jw5mafrsxNtWZ6/fjvNLW29qv25pQd///n+5+/fxDDVbcc//P/zx/36m5Ub9zL8+7t66yEROcHK7q5bldMBAgwADcRBCuVLfoEAAAAASUVORK5CYII=' });
            //languages.push({ key: 'de', name: 'Deutsch', img: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAALCAIAAAD5gJpuAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAGzSURBVHjaYvTxcWb4+53h3z8GZpZff/79+v3n/7/fDAz/GHAAgABi+f37e3FxOZD1Dwz+/v3z9y+E/AMFv3//+Qumfv9et241QACxMDExAVWfOHkJJAEW/gUEP0EQDn78+AHE/gFOQJUAAcQiy8Ag8O+fLFj1n1+/QDp+/gQioK7fP378+vkDqOH39x9A/RJ/gE5lAAhAYhzcAACCQBDkgRXRjP034R0IaDTZTFZn0DItot37S94KLOINerEcI7aKHAHE8v/3r/9//zIA1f36/R+o4tevf1ANYNVA9P07RD9IJQMDQACxADHD3z8Ig4GMHz+AqqHagKp//fwLVA0U//v7LwMDQACx/LZiYFD7/5/53/+///79BqK/EMZ/UPACSYa/v/8DyX9A0oTxx2EGgABi+a/H8F/m339BoCoQ+g8kgRaCQvgPJJiBYmAuw39hxn+uDAABxMLwi+E/0PusRkwMvxhBGoDkH4b/v/+D2EDyz///QB1/QLb8+sP0lQEggFh+vGXYM2/SP6A2Zoaf30Ex/J+PgekHwz9gQDAz/P0FYrAyMfz7wcDAzPDtFwNAgAEAd3SIyRitX1gAAAAASUVORK5CYII=' });
            $languagesProvider.setLanguages(languages);
        })
        .controller('appCtrl', AppCtrl);
}
