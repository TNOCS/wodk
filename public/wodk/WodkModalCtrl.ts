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
        private slider: any;

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

        private previousItem() {
            if (!this.slider) return;
            this.slider.goToPrevSlide();
        }

        private nextItem() {
            if (!this.slider) return;
            this.slider.goToNextSlide();
        }

        private createTable(fts: IFeature[]) {
            let table = new WodkRightPanel.PropertyTable(this.$wodkSvc, this.$layerService, this.$timeout);
            table.displayFeature(fts);
            return table;
        }

        private initSlider() {
            this.slider = $('#lightSlider').lightSlider({
                controls: false,
                pager: false,
                item: 3,
                slideMove: 1,
                slideMargin: 0,
                responsive: [{
                        breakpoint: 1280,
                        settings: {
                            item: 2,
                            slideMove: 1
                        }
                    },
                    {
                        breakpoint: 768,
                        settings: {
                            item: 1,
                            slideMove: 1
                        }
                    }
                ]
            });
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
            this.slider.destroy();
            this.$uibModalInstance.close();
        }

        public cancel() {
            this.slider.destroy();
            this.$uibModalInstance.dismiss('cancel');
        }
    }

    export interface ISelectCityModalCtrlScope extends ng.IScope {
        vm: SelectCityModalCtrl;
        city: string;
        cityNames: any[];
    }

    export class SelectCityModalCtrl {
        public static $inject = [
            '$scope',
            '$uibModalInstance',
            '$timeout',
            'layerService',
            'wodkWidgetSvc',
            'cityNames'
        ];


        constructor(
            private $scope: ISelectCityModalCtrlScope,
            private $uibModalInstance: any,
            private $timeout: ng.ITimeoutService,
            private $layerService: csComp.Services.LayerService,
            private $wodkSvc: wodk.WODKWidgetSvc,
            private cityNames: string[]) {

            $scope.vm = this;
            $scope.cityNames = _.map(cityNames, (name) => {return {name: name};});
        }

        public ok(cityName?: string) {
            if (cityName) {
                this.$uibModalInstance.close(cityName);
            } else {
                this.$uibModalInstance.close(this.$scope.city);
            }
        }

        public cancel() {
            this.$uibModalInstance.dismiss('cancel');
        }
    }
}