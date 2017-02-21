module WodkRightPanel {

    var DEFAULT_SECTION_ID = '__info';
    var DEFAULT_SECTION_TITLE = '';
    var STREETVIEW_IMG_URL = 'https://maps.googleapis.com/maps/api/streetview?size=360x220&location=';
    var STREETVIEW_LINK_URL = 'http://maps.google.com/maps?q=';

    export interface IPropertyTableSection {
        title: string;
        id: string;
        headers: string[];
        rows: IPropertyTableRow[];
    }

    export interface IPropertyTableRow {
        title: string;
        label: string;
        type: string;
        values: any[];
    }

    export class PropertyTable {
        public title: string;
        public sections: IPropertyTableSection[] = [];
        public streetview: string;

        constructor(private layerService: csComp.Services.LayerService, private timeoutService: ng.ITimeoutService, private http: ng.IHttpService) {
            this.clearTable();
        }

        private clearTable() {
            this.title = '';
            this.sections.length = 0;
            this.createSection(DEFAULT_SECTION_TITLE, DEFAULT_SECTION_ID);
        }

        private createSection(title: string, id ? : string): IPropertyTableSection {
            let section: IPropertyTableSection = {
                title: title,
                id: id || title,
                headers: [],
                rows: []
            };
            this.sections.push(section);
            return section;
        }

        private findOrCreateSection(id: string): IPropertyTableSection {
            let section = _.findWhere(this.sections, {
                'id': id
            });
            if (!section) {
                section = this.createSection(id);
            }
            return section;
        }

        private removeDuplicateAndEmptyRows() {
            this.sections.forEach((section, index) => {
                section.rows = _.uniq(section.rows, false, (row) => {
                    return row.label;
                });
            });
            this.sections = this.sections.filter((section) => {
                return section.rows.length > 0;
            });
        }

        public displayFeature = _.debounce(this.displayFeatureDebounced, 500, true);

        private displayFeatureDebounced(f: IFeature) {
            if (!f || _.isEmpty(f)) return;
            this.timeoutService(() => {
                this.clearTable();
                this.getStreetViewImage(f);
                let fType = this.layerService.getFeatureType(f);
                let pTypes = csComp.Helpers.getPropertyTypes(fType, null);
                this.title = csComp.Helpers.getFeatureTitle(f);
                pTypes.forEach((pt: IPropertyType) => {
                    if (pt.visibleInCallOut && f.properties.hasOwnProperty(pt.label)) {
                        let sectionId = pt.section || DEFAULT_SECTION_ID;
                        let section = this.findOrCreateSection(sectionId);
                        let value;
                        switch (pt.type) {
                            case 'image':
                                value = `<img src='${f.properties[pt.label]}' style='max-height:100%;max-width:100%;'></img>`;
                                break;
                            default:
                                value = csComp.Helpers.convertPropertyInfo(pt, f.properties[pt.label]);
                                break;
                        }
                        section.rows.push({
                            title: pt.title,
                            label: pt.label,
                            type: pt.type,
                            values: [value]
                        });
                    }
                });
                this.removeDuplicateAndEmptyRows();
            }, 0);
        }

        private getStreetViewImage(f: IFeature) {
            if (!f.properties || !f.properties['Adres']) return;
            let address = f.properties['Adres'].replace('\n', ', ');
            if (this.streetview === address) return; // Already loaded image
            let imgUrl = STREETVIEW_IMG_URL.concat(address);
            let linkUrl = STREETVIEW_LINK_URL.concat(address);
            this.http.get(imgUrl, {
                    responseType: 'arraybuffer'
                })
                .then((res: any) => {
                    let blob = new Blob([res.data], {type: 'image/jpeg'});
                    this.streetview = address;
                    let urlCreator = window.URL || (<any>window).webkitURL;
                    let imageUrl = urlCreator.createObjectURL(blob);
                    (<HTMLImageElement>document.querySelector('#streetview-img')).src = imageUrl;
                    (<HTMLLinkElement>document.querySelector('#streetview-link')).href = linkUrl;
                    linkUrl
                }).catch((err) => {
                    console.warn(`Could not get streetview image: ${err}`);
                    this.streetview = null;
                });
        }
    }
}