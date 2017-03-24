module WodkRightPanel {

    var DEFAULT_SECTION_ID = '__info';
    var DEFAULT_SECTION_TYPE: IPropertyTableSectionType = 'table';
    var DEFAULT_SECTION_TITLE = '';
    var STREETVIEW_IMG_URL = 'https://maps.googleapis.com/maps/api/streetview?size=360x220&location=';
    var STREETVIEW_LINK_URL = 'http://maps.google.com/maps?q=';

    export interface IPropertyTableSection {
        title: string;
        id: string;
        headers: string[];
        rows: IPropertyTableRow[];
        type: IPropertyTableSectionType;
    }

    export interface IPropertyTableRow {
        title: string;
        label: string;
        type: string;
        values: any[];
    }

    export type IPropertyTableSectionType = 'table' | 'full-row';

    export class PropertyTable {
        public title: string;
        public sections: IPropertyTableSection[] = [];
        public streetview: string;
        public showRapportLink: boolean;
        public fullRows: string[] = [];

        constructor(private wodkSvc: wodk.WODKWidgetSvc, private layerService: csComp.Services.LayerService, private timeoutService: ng.ITimeoutService) {
            this.clearTable();
        }

        public clearTable() {
            this.title = '';
            this.sections.length = 0;
            this.createSection(DEFAULT_SECTION_TITLE, DEFAULT_SECTION_TYPE, DEFAULT_SECTION_ID);
        }

        private createSection(title: string, type ? : IPropertyTableSectionType, id ? : string): IPropertyTableSection {
            let section: IPropertyTableSection = {
                title: title,
                id: id || title,
                headers: [],
                rows: [],
                type: type || 'table'
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
                section.rows = _.chain(section.rows).uniq(false, (row) => {
                    return row.label;
                }).filter((row) => {
                    return row.values.length > 0;
                }).value();
            });
            this.sections = this.sections.filter((section) => {
                return section.rows.length > 0;
            });
        }

        public displayFeature = _.throttle(this.displayFeatureDebounced, 500);

        private displayFeatureDebounced(fts: IFeature[]) {
            if (!fts || !_.isArray(fts) || fts.length < 1) return;
            this.timeoutService(() => {
                this.clearTable();
                (fts.length === 1 ? this.getStreetViewImage(fts[0]) : this.resetStreetviewImage());
                (fts.length === 1 ? this.getRapportLink(fts[0]) : this.resetRapportLink());
                let fType = this.layerService.getFeatureType(fts[0]);
                let pTypes = _.uniq(csComp.Helpers.getPropertyTypes(fType, null));
                this.title = this.getDisplayTitle(fts);
                this.fillPropertyTable(fts, pTypes);
                this.removeDuplicateAndEmptyRows();
                console.log(`Display ${fts.length} features in ${this.sections.length} sections`);
            }, 0);
        }

        private fillPropertyTable(fts: IFeature[], pTypes: IPropertyType[]) {
            let virtualFeature = this.joinFeatures(fts, pTypes);
            let pTypesDict = _.object(_.pluck(pTypes, 'label'), pTypes);
            let linkedFeatures = [];
            pTypes.forEach((pt: IPropertyType) => {
                if (pt.visibleInCallOut && virtualFeature.properties.hasOwnProperty(pt.label) && !(linkedFeatures.indexOf(pt.label) >= 0)) {
                    let sectionId = pt.section || DEFAULT_SECTION_ID;
                    let section = this.findOrCreateSection(sectionId);
                    let value;
                    switch (pt.type) {
                        case 'stars':
                            value = this.getStarsDiv(virtualFeature.properties[pt.label], pTypesDict['ster_gem'].legend);
                            section.type = 'full-row';
                            break;
                        case 'image':
                            value = `<img src='${virtualFeature.properties[pt.label]}' style='max-height:100%;max-width:100%;'></img>`;
                            break;
                        case 'url':
                            section.type = 'full-row';
                            value = `<a href='${virtualFeature.properties[pt.label]}'</a>`;
                            break;
                        default:
                            value = csComp.Helpers.convertPropertyInfo(pt, virtualFeature.properties[pt.label]);
                            break;
                    }
                    section.rows.push({
                        title: pt.title,
                        label: pt.label,
                        type: pt.type,
                        values: (value != null ? [value] : [])
                    });
                    // Add linkedFeature if present (e.g. percentage icw amount)
                    if (pt['linkedFeature'] && virtualFeature.properties.hasOwnProperty(pt['linkedFeature'])) {
                        _.last(section.rows).values.push(csComp.Helpers.convertPropertyInfo(pTypesDict[pt['linkedFeature']], virtualFeature.properties[pt['linkedFeature']]));
                        linkedFeatures.push(pt['linkedFeature']);
                        if (section.headers.length === 0) {
                            section.headers.push('Aantal');
                            section.headers.push('%');
                        }
                    }
                }
            });
        }

        private joinFeatures(fts: IFeature[], pTypes: IPropertyType[]): IFeature {
            if (fts.length === 1) return fts[0];
            let virtualFeature = < IFeature > {};
            virtualFeature.layer = < csComp.Services.ProjectLayer > {};
            virtualFeature.layer.typeUrl = fts[0].fType.id.split('#').shift();
            virtualFeature.properties = {};
            pTypes.forEach((pt: IPropertyType) => {
                fts.forEach((f: IFeature) => {
                    if (f.properties.hasOwnProperty(pt.label)) {
                        if (!virtualFeature.properties.hasOwnProperty(pt.label)) {
                            if (typeof f.properties[pt.label] === 'string') {
                                virtualFeature.properties[pt.label] = ' - ';
                            } else {
                                virtualFeature.properties[pt.label] = f.properties[pt.label];
                            }
                        } else {
                            if (typeof f.properties[pt.label] !== 'string') {
                                virtualFeature.properties[pt.label] += f.properties[pt.label];
                            }
                        }
                    }
                });
            });
            this.layerService.evaluateFeatureExpressions( < csComp.Services.Feature > virtualFeature);
            return virtualFeature;
        }

        private getDisplayTitle(fts: IFeature[]): string {
            if (fts.length === 1) {
                return csComp.Helpers.getFeatureTitle(fts[0]);
            } else {
                let title = '';
                fts.forEach((f, index, arr) => {
                    title += csComp.Helpers.getFeatureTitle(f);
                    if (index < arr.length - 2) {
                        title += ', ';
                    } else if (index === arr.length - 2) {
                        title += ' en ';
                    } else {
                        title += ' samengevoegd.';
                    }
                });
                return title;
            }
        }

        private getStreetViewImage(f: IFeature) {
            if (!f.properties || !f.properties['Adres']) return;
            let address = f.properties['Adres'].replace('\n', ', ');
            if (this.streetview === address) return; // Already loaded image
            let imgUrl = STREETVIEW_IMG_URL.concat(address);
            let linkUrl = STREETVIEW_LINK_URL.concat(address);
            this.streetview = address;
            ( < HTMLImageElement > document.querySelector('#streetview-img')).src = imgUrl;
            ( < HTMLLinkElement > document.querySelector('#streetview-link')).href = linkUrl;
            this.resetRapportLink(); // Rapport and streetview image are never shown simulaneously
        }

        private getRapportLink(f: IFeature) {
            let prop;
            if (f.properties.hasOwnProperty('bu_code')) {
                prop = f.properties['bu_code'];
            } else if (f.properties.hasOwnProperty('GM_CODE')) {
                prop = f.properties['GM_CODE'];
            } else {
                this.resetRapportLink();
                return;
            }
            this.getLZWSet(prop);
        }

        private getLZWSet(prop: string) {
            this.wodkSvc.getLZWSets(prop, (set) => {
                if (!set || !set.s) {
                    this.resetRapportLink();
                    return;
                }
                ( < HTMLLinkElement > document.querySelector('#rapport-link')).href = `http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set ${set.s}.pdf#page=${set.p}`;
                this.showRapportLink = true;
                this.resetStreetviewImage(); // Rapport and streetview image are never shown simulaneously
            });
        }

        private resetRapportLink() {
            document.querySelector('#rapport-link').removeAttribute('href');
            this.showRapportLink = false;
        }

        private resetStreetviewImage() {
            document.querySelector('#streetview-img').removeAttribute('src');
            document.querySelector('#streetview-link').removeAttribute('href');
            this.streetview = null;
        }

        private getStarsDiv(prop: any, legend: csComp.Services.Legend) {
            prop = +prop;
            let legendEntry;
            if (prop === 11) {
                legendEntry = _.find(legend.legendEntries, (le) => {
                    return le.interval.max === -3;
                });
            } else if (prop === 10) {
                legendEntry = _.find(legend.legendEntries, (le) => {
                    return le.interval.max === -2;
                });
            } else if (prop > 10) {
                legendEntry = _.find(legend.legendEntries, (le) => {
                    return le.interval.max === -1;
                });
            } else {
                legendEntry = _.find(legend.legendEntries, (le) => {
                    return le.interval.max === prop;
                });
            }
            if (!legendEntry) return;
            let div = `<div style="background-color:${legendEntry.color.substr(0, 7)};text-align:left;">`;
            let stars;
            switch (prop) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    div += `<img src='images/bag_${prop}.svg' style="height: 32px;margin: 4px 8px;"></img>`;
                    stars = prop;
                    break;
                case 10:
                case 11:
                    div += `<img src='images/bag_${prop}.svg' style="height: 32px;margin: 4px 8px;"></img>`;
                    break;
                case 12:
                    div += this.getCombiStarsDiv(1, 1);
                    break;
                case 13:
                    div += this.getCombiStarsDiv(2, 1);
                    break;
                case 14:
                    div += this.getCombiStarsDiv(2, 2);
                    break;
                case 15:
                    div += this.getCombiStarsDiv(3, 2);
                    break;
                case 16:
                    div += this.getCombiStarsDiv(4, 2);
                    break;
                case 17:
                    div += this.getCombiStarsDiv(5, 2);
                    break;
                case 18:
                    div += this.getCombiStarsDiv(6, 2);
                    break;
                case 19:
                    div += this.getCombiStarsDiv(7, 2);
                    break;
            }
            for (let i = 0; i < stars; i++) {
                div += `<img src='images/icons/ster-vol.svg' style="height: 30px"></img>`;
            }
            if (prop === 0) {
                div += `<span style="color:white">Niet aanpasbaar</span>`;
            } else if (prop === 10) {
                div += `<span style="color:white">In onderzoek</span>`;
            } else if (prop === 11) {
                div += `<span>Onbekend</span>`;
            }
            div += '</div>';
            return div;
        }

        private getCombiStarsDiv(ster0: number, ster3: number): string {
            let div = '<div>';
            div += `<div><span class="star-label">${ster0}</span><img src='images/bag_0_red.svg' style="height: 32px;margin: 8px;"></img></div>`;
            div += `<div><span class="star-label">${(ster3 <= 6 ? ster3 : '+')}</span><img src='images/bag_3.svg' style="height: 32px;margin: 4px 8px;"></img>`;
            for (let i = 0; i < 3; i++) {
                div += `<img src='images/icons/ster-vol.svg' style="height: 30px"></img>`;
            }
            div += '</div></div>';
            return div;
        }
    }
}