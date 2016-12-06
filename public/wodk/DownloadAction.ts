module DownloadAction {

    import IFeature = csComp.Services.IFeature;
    import IActionOption = csComp.Services.IActionOption;

    export class DownloadActionModel implements csComp.Services.IActionService {
        public id: string = 'DownloadActionModel';
        private layerService: csComp.Services.LayerService;

        stop() { }
        addFeature(feature: IFeature) { }
        removeFeature(feature: IFeature) { }
        selectFeature(feature: IFeature) { }
        addLayer(layer : csComp.Services.IProjectLayer) {}
        removeLayer(layer : csComp.Services.IProjectLayer) {}

        getFeatureActions(feature: IFeature): IActionOption[] {
            if (feature.properties.hasOwnProperty('Name') && feature.fType && feature.fType.name.toLowerCase() === 'buurt') {
                var downloadPdfOption = <IActionOption>{
                    title: `Open rekenmodel voor buurt "${feature.properties['Name']}"`
                };
                downloadPdfOption.callback = this.downloadPdf;
                return [downloadPdfOption];
            } else if (feature.properties.hasOwnProperty('Name') && feature.fType && feature.fType.name.toLowerCase() === 'gemeente') {
                var downloadPdfOption = <IActionOption>{
                    title: `Open rekenmodel voor gemeente "${feature.properties['Name']}"`
                };
                downloadPdfOption.callback = this.downloadPdf;
                return [downloadPdfOption];
            } else {
                return [];
            }
        }

        getLayerActions(layer : csComp.Services.IProjectLayer)
        {
            return null;
        }

        getFeatureHoverActions(feature: IFeature): IActionOption[] {
            return [];
        }

        deselectFeature(feature: IFeature) { }

        updateFeature(feuture: IFeature) { }

        private downloadPdf(feature: IFeature, layerService: csComp.Services.LayerService) {
            if (!feature) return;

            function findSet(query: string, layerService: csComp.Services.LayerService, cb: Function) {
            // layerService.$http.get(`http://localhost:3002/findlzwset/${query}`)
            layerService.$http.get(`http://www.zorgopdekaart.nl/bagwoningen/public/findlzwset/${query}`)
                .success((data) => {
                    cb(data);
                })
                .error((err) => {
                    console.log(err);
                    cb();
                });
            }

            if (feature.properties.hasOwnProperty('bu_code') && feature.fType && feature.fType.name.toLowerCase() === 'buurt') {
                let wdw = window.open('','_blank');
                findSet(feature.properties['bu_code'], layerService, (set) => {
                    if (set) {
                        let url = `http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set ${set.s}.pdf#page=${set.p}`;
                        wdw.location.href = url;
                    }
                });
            }
            if (feature.properties.hasOwnProperty('GM_CODE') && feature.fType && feature.fType.name.toLowerCase() === 'gemeente') {
                let wdw = window.open('','_blank');
                findSet(feature.properties['GM_CODE'], layerService, (set) => {
                    if (set) {
                        let url = `http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set ${set.s}.pdf#page=${set.p}`;
                        wdw.location.href = url;
                    }
                });
            }
        }

        public init(layerService: csComp.Services.LayerService) {
            console.log('init DownloadActionService');
        }
    }
}
