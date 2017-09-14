module DownloadAction {

    import IFeature = csComp.Services.IFeature;
    import IActionOption = csComp.Services.IActionOption;

    export class DownloadActionModel implements csComp.Services.IActionService {
        public id: string = 'DownloadActionModel';
        private layerService: csComp.Services.LayerService;

        stop() {}
        addFeature(feature: IFeature) {}
        removeFeature(feature: IFeature) {}
        selectFeature(feature: IFeature) {}
        addLayer(layer: csComp.Services.IProjectLayer) {}
        removeLayer(layer: csComp.Services.IProjectLayer) {}

        getFeatureActions(feature: IFeature): IActionOption[] {
            if (feature.properties.hasOwnProperty('Name') && feature.fType && feature.fType.name.toLowerCase() === 'buurt') {
                var downloadPdfOption = < IActionOption > {
                    title: `Open rekenmodel voor buurt "${feature.properties['Name']}"`
                };
                downloadPdfOption.callback = this.downloadPdf;
                var downloadRapportageOption = < IActionOption > {
                    title: `Open rapportage voor buurt "${feature.properties['Name']}"`
                };
                downloadRapportageOption.callback = this.downloadRapportage;
                return [downloadPdfOption, downloadRapportageOption];
            } else if (feature.properties.hasOwnProperty('Name') && feature.fType && feature.fType.name.toLowerCase() === 'gemeente') {
                var downloadPdfOption = < IActionOption > {
                    title: `Open rekenmodel voor gemeente "${feature.properties['Name']}"`
                };
                downloadPdfOption.callback = this.downloadPdf;
                var downloadRapportageOption = < IActionOption > {
                    title: `Open rapportage voor gemeente "${feature.properties['Name']}"`
                };
                downloadRapportageOption.callback = this.downloadRapportage;
                return [downloadPdfOption, downloadRapportageOption];
            } else {
                return [];
            }
        }

        getLayerActions(layer: csComp.Services.IProjectLayer) {
            return null;
        }

        getFeatureHoverActions(feature: IFeature): IActionOption[] {
            return [];
        }

        deselectFeature(feature: IFeature) {}

        updateFeature(feuture: IFeature) {}

        private downloadRapportage(feature: IFeature, layerService: csComp.Services.LayerService) {
            if (!feature) return;

            if (feature.properties.hasOwnProperty('bu_code') && feature.fType && feature.fType.name.toLowerCase() === 'buurt') {
                let prop = feature.properties['bu_code'];
                window.open(`http://www.zorgopdekaart.nl/bagwoningen/pdfs/ra/RA_${prop}.pdf`, '_blank');
            }
            if (feature.properties.hasOwnProperty('GM_CODE') && feature.fType && feature.fType.name.toLowerCase() === 'gemeente') {
                let prop = feature.properties['GM_CODE'];
                window.open(`http://www.zorgopdekaart.nl/bagwoningen/pdfs/ra/RA_${prop}.pdf`, '_blank');
            }
        }

        private downloadPdf(feature: IFeature, layerService: csComp.Services.LayerService) {
            if (!feature) return;

            if (feature.properties.hasOwnProperty('bu_code') && feature.fType && feature.fType.name.toLowerCase() === 'buurt') {
                let prop = feature.properties['bu_code'];
                window.open(`http://www.zorgopdekaart.nl/bagwoningen/pdfs/rs/RS_${prop}.pdf`, '_blank');
            }
            if (feature.properties.hasOwnProperty('GM_CODE') && feature.fType && feature.fType.name.toLowerCase() === 'gemeente') {
                let prop = feature.properties['GM_CODE'];
                window.open(`http://www.zorgopdekaart.nl/bagwoningen/pdfs/rs/RS_${prop}.pdf`, '_blank');
            }
        }

        public init(layerService: csComp.Services.LayerService) {
            console.log('init DownloadActionService');
        }
    }
}