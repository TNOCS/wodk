module WodkModalCtrl {
    export interface ICompareModalScope extends ng.IScope {
        vm: CompareModalCtrl;
        featureTypeTitle: string;
        featureTitles: string[];
        data: any;
    }

    export class CompareModalCtrl {
        public static $inject = [
            '$scope',
            '$uibModalInstance',
            '$timeout',
            'layerService',
            'wodkWidgetSvc',
            'features'
        ];

        private propertyTables: WodkRightPanel.PropertyTable[];

        constructor(
            private $scope: ICompareModalScope,
            private $uibModalInstance: any,
            private $timeout: ng.ITimeoutService,
            private $layerService: csComp.Services.LayerService,
            private $wodkSvc: wodk.WODKWidgetSvc,
            private features: IFeature[]) {

            $scope.vm = this;
            $scope.featureTitles = this.getAllFeatureTitles(features);
            this.propertyTables = this.getAllFeatureBlocks(features);
        }

        private getAllFeatureTitles(fts: IFeature[]): string[] {
            if (!fts || fts.length < 1) return;
            var titles = [];
            fts.forEach((f) => {
                titles.push(csComp.Helpers.getFeatureTitle(f));
            });
            return titles;
        }

        private createTable(fts: IFeature[]) {
            let table = new WodkRightPanel.PropertyTable(this.$wodkSvc, this.$layerService, this.$timeout);
            table.displayFeature(fts);
            return table;
        }

        private getAllFeatureBlocks(fts: IFeature[]) {
            let tables = [];
            tables.push(this.createTable(fts));
            fts.forEach((f) => {
                tables.push(this.createTable([f]));
            });
            return tables;
        }

        public exportImage() {
            this.$wodkSvc.exportToImage('wodk-compare-modal');
        }

        public ok() {
            this.$uibModalInstance.close();
        }

        public cancel() {
            this.$uibModalInstance.dismiss('cancel');
        }
    }
}