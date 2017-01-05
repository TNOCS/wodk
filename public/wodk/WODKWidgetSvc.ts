module wodk {

    export enum AdministrationLevel {
        pand = 0,
            buurt = 1,
            wijk = 2,
            gemeente = 3,
            provincie = 4,
            land = 5
    }

    export interface IAddressResult {
        administrative: string;
        name: string;
        score: number;
        coordinates: number[];
        administrationLevel: AdministrationLevel;
        bu_code ? : string;
    }

    export interface IPlacesResult {
        name: string;
        administrative: string;
        city ? : string;
        country ? : string;
        countryCode ? : string;
        type: string;
        latlng: {
            lat: number,
            lng: number
        };
        postcode ? : string;
        highlight: any;
        hit: any;
        hitIndex: number;
        query: string;
        rawAnswer: any;
        value: string;
        bu_naam ? : string;
        bu_code ? : string;
        gm_naam ? : string;
    }

    export var WODK_MAP_PADDING = {
        paddingBottomRight: new L.Point(610, 0),
        paddingTopLeft: new L.Point(0, 105)
    };

    // export var SEARCH_GEMEENTE_URL = 'searchgemeente';
    // export var SEARCH_BUURT_URL = 'searchbuurt';
    // export var SEARCH_PAND_URL = 'searchpand';

    export var SEARCH_GEMEENTE_URL = 'http://zorgopdekaart.nl/bagwoningen/public/searchgemeente';
    export var SEARCH_BUURT_URL = 'http://zorgopdekaart.nl/bagwoningen/public/searchbuurt';
    export var SEARCH_PAND_URL = 'http://zorgopdekaart.nl/bagwoningen/public/searchpand';

    export class WODKWidgetSvc {
        static $inject = [
            '$rootScope',
            '$translate',
            'layerService',
            'messageBusService',
            'mapService',
            'dashboardService',
            '$http'
        ];

        /**
         * We only want to zoom to a feature, when it was selected through the 
         * search bar, not when it was clicked on the map. Therefore, we set
         * this flag when a search has been performed, such that we can zoom
         * to the selected features and then clear this flag again.
         */
        public zoomNextFeatureFlag: boolean = false;
        public lastLoadedAddress: IAddressResult;
        protected lastSelectedName: string;
        protected lastSelectedType: string;
        protected gemeenteSelectie: IFeature[];
        protected buurtSelectie: IFeature[];
        protected selectionHistory: IFeature[];
        protected forwardHistory: IFeature[];
        private htmlStyle = '<div style="display:inline-block;vertical-align:middle;text-align:center;background:{{bgColor}};width:28px;height:28px;border-radius:50% 0 0 50%;border-style:solid;border-color:rgba(0,0,150,1);border-width:2px;opacity:1;box-shadow:2px 3px 6px 0px rgba(0,0,0,0.75);"><img src="images/i.png" style="width:24px;height:24px;display:block;"></div>';
        private htmlStyleInvisible = '<div style="display:inline-block;width:2px;height:2px;"></div>';
        private rightPanel = {
            'id': 'wodkright',
            'title': 'Rechterpaneel',
            'directive': 'wodkrightpanel',
            'enabled': true,
            'style': 'vws-white',
            'position': 'rightpanel',
            'icon': 'home',
            'data': {}
        };

        constructor(
            private $rootScope: ng.IRootScopeService,
            private $translate: ng.translate.ITranslateService,
            private $layerService: csComp.Services.LayerService,
            private $messageBusService: csComp.Services.MessageBusService,
            private $mapService: csComp.Services.MapService,
            private dashboardService: csComp.Services.DashboardService,
            private $http: ng.IHttpService) {

            this.dashboardService.widgetTypes['wodkwidget'] = < csComp.Services.IWidget > {
                id: 'wodkwidget',
                icon: 'images/wodkwidget.png',
                description: 'Show wodkwidget'
            }

            this.forwardHistory = [];
            this.selectionHistory = [];
            this.gemeenteSelectie = [];
            this.buurtSelectie = [];

            this.$messageBusService.subscribe('wodk', (title, value: any) => {
                switch (title) {
                    case 'back':
                        this.stepBack();
                        break;
                    case 'forward':
                        this.stepForward();
                        break;
                    case 'refresh':
                        this.clearHistory();
                        this.$layerService.actionService.execute('reload project');
                        break;
                    case 'home':
                        location.href = 'http://www.zorgopdekaart.nl';
                        break;
                    case 'address':
                        this.loadAddress(value);
                        break;
                    default:
                        break;
                }
            });

            this.$messageBusService.subscribe('project', (action: string) => {
                if (action === 'loaded') {
                    //Hide icons on large zoomlevels
                    this.$mapService.map.on('zoomend', (map) => {
                        if (this.$mapService.map.getZoom() < 10) {
                            this.$layerService.project.features.forEach((f) => {
                                if (f.geometry && f.geometry.type.toLowerCase() === 'point') {
                                    if (f.htmlStyle && f.htmlStyle !== this.htmlStyleInvisible) {
                                        f.htmlStyle = this.htmlStyleInvisible;
                                        this.$layerService.activeMapRenderer.updateFeature(f);
                                    }
                                }
                            })
                        } else {
                            this.$layerService.project.features.forEach((f) => {
                                if (f.geometry && f.geometry.type.toLowerCase() === 'point') {
                                    if (f.htmlStyle === this.htmlStyleInvisible) {
                                        f.htmlStyle = this.htmlStyle;
                                        this.replaceIconColor(f);
                                        this.$layerService.activeMapRenderer.updateFeature(f);
                                    }
                                }
                            })
                        }
                    });

                    // NOTE EV: You may run into problems here when calling this inside an angular apply cycle.
                    // Alternatively, check for it or use (dependency injected) $timeout.
                    if ($rootScope.$$phase !== '$apply' && $rootScope.$$phase !== '$digest') {
                        $rootScope.$apply();
                    }
                    //$rootScope.$apply();
                }
            });
        }

        public getGemeenteSelectionHistory() {
            return this.selectionHistory;
        }

        public getSelectionHistory() {
            return this.selectionHistory;
        }

        public getLastSelectedName() {
            return this.lastSelectedName;
        }

        public getLastSelectedType() {
            return this.lastSelectedType;
        }

        public selecteerProvincie() {
            var l = this.$layerService.findLayer('provincie');
            var f = this.$layerService.lastSelectedFeature;
            if (!l || !f || !f.properties || !f.properties['Name']) return;
            this.lastSelectedName = f.properties['Name'];
            this.lastSelectedType = 'provincie';
        }

        public laadBuurten(fitMap: boolean = false) {
            // Load buurten by gemeente
            var l = this.$layerService.findLayer('bagbuurten');
            var f = this.$layerService.lastSelectedFeature;
            if (!l || !f || !f.properties || !f.properties['GM_CODE']) return;
            if (f.geometry.type.toLowerCase() === 'point') return;
            this.selectionHistory.push(JSON.parse(JSON.stringify(csComp.Services.Feature.serialize(f))));
            this.gemeenteSelectie.push(JSON.parse(JSON.stringify(csComp.Services.Feature.serialize(f))));
            this.lastSelectedType = 'gemeente';
            this.lastSelectedName = f.properties['Name'];
            var fClone: IFeature = csComp.Services.Feature.serialize(f);
            // Replace polygon gemeente by polyline
            var gl = this.$layerService.findLayer('gemeente');
            this.$layerService.removeFeature(f);
            if (gl && gl.data && gl.data.features) {
                // fClone.geometry.type = (fClone.geometry.type === 'Polygon' ? 'LineString' : 'MultiLineString');
                // if (fClone.geometry.type === 'LineString') {
                //     fClone.geometry.coordinates = fClone.geometry.coordinates[0];
                // } else {
                //     fClone.geometry.coordinates = _.map(fClone.geometry.coordinates, (poly) => { return poly[0]; })
                // }
                if (fClone.geometry.type.toLowerCase() !== 'point') {
                    fClone.properties['_contour'] = JSON.stringify(fClone.geometry);
                    fClone.geometry = csComp.Helpers.GeoExtensions.getEastmostCoordinate(fClone.geometry.coordinates);
                }
                gl.data.features.push(fClone);
                this.$layerService.initFeature(fClone, gl);
                fClone.htmlStyle = this.htmlStyle;
                this.replaceIconColor(fClone);
                this.$layerService.activeMapRenderer.addFeature(fClone);
                this.$messageBusService.publish('feature', 'onUpdateWidgets', fClone);
                if (this.$layerService.$rootScope.$$phase !== '$apply' && this.$layerService.$rootScope.$$phase !== '$digest') {
                    this.$layerService.$rootScope.$apply();
                }
            }
            this.lastLoadedAddress = {
                administrationLevel: AdministrationLevel.gemeente,
                bu_code: f.properties['GM_CODE'],
                name: this.lastSelectedName,
                score: 0.99,
                administrative: 'Nederland',
                coordinates: f.geometry.coordinates
            };
            this.openRightPanel();

            if (!l.dataSourceParameters) l.dataSourceParameters = {};
            l.dataSourceParameters['searchProperty'] = f.properties['GM_CODE'];
            if (this.$layerService.findLoadedLayer(l.id)) {
                this.$layerService.layerSources[l.type.toLowerCase()].refreshLayer(l);
                // this.$messageBusService.publish('updatelegend', 'update', _.find(l.group.styles, (s) => { return s.enabled; }));
                if (this.zoomNextFeatureFlag) {
                    this.zoomToLayer(l, this.gemeenteSelectie[this.gemeenteSelectie.length - 1]);
                    this.zoomNextFeatureFlag = false;
                }
            } else {
                this.$layerService.addLayer(l, () => {
                    var group = this.$layerService.findGroupById('buurten');
                    if (typeof group === 'undefined') return;
                    var propType = this.$layerService.findPropertyTypeById('data/resourceTypes/Buurt.json#p_apb_w');
                    if (typeof propType === 'undefined') return;
                    this.$layerService.setGroupStyle(group, propType);
                    // Only fit map for the first gemeente, or when the zoomNextFeatureFlag parameter = true
                    if (this.zoomNextFeatureFlag) {
                        fitMap = true;
                        this.zoomNextFeatureFlag = false;
                    } else if (this.gemeenteSelectie.length <= 1 && l && l.data && l.data.features && l.data.features.length > 0) {
                        fitMap = true;
                    }
                    if (fitMap) {
                        this.zoomToLayer(l);
                    }
                });
            }
        };

        public laadWoningen() {
            // Load woningen by buurt
            var l = this.$layerService.findLayer('bagcontouren');
            var f = this.$layerService.lastSelectedFeature;
            if (!l || !f || !f.geometry || !f.geometry.coordinates) return;
            if (f.geometry.type.toLowerCase() === 'point') {
                this.$layerService.visual.rightPanelVisible = false;
                return;
            }
            // var b: L.LatLngBounds = <L.LatLngBounds>csComp.Helpers.GeoExtensions.getFeatureBounds(f);
            // this.$layerService.map.getMap().fitBounds(b);
            // this.$layerService.centerFeatureOnMap(this.$layerService.selectedFeatures);
            // this.$layerService.map.getMap().setZoom(15);
            this.selectionHistory.push(JSON.parse(JSON.stringify(csComp.Services.Feature.serialize(f))));
            this.buurtSelectie.push(JSON.parse(JSON.stringify(csComp.Services.Feature.serialize(f))));
            this.lastSelectedType = 'buurt';
            this.lastSelectedName = f.properties['Name'];
            this.lastLoadedAddress = {
                administrationLevel: AdministrationLevel.buurt,
                bu_code: f.properties['bu_code'],
                name: this.lastSelectedName,
                score: 0.99,
                administrative: f.properties['gm_naam'],
                coordinates: f.geometry.coordinates
            };
            var fClone: IFeature = csComp.Services.Feature.serialize(f);
            // Replace polygon buurt by polyline
            var bl = this.$layerService.findLayer('bagbuurten');
            // if (bl.group.filters) {
            //     bl.group.filters.forEach((fil) => {
            //         this.$layerService.removeFilter(fil);
            //     });
            // }
            this.$layerService.removeFeature(f);
            if (bl && bl.data && bl.data.features) {
                // fClone.geometry.type = (fClone.geometry.type === 'Polygon' ? 'LineString' : 'MultiLineString');
                // if (fClone.geometry.type === 'LineString') {
                //     fClone.geometry.coordinates = fClone.geometry.coordinates[0];
                // } else {
                //     fClone.geometry.coordinates = _.map(fClone.geometry.coordinates, (poly) => { return poly[0]; })
                // }
                if (fClone.geometry.type.toLowerCase() !== 'point') {
                    fClone.properties['_contour'] = JSON.stringify(fClone.geometry);
                    fClone.geometry = csComp.Helpers.GeoExtensions.getNorthmostCoordinate(fClone.geometry.coordinates);
                }
                bl.data.features.push(fClone);
                this.$layerService.initFeature(fClone, bl);
                fClone.htmlStyle = this.htmlStyle;
                this.replaceIconColor(fClone);
                this.$layerService.activeMapRenderer.addFeature(fClone);
                this.$messageBusService.publish('feature', 'onUpdateWidgets', fClone);
                this.openRightPanel();
                if (this.$layerService.$rootScope.$$phase !== '$apply' && this.$layerService.$rootScope.$$phase !== '$digest') {
                    this.$layerService.$rootScope.$apply();
                }
            }

            if (!l.dataSourceParameters) l.dataSourceParameters = {};
            l.dataSourceParameters['searchProperty'] = f.properties['bu_code'];
            if (this.$layerService.findLoadedLayer(l.id)) {
                this.$layerService.layerSources[l.type.toLowerCase()].refreshLayer(l);
                // this.$layerService.layerSources[l.type.toLowerCase()].fitMap(l);
                // Only fit map for the first buurt
                if (this.buurtSelectie.length <= 1 && l && l.data && l.data.features && l.data.features.length > 0) {
                    this.zoomToFeature(this.buurtSelectie[this.buurtSelectie.length - 1]);
                }
                // this.$messageBusService.publish('updatelegend', 'update', _.find(l.group.styles, (s) => { return s.enabled; }));
            } else {
                this.$layerService.addLayer(l, () => {
                    var group = this.$layerService.findGroupById('BAG');
                    if (typeof group === 'undefined') return;
                    var propType = this.$layerService.findPropertyTypeById('data/resourceTypes/BagPanden.json#ster_gem');
                    if (typeof propType === 'undefined') return;
                    this.$layerService.setGroupStyle(group, propType);
                    // Only fit map for the first buurt
                    if (this.buurtSelectie.length <= 1 && l && l.data && l.data.features && l.data.features.length > 0) {
                        this.zoomToFeature(this.buurtSelectie[this.buurtSelectie.length - 1]);
                    }
                    // var b = csComp.Helpers.GeoExtensions.getFeatureBounds(fClone);
                    // this.$layerService.map.map.fitBounds(<any>b);
                    // this.$.layerSources[l.type.toLowerCase()].fitMap(l);
                });
            }
        }

        public loadAddress(searchResult: IPlacesResult) {
            let address: IAddressResult = {
                administrative: searchResult.administrative || '',
                name: searchResult.name || '',
                score: 0.99,
                coordinates: [searchResult.latlng.lng || 0, searchResult.latlng.lat || 0],
                administrationLevel: AdministrationLevel.pand,
                bu_code: searchResult.bu_code
            };
            this.lastLoadedAddress = address;
            switch (searchResult.type) {
                case 'address':
                    address.administrationLevel = AdministrationLevel.pand;
                    break;
                case 'buurt':
                    address.administrationLevel = AdministrationLevel.buurt;
                    break;
                case 'city':
                    address.administrationLevel = AdministrationLevel.gemeente;
                    break;
                case 'country':
                    address.administrationLevel = AdministrationLevel.land;
                    break;
                default:
                    break;
            }
            let geojson = JSON.stringify({
                type: 'Point',
                coordinates: address.coordinates,
                crs: {
                    type: "name",
                    properties: {
                        name: "EPSG:4326"
                    }
                }
            });
            var data = {
                geojson: geojson,
                address: address
            };
            this.findGemeente(data)
                .then(this.selectGemeente.bind(this))
                .then(this.findBuurt.bind(this))
                .then(this.selectBuurt.bind(this))
                .then(this.findPand.bind(this))
                .then(this.selectPand.bind(this))
                .catch((err) => {
                    if (typeof err === 'string') {
                        console.log(`Be happy with the area, don't search for a specific address`);
                    } else {
                        console.log('Error while loading address: ' + err.message);
                    }
                    if (address.coordinates && address.administrationLevel === AdministrationLevel.pand) {
                        this.$mapService.getMap().flyTo(new L.LatLng(address.coordinates[1], address.coordinates[0]), 18, WODK_MAP_PADDING);
                    }
                    this.openRightPanel();
                })
                .done((finished) => {
                    if (finished) {
                        console.log('Finished address search');
                    }
                });
        }

        private openRightPanel() {
            let w = this.rightPanel;
            let rpt = csComp.Helpers.createRightPanelTab(w.id, w.directive, w.data, w.title, '{{"FEATURE_INFO" | translate}}', w.icon, true, false);
            rpt.open = true;
            this.$messageBusService.publish('rightpanel', 'activate', rpt);
        }

        private findGemeente(data: {
            geojson: string,
            address: IAddressResult
        }): Q.Promise < any > {
            let cb = Q.defer();
            let urlData = (data.address.administrationLevel === AdministrationLevel.buurt) ? {
                bu_code: data.address.bu_code
            } : {
                loc: data.geojson
            };
            this.$http({
                method: 'POST',
                url: SEARCH_GEMEENTE_URL,
                data: urlData,
            }).then((response) => {
                if (response) {
                    data['gm_code'] = response.data['gm_code'];
                    cb.resolve(data);
                    // cb(response.data['gm_code']);
                } else {
                    cb.reject(new Error(`Gemeente not found.`));
                }
            }, (error) => {
                console.log(error);
                cb.reject(new Error(`Gemeente not found.`));
            });
            return cb.promise;
        }

        private findBuurt(data: {
            geojson: string,
            address: IAddressResult,
            gm_code: string
        }): Q.Promise < any > {
            let cb = Q.defer();
            if (data.address.administrationLevel <= AdministrationLevel.buurt) {
                if (data.address.bu_code) {
                    data['bu_code'] = data.address.bu_code;
                    cb.resolve(data);
                } else {
                    this.$http({
                        method: 'POST',
                        url: SEARCH_BUURT_URL,
                        data: {
                            loc: data.geojson
                        },
                    }).then((response) => {
                        if (response) {
                            data['bu_code'] = response.data['bu_code'];
                            cb.resolve(data);
                        } else {
                            cb.reject(new Error(`Buurt not found in ${data.gm_code}.`));
                        }
                    }, (error) => {
                        console.log(error);
                        cb.reject(new Error(`Buurt not found in ${data.gm_code}.`));
                    });
                }
            } else {
                cb.reject('Too specific');
            }
            return cb.promise;
        }

        private findPand(data: {
            geojson: string,
            address: IAddressResult,
            gm_code: string,
            bu_code: string
        }): Q.Promise < any > {
            let cb = Q.defer();
            if (data.address.administrationLevel <= AdministrationLevel.pand) {
                this.$http({
                    method: 'POST',
                    url: SEARCH_PAND_URL,
                    data: {
                        loc: data.geojson
                    },
                }).then((response) => {
                    if (response && response.data && response.data.hasOwnProperty('identificatie')) {
                        data['identificatie'] = response.data['identificatie'];
                        cb.resolve(data);
                    } else {
                        this.$messageBusService.notify('Adres niet gevonden', `Het pand behorende bij het adres '${data.address.name}' kon niet worden gevonden.`);
                        cb.reject(new Error(`Pand not found in ${data.bu_code}.`));
                        cb.resolve(data);
                    }
                }, (error) => {
                    console.log(error);
                    cb.reject(new Error(`Pand not found in ${data.bu_code}.`));
                });
            } else {
                cb.reject('Too specific');
            }
            return cb.promise;
        }

        private selectGemeente(data: {
            geojson: string,
            address: IAddressResult,
            gm_code: string,
            bu_code: string
        }): Q.Promise < any > {
            let cb = Q.defer();
            let f = this.$layerService.findFeatureByPropertyValue('GM_CODE', data.gm_code);
            if (f) {
                // If gemeente is already loaded
                if (f.geometry && f.geometry.type.toLowerCase() === 'point') {
                    cb.resolve(data);
                } else {
                    let handle = this.$messageBusService.subscribe('layer', (topic, layer) => {
                        if (topic === 'activated' && layer.id === 'bagbuurten') {
                            cb.resolve(data);
                            this.$messageBusService.unsubscribe(handle);
                        }
                    });
                    this.$layerService.selectFeature(f);
                }
            } else {
                cb.reject(new Error(`Feature with GM_CODE ${data.gm_code} not found.`));
            }
            return cb.promise;
        }

        private selectBuurt(data: {
            geojson: string,
            address: IAddressResult,
            gm_code: string,
            bu_code: string
        }): Q.Promise < any > {
            let cb = Q.defer();
            setTimeout(() => {
                let f = this.$layerService.findFeatureByPropertyValue('bu_code', data.bu_code);
                if (f) {
                    // If buurt is already loaded
                    if (f.geometry && f.geometry.type.toLowerCase() === 'point') {
                        cb.resolve(data);
                    } else {
                        let handle = this.$messageBusService.subscribe('layer', (topic, layer) => {
                            if (topic === 'activated' && layer.id === 'bagcontouren') {
                                cb.resolve(data);
                                this.$messageBusService.unsubscribe(handle);
                            }
                        });
                        this.$layerService.selectFeature(f);
                    }
                } else {
                    cb.reject(new Error(`Feature with bu_code ${data.bu_code} not found.`));
                }
            }, 500);
            return cb.promise;
        }

        private selectPand(data: {
            geojson: string,
            address: IAddressResult,
            gm_code: string,
            bu_code: string,
            identificatie: string
        }): Q.Promise < any > {
            let cb = Q.defer();
            setTimeout(() => {
                let f = this.$layerService.findFeatureById('c_' + data.identificatie);
                if (f) {
                    this.$layerService.selectFeature(f);
                    let geometry = csComp.Helpers.GeoExtensions.getCentroid(f.geometry.coordinates);
                    this.$mapService.getMap().flyTo(new L.LatLng(geometry.coordinates[1], geometry.coordinates[0]), 18, WODK_MAP_PADDING);
                    cb.resolve(data);
                } else {
                    cb.reject(new Error(`Feature with identificatie ${data.identificatie} not found.`));
                }
            }, 500);
            return cb.promise;
        }

        /***
         * Zoom to the supplied layer. Optionally supply an additional feature to be included in the bounds area.
         */
        private zoomToLayer(l: csComp.Services.ProjectLayer, f ? : IFeature) {
            setTimeout(() => {
                let features: IFeature[] = (f) ? _.union(l.data.features, [f]) : l.data.features;
                let b = csComp.Helpers.GeoExtensions.getBoundingBox(features);
                if (b.xMax == 180 || b.yMax == 90) return;
                this.$mapService.getMap().flyToBounds(new L.LatLngBounds(b.southWest, b.northEast), WODK_MAP_PADDING);
            }, 100);
        }

        public zoomToFeature(f: IFeature) {
            let l = < csComp.Services.ProjectLayer > {
                data: {
                    features: [f],
                    type: "FeatureCollection"
                }
            };
            this.zoomToLayer(l);
        }

        public hasForwardHistory() {
            return (this.forwardHistory && this.forwardHistory.length > 0);
        }

        public clearHistory() {
            this.selectionHistory.length = 0;
            this.forwardHistory.length = 0;
            this.gemeenteSelectie.length = 0;
            this.buurtSelectie.length = 0;
            this.lastSelectedName = null;
            this.lastSelectedType = null;
        }

        public stepForward() {
            if (!this.forwardHistory || this.forwardHistory.length === 0) return;
            var f: IFeature = this.forwardHistory.pop();
            this.$layerService.selectFeature(this.$layerService.findFeatureById(f.id));
        }

        public stepBack() {
            // Step back in history
            if (this.selectionHistory.length === 0) {
                this.$layerService.checkViewBounds();
                return;
            }
            // Restore item from history
            var lastItem: IFeature = this.selectionHistory.pop();
            if (!lastItem.id || !lastItem.layerId) return;
            this.forwardHistory.push(JSON.parse(JSON.stringify(lastItem)));
            this.lastSelectedType = null;
            if (this.selectionHistory.length === 0) {
                this.lastSelectedType = 'gemeente';
            } else {
                let firstToLastItem: IFeature = this.selectionHistory[this.selectionHistory.length - 1];
                if (firstToLastItem.layerId === 'bagbuurten') {
                    this.lastSelectedType = 'buurt';
                } else {
                    this.lastSelectedType = 'gemeente';
                }
            }
            // if (lastItem.layerId === 'bagbuurten') this.lastSelectedType = 'gemeente'; // Todo: just use layerid
            this.lastSelectedName = lastItem.properties['Name'] || 'onbekend';
            (lastItem.layerId === 'gemeente' ? this.gemeenteSelectie.pop() : this.buurtSelectie.pop());
            var l = this.$layerService.findLoadedLayer(lastItem.layerId);
            var replacementFeature = this.$layerService.findFeature(l, lastItem.id);
            this.$layerService.removeFeature(replacementFeature);
            l.data.features.push(lastItem);
            this.$layerService.initFeature(lastItem, l);
            this.$layerService.activeMapRenderer.addFeature(lastItem);
            switch (lastItem.layerId) {
                case 'gemeente':
                    var buurtLayer = this.$layerService.findLoadedLayer('bagbuurten');
                    if (!buurtLayer) break;
                    var featsToRemove = _.filter(buurtLayer.data.features, (f: IFeature) => {
                        return (f.properties['gm_code_2015'] && f.properties['gm_code_2015'] === lastItem.properties['GM_CODE'])
                    });
                    // featsToRemove.forEach((f) => {
                    //     this.$layerService.removeFeature(f);
                    // });
                    this.$layerService.removeFeatureBatch(_.map(featsToRemove, (val, key) => {
                        return val.id;
                    }), buurtLayer);
                    if (this.$layerService.$mapService.map.getZoom() > 13) this.$layerService.$mapService.map.setZoom(13);
                    break;
                case 'bagbuurten':
                    var bagLayer = this.$layerService.findLoadedLayer('bagcontouren');
                    if (!bagLayer) break;
                    var featsToRemove = _.filter(bagLayer.data.features, (f: IFeature) => {
                        return (f.properties['buurtcode'] && f.properties['buurtcode'] === lastItem.properties['bu_code'])
                    });
                    this.$layerService.removeFeatureBatch(_.map(featsToRemove, (val, key) => {
                        return val.id;
                    }), bagLayer);
                    // featsToRemove.forEach((f) => {
                    //     this.$layerService.removeFeature(f);
                    // });
                    if (this.$layerService.$mapService.map.getZoom() > 14) this.$layerService.$mapService.map.setZoom(14);
                    break;
            }
            // Update legend
            if (this.selectionHistory.length > 0) {
                var legendFeature;
                if (this.lastSelectedType === 'gemeente') {
                    var buurtLayer = this.$layerService.findLoadedLayer('bagbuurten');
                    this.$messageBusService.publish('updatelegend', 'update', _.find(buurtLayer.group.styles, (s) => {
                        return s.enabled;
                    }));
                } else if (this.lastSelectedType === 'buurt') {
                    var woningLayer = this.$layerService.findLoadedLayer('bagcontouren');
                    this.$messageBusService.publish('updatelegend', 'update', _.find(woningLayer.group.styles, (s) => {
                        return s.enabled;
                    }));
                } else {
                    this.$messageBusService.publish('updatelegend', 'update', _.find(l.group.styles, (s) => {
                        return s.enabled;
                    }));
                }
                let lastSelectedItem: IFeature = (this.selectionHistory.length > 0 ? this.selectionHistory[this.selectionHistory.length - 1] : lastItem);
                lastSelectedItem = _.find(this.$layerService.project.features, (f: IFeature) => {
                    return lastSelectedItem.id === f.id;
                });
                lastSelectedItem.isSelected = true;
                this.$messageBusService.publish('feature', 'onUpdateWidgets', lastSelectedItem);
            } else {
                this.$messageBusService.publish('updatelegend', 'hidelegend');
            }

            if (this.$rootScope.$$phase !== '$apply' && this.$rootScope.$$phase !== '$digest') {
                this.$rootScope.$apply();
            };
        };

        public setLastSelectedName(name: string) {
            this.lastSelectedName = name;
        }

        private replaceIconColor(f: IFeature) {
            switch (f.fType.name) {
                case 'Buurt':
                    f.htmlStyle = f.htmlStyle.replace('{{bgColor}}', 'rgba(20,150,255,1)');
                    break;
                case 'gemeente':
                    f.htmlStyle = f.htmlStyle.replace('{{bgColor}}', 'rgba(0,0,255,1)');
                case 'provincie':
                    f.htmlStyle = f.htmlStyle.replace('{{bgColor}}', 'rgba(0,0,175,1)')
                default:
                    break;
            }
        }
    }

    /**
     * Register service
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

    myModule.service('wodkWidgetSvc', wodk.WODKWidgetSvc);
}