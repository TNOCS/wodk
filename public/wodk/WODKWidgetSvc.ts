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

        constructor(
            private $rootScope: ng.IRootScopeService,
            private layerService: csComp.Services.LayerService,
            private messageBusService: csComp.Services.MessageBusService,
            private mapService: csComp.Services.MapService,
            private dashboardService: csComp.Services.DashboardService,
            private $http: ng.IHttpService) {
            this.dashboardService.widgetTypes['wodkwidget'] = <csComp.Services.IWidget> {
               id: 'wodkwidget',
               icon: 'images/wodkwidget.png',
               description: 'Show wodkwidget'
            }
        }
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