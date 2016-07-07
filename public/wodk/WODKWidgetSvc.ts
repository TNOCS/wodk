module wodk {
    export class WODKWidgetSvc {
        static $inject = [
            '$rootScope',
            'layerService',
            'messageBusService',
            'mapService',
            'dashboardService',
            '$http'
        ];

        protected lastSelectedName: string;
        protected lastSelectedType: string;
        protected gemeenteSelectie: IFeature[];
        protected buurtSelectie: IFeature[];
        protected selectionHistory: IFeature[];
        protected forwardHistory: IFeature[];
        private htmlStyle = '<div style="display:inline-block;vertical-align:middle;text-align:center;background:rgba(0,0,255,1);width:28px;height:28px;border-radius:50% 0 0 50%;border-style:solid;border-color:rgba(0,0,150,1);border-width:2px;opacity:1;box-shadow:2px 3px 6px 0px rgba(0,0,0,0.75);"><img src="images/i.png" style="width:24px;height:24px;display:block;"></div>';
        private htmlStyleInvisible = '<div style="display:inline-block;width:2px;height:2px;"></div>';

        constructor(
            private $rootScope: ng.IRootScopeService,
            private $layerService: csComp.Services.LayerService,
            private $messageBusService: csComp.Services.MessageBusService,
            private $mapService: csComp.Services.MapService,
            private dashboardService: csComp.Services.DashboardService,
            private $http: ng.IHttpService) {

            this.dashboardService.widgetTypes['wodkwidget'] = <csComp.Services.IWidget>{
                id: 'wodkwidget',
                icon: 'images/wodkwidget.png',
                description: 'Show wodkwidget'
            }

            this.forwardHistory = [];
            this.selectionHistory = [];
            this.gemeenteSelectie = [];
            this.buurtSelectie = [];

            this.$messageBusService.subscribe('project', (action: string) => {
                if (action === 'loaded') {

                    //Hide icons on large zoomlevels
                    this.$mapService.map.on('zoomend', (map) => {
                        if (this.$mapService.map.getZoom() < 10) {
                            this.$layerService.project.features.forEach((f) => {
                                if (f.geometry && f.geometry.type.toLowerCase() === 'point') {
                                    if (f.htmlStyle === this.htmlStyle) {
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
                                        this.$layerService.activeMapRenderer.updateFeature(f);
                                    }
                                }
                            })
                        }
                    });

                    // NOTE EV: You may run into problems here when calling this inside an angular apply cycle.
                    // Alternatively, check for it or use (dependency injected) $timeout.
                    if ($rootScope.$$phase !== '$apply' && $rootScope.$$phase !== '$digest') { $rootScope.$apply(); }
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

        public laadBuurten() {
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
                this.$layerService.activeMapRenderer.addFeature(fClone);
                this.$messageBusService.publish('feature', 'onUpdateWidgets', fClone);
                if (this.$layerService.$rootScope.$$phase !== '$apply' && this.$layerService.$rootScope.$$phase !== '$digest') { this.$layerService.$rootScope.$apply(); }
            }

            if (!l.dataSourceParameters) l.dataSourceParameters = {};
            l.dataSourceParameters['searchProperty'] = f.properties['GM_CODE'];
            if (this.$layerService.findLoadedLayer(l.id)) {
                this.$layerService.layerSources[l.type.toLowerCase()].refreshLayer(l);
                this.$messageBusService.publish('updatelegend', 'update', _.find(l.group.styles, (s) => { return s.enabled; }));
            } else {
                this.$layerService.addLayer(l, () => {
                    var group = this.$layerService.findGroupById('buurten');
                    if (typeof group === 'undefined') return;
                    var propType = this.$layerService.findPropertyTypeById('data/resourceTypes/Buurt.json#p_apb_w');
                    if (typeof propType === 'undefined') return;
                    this.$layerService.setGroupStyle(group, propType);
                    this.$layerService.layerSources[l.type.toLowerCase()].fitMap(l);
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
            var b: L.LatLngBounds = <L.LatLngBounds>csComp.Helpers.GeoExtensions.getFeatureBounds(f);
            this.$layerService.map.getMap().fitBounds(b);
            // this.$layerService.centerFeatureOnMap(this.$layerService.selectedFeatures);
            // this.$layerService.map.getMap().setZoom(15);
            this.selectionHistory.push(JSON.parse(JSON.stringify(csComp.Services.Feature.serialize(f))));
            this.buurtSelectie.push(JSON.parse(JSON.stringify(csComp.Services.Feature.serialize(f))));
            this.lastSelectedType = 'buurt';
            this.lastSelectedName = f.properties['Name'];
            var fClone: IFeature = csComp.Services.Feature.serialize(f);
            // Replace polygon buurt by polyline
            var bl = this.$layerService.findLayer('bagbuurten');
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
                this.$layerService.activeMapRenderer.addFeature(fClone);
                this.$messageBusService.publish('feature', 'onUpdateWidgets', fClone);
                if (this.$layerService.$rootScope.$$phase !== '$apply' && this.$layerService.$rootScope.$$phase !== '$digest') { this.$layerService.$rootScope.$apply(); }
            }

            if (!l.dataSourceParameters) l.dataSourceParameters = {};
            l.dataSourceParameters['searchProperty'] = f.properties['bu_code'];
            if (this.$layerService.findLoadedLayer(l.id)) {
                this.$layerService.layerSources[l.type.toLowerCase()].refreshLayer(l);
                this.$layerService.layerSources[l.type.toLowerCase()].fitMap(l);
                this.$messageBusService.publish('updatelegend', 'update', _.find(l.group.styles, (s) => { return s.enabled; }));
            } else {
                this.$layerService.addLayer(l, () => {
                    var group = this.$layerService.findGroupById('BAG');
                    if (typeof group === 'undefined') return;
                    var propType = this.$layerService.findPropertyTypeById('data/resourceTypes/BagPanden.json#ster_gem');
                    if (typeof propType === 'undefined') return;
                    this.$layerService.setGroupStyle(group, propType);
                    // var b = csComp.Helpers.GeoExtensions.getFeatureBounds(fClone);
                    // this.$layerService.map.map.fitBounds(<any>b);
                    // this.$.layerSources[l.type.toLowerCase()].fitMap(l);
                });
            }
        }

        public hasForwardHistory() {
            return (this.forwardHistory && this.forwardHistory.length > 0);
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
            var lastItem: IFeature = this.selectionHistory.pop();
            if (!lastItem.id || !lastItem.layerId) return;
            this.forwardHistory.push(JSON.parse(JSON.stringify(lastItem)));
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
                    var featsToRemove = _.filter(buurtLayer.data.features, (f: IFeature) => { return (f.properties['gm_code_2015'] && f.properties['gm_code_2015'] === lastItem.properties['GM_CODE']) });
                    featsToRemove.forEach((f) => {
                        this.$layerService.removeFeature(f);
                    });
                    if (this.$layerService.$mapService.map.getZoom() > 13) this.$layerService.$mapService.map.setZoom(13);
                    break;
                case 'bagbuurten':
                    var bagLayer = this.$layerService.findLoadedLayer('bagcontouren');
                    if (!bagLayer) break;
                    var featsToRemove = _.filter(bagLayer.data.features, (f: IFeature) => { return (f.properties['buurtcode'] && f.properties['buurtcode'] === lastItem.properties['bu_code']) });
                    featsToRemove.forEach((f) => {
                        this.$layerService.removeFeature(f);
                    });
                    if (this.$layerService.$mapService.map.getZoom() > 14) this.$layerService.$mapService.map.setZoom(14);
                    break;
            }
            // Update legend
            if (this.selectionHistory.length > 0) {
                var legendFeature;
                if (lastItem.layerId === 'gemeente') {
                    var buurtLayer = this.$layerService.findLoadedLayer('bagbuurten');
                    this.$messageBusService.publish('updatelegend', 'update', _.find(buurtLayer.group.styles, (s) => { return s.enabled; }));
                } else {
                    this.$messageBusService.publish('updatelegend', 'update', _.find(l.group.styles, (s) => { return s.enabled; }));
                }
                this.$messageBusService.publish('feature', 'onUpdateWidgets', lastItem);
            } else {
                this.$messageBusService.publish('updatelegend', 'hidelegend');
            }

            if (this.$rootScope.$$phase !== '$apply' && this.$rootScope.$$phase !== '$digest') { this.$rootScope.$apply(); };
        };
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