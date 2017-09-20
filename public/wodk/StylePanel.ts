module wodk {
    /**
     * Config
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

    /**
     * Directive to display the available map layers.
     */
    myModule.directive('stylepanel', [function (): ng.IDirective {
        return {
            restrict: 'E', // E = elements, other options are A=attributes and C=classes
            scope: {}, // isolated scope, separated from parent. Is however empty, as this directive is self contained by using the messagebus.
            templateUrl: 'wodk/StylePanel.tpl.html',
            replace: true, // Remove the directive from the DOM
            transclude: false, // Add elements and attributes to the template
            controller: StylePanelCtrl
        }
    }]);

    export interface IStylePanelCard {
        image: string;
        property: string;
        layerId: string;
        title: string;
        description: string;
    }

    export interface StylePanelCtrlScope extends ng.IScope {
        vm: StylePanelCtrl;
    }

    export class StylePanelCtrl {
        private scope: StylePanelCtrlScope;
        private mBusHandles: csComp.Services.MessageBusHandle[] = [];
        private cards: IStylePanelCard[] = [];
        private layer: csComp.Services.ProjectLayer;

        public static $inject = [
            '$scope',
            '$timeout',
            '$translate',
            'layerService',
            'messageBusService',
            'mapService'
        ];

        constructor(
            private $scope: StylePanelCtrlScope,
            private $timeout: ng.ITimeoutService,
            private $translate: ng.translate.ITranslateService,
            private $layerService: csComp.Services.LayerService,
            private $messageBus: csComp.Services.MessageBusService,
            private $mapService: csComp.Services.MapService
        ) {
            $scope.vm = this;

            this.mBusHandles.push(this.$messageBus.subscribe('wodk', (message, data) => {
                this.handleMessage(message, data);
            }));

            this.mBusHandles.push(this.$messageBus.subscribe('layer', (title, data) => {
                if (title === 'activated') {
                    this.init();
                }
            }));

            this.init();
        }

        private init() {
            this.cards.length = 0;
            this.initCard('images/infographic2.png', 'p_apb_w', 'bagbuurten');
            this.initCard('images/infographic1.png', 'p_koopwon', 'bagbuurten');
            this.initCard('images/infographic2.png', 'lb_situ', 'bagbuurten');
            this.initCard('images/infographic1.png', 'afs_adl_int', 'bagbuurten');
        }

        private initCard(image: string, prop: string, layerId: string) {
            if (!this.$layerService.propertyTypeData.hasOwnProperty(prop)) return;
            let pt = this.$layerService.propertyTypeData[prop];
            this.cards.push({
                image: image,
                property: prop,
                layerId: layerId,
                title: pt.title,
                description: pt.description
            });
        }

        private select(card: IStylePanelCard) {
            if (this.layer && card.property) {
                this.$layerService.setStyleForProperty(this.layer, card.property);
                this.close();
            }
        }

        private open() {
            $('.stylepanel-container').addClass('show');
        }

        private close() {
            $('.stylepanel-container').removeClass('show');
        }

        private handleMessage(message: string, data ? : any) {
            switch (message) {
                case 'opennavbar':
                case 'opencompare':
                case 'opentoelichting':
                case 'openrightpanel':
                    this.close();
                    break;
                case 'openstylepanel':
                    this.layer = data;
                    this.open();
                    break;
                default:
                    break;
            }
        }
    }
}