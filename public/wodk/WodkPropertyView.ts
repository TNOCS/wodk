module WodkRightPanel {

    var DEFAULT_SECTION_ID = '__info';
    var DEFAULT_SECTION_TITLE = '';

    export interface IPropertyTableSection {
        title: string;
        id: string;
        headers: string[];
        rows: IPropertyTableRow[];
    }

    export interface IPropertyTableRow {
        title: string;
        label: string;
        values: any[];
    }

    export class PropertyTable {
        public title: string;
        public sections: IPropertyTableSection[] = [];

        constructor(private layerService: csComp.Services.LayerService) {
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

        public displayFeature = _.debounce(this.displayFeatureDebounced, 500);

        private displayFeatureDebounced(f: IFeature) {
            if (!f || _.isEmpty(f)) return;
            this.clearTable();
            let fType = this.layerService.getFeatureType(f);
            let pTypes = csComp.Helpers.getPropertyTypes(fType, null);
            this.title = csComp.Helpers.getFeatureTitle(f);
            pTypes.forEach((pt: IPropertyType) => {
                if (pt.visibleInCallOut && f.properties.hasOwnProperty(pt.label)) {
                    let sectionId = pt.section || DEFAULT_SECTION_ID;
                    let section = this.findOrCreateSection(sectionId);
                    section.rows.push({
                        title: pt.title,
                        label: pt.label,
                        values: [csComp.Helpers.convertPropertyInfo(pt, f.properties[pt.label])]
                    });
                }
            });
            this.removeDuplicateAndEmptyRows();
        }
    }
}