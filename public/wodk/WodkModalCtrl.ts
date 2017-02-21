module WodkModalCtrl {
    export interface ICompareModalScope extends ng.IScope {
        vm: CompareModalCtrl;
        featureTypeTitle: string;
        featureTitles: string[];
        propertyTitles: string[];
        tableEntries: Dictionary < string[] > ;
        data: any;
    }

    export class CompareModalCtrl {
        public static $inject = [
            '$scope',
            '$uibModalInstance',
            'layerService',
            'features'
        ];

        constructor(
            private $scope: ICompareModalScope,
            private $uibModalInstance: any,
            private $layerService: csComp.Services.LayerService,
            private features: IFeature[]) {

            $scope.vm = this;
            $scope.tableEntries = this.getAllTableEntries(features);
            $scope.featureTitles = this.getAllFeatureTitles(features);
        }

        private getAllFeatureTitles(fts: IFeature[]): string[] {
            if (!fts || fts.length < 1) return;
            var titles = [];
            fts.forEach((f) => {
                titles.push(csComp.Helpers.getFeatureTitle(f));
            });
            return titles;
        }

        private getAllTableEntries(fts: IFeature[]): {
            [key: string]: string[]
        } {
            if (!fts || fts.length < 1) return;
            var entries: {
                [key: string]: string[]
            } = {};
            var keys = [];
            fts.forEach((f) => {
                keys = keys.concat(_.keys(f.properties));
            });
            keys = _.uniq(keys);
            var fType: csComp.Services.IFeatureType = JSON.parse(JSON.stringify(this.$layerService.getFeatureType(fts[0])));
            this.$scope.featureTypeTitle = fType.name.toLowerCase();
            fType.propertyTypeKeys = keys.join(';');
            var propTypes = csComp.Helpers.getPropertyTypes(fType, this.$layerService.propertyTypeData);
            if (this.$scope.data.numbersOnly) {
                propTypes = _.pick(propTypes, (prop: IPropertyType, key) => {
                    return prop.type === 'number';
                });
            }
            keys = keys.filter((key) => {
                return (_.some(propTypes, (prop, propKey) => {
                    return prop.label === key;
                }));
            });
            entries = < any > _.object(keys, keys);
            entries = _.each(entries, (val, key, arr) => {
                arr[key] = [];
            });
            this.$scope.propertyTitles = _.pluck(propTypes, 'title');
            var propTypesDict = _.indexBy(propTypes, 'label');
            fts.forEach((f, fIndex) => {
                keys.forEach((key) => {
                    entries[key].push((f.properties[key]) ? csComp.Helpers.convertPropertyInfo(propTypesDict[key], f.properties[key]) : null);
                });
            });
            return entries;
        }

        public ok() {
            this.$uibModalInstance.close();
        }

        public cancel() {
            this.$uibModalInstance.dismiss('cancel');
        }
    }
}