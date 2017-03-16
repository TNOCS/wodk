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
    myModule.directive('infopanel', [function (): ng.IDirective {
        return {
            restrict: 'E', // E = elements, other options are A=attributes and C=classes
            scope: {}, // isolated scope, separated from parent. Is however empty, as this directive is self contained by using the messagebus.
            templateUrl: 'wodk/InfoPanel.tpl.html',
            replace: true, // Remove the directive from the DOM
            transclude: false, // Add elements and attributes to the template
            controller: InfoPanelCtrl
        }
    }]);

    export interface InfoPanelCtrlScope extends ng.IScope {
        vm: InfoPanelCtrl;
    }

    export class InfoPanelCtrl {
        private scope: InfoPanelCtrlScope;
        private mBusHandles: csComp.Services.MessageBusHandle[] = [];
        public pdfLinks: any = this.getPdfLinks();

        public static $inject = [
            '$scope',
            '$timeout',
            '$translate',
            'layerService',
            'messageBusService',
            'mapService'
        ];

        constructor(
            private $scope: InfoPanelCtrlScope,
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

            this.init();
        }

        private init() {

        }

        private open() {
            $('.infopanel-container').css('width', '50%');
        }

        private close() {
            $('.infopanel-container').css('width', '0px');
        }

        private handleMessage(message: string, data ? : any) {
            switch (message) {
                case 'openrightpanel':
                    this.close();
                    break;
                case 'opencompare':
                    this.open();
                    break;
                default:
                    break;
            }
        }

        private getPdfLinks() {
            return [{
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 1 Den Haag 121m.pdf",
                "name": "1. Den Haag Amsterdam Rotterdam"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 2 Utrecht 121m.pdf",
                "name": "2. Utrecht Eindhoven Tilburg Almere"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 3 Groningen 121m.pdf",
                "name": "3. Groningen Breda Nijmegen Apeldoorn Enschede"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 4 Haarlem 121m.pdf",
                "name": "4. Haarlem Amersfoort Arnhem"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 5 Zaanstad 121m.pdf",
                "name": "5. Zaanstad s-Hertogenbosch Haarlemmermeer Zoetermeer"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 6 Zwolle 121m.pdf",
                "name": "6. Zwolle Leiden Maastricht Dordrecht"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 7 Ede 121m.pdf",
                "name": "7. Ede Leeuwarden Alkmaar"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 8 Emmen 121m.pdf",
                "name": "8. Emmen Westland Alphen aan den Rijn"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 9 Delft 121m.pdf",
                "name": "9. Delft Deventer Venlo Sittard-Geleen"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 10 Helmond 121m.pdf",
                "name": "10. Helmond Oss Amstelveen Hilversum Heerlen"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 11 Nissewaard 121m.pdf",
                "name": "11. Nissewaard Sudwest-Fryslan Hengelo Purmerend"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 12 Schiedam 121m.pdf",
                "name": "12. Schiedam Lelystad Roosendaal Leidschendam-Voorburg Almelo"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 13 Hoorn 121m.pdf",
                "name": "13. Hoorn Vlaardingen Gouda Assen"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 14 Capelle aan den IJssel 121m.pdf",
                "name": "14. Capelle aan den IJssel Velsen Bergen op Zoom Stichtse Vecht Katwijk Veenendaal Zeist"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 15 Nieuwegein 121m.pdf",
                "name": "15. Nieuwegein Hardenberg Lansingerland Roermond Doetinchem"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 16 Den Helder 121m.pdf",
                "name": "16. Den Helder Smallingerland Oosterhout Barneveld Hoogeveen Heerhugowaard"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 17 Terneuzen 121m.pdf",
                "name": "17. Terneuzen Krimpenerwaard De Friese meren Pijnacker-Nootdorp Woerden Rijswijk"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 18 Kampen 121m.pdf",
                "name": "18. Kampen Heerenveen Houten Barendrecht Weert Zutphen Goeree-Overflakkee"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 19 Middelburg 121m.pdf",
                "name": "19. Middelburg Hollands Kroon Waalwijk Overbetuwe Noordoostpolder Schagen Utrechtse Heuvelrug Harderwijk"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 20 Lingewaard 121m.pdf",
                "name": "20. Lingewaard Kerkrade Ridderkerk Soest Zwijndrecht Heusden Veldhoven Vlissingen Etten-Leur"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 21 Medemblik 121m.pdf",
                "name": "21. Medemblik Berkelland Rheden Steenwijkerland De Ronde Venen Venray Tiel Peel en Maas Uden"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 22 Huizen 121m.pdf",
                "name": "22. Huizen De Bilt Horst aan de Maas Wijchen Dronten Nijkerk Beverwijk Zuidplas"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 23 Hellevoetsluis 121m.pdf",
                "name": "23. Hellevoetsluis Geldrop-Mierlo Oude IJsselstreek Heemskerk Wageningen Oldambt Veghel Landgraaf Goes Rijssen-Holten"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 24 Raalte 121m.pdf",
                "name": "24. Raalte Bronckhorst Leudal Moerdijk Hellendoorn Coevorden Hof van Twente"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 25 Teylingen 121m.pdf",
                "name": "25. Teylingen Castricum Gorinchem Hoogezand-Sappemeer IJsselstein Schouwen-Duiveland Twenterand Montferland Meppel"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 26 Midden-Drenthe 121m.pdf",
                "name": "26. Midden-Drenthe Lochem Oldenzaal Bussum Bodegraven-Reeuwijk Papendrecht Zevenaar Epe Stadskanaal Tynaarlo Tytsjerksteradiel"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 27 Maassluis 121m.pdf",
                "name": "27. Maassluis Echt-Susteren Deurne Valkenswaard Noordenveld Renkum Boxtel Aalsmeer Bergen (NH.) Leusden Opsterland Hendrik-Ido-Ambacht Best"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 28 Bernheze 121m.pdf",
                "name": "28. Bernheze Brunssum Oost Gelre Uithoorn Binnenmaas Gemert-Bakel Winterswijk Molenwaard Edam-Volendam Halderberge Krimpen aan den IJssel Boxmeer"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 29 Culemborg 121m.pdf",
                "name": "29. Culemborg Sint-Michielsgestel Achtkarspelen Diemen Dalfsen Veendam Langedijk Hulst Aalten Nieuwkoop Leiderdorp Heemstede Zaltbommel Nunspeet"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 30 Geldermalsen 121m.pdf",
                "name": "30. Geldermalsen Gilze en Rijen Werkendam Drimmelen Oisterwijk Buren Dongen Ermelo Wassenaar Aa en Hunze Noordwijk Waddinxveen Kaag en Braassem"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 31 Beuningen 121m.pdf",
                "name": "31. Beuningen Tholen Dinkelland Weststellingwerf Albrandswaard Ooststellingwerf Duiven Borger-Odoorn Stein Cuijk"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 32 Sliedrecht 121m.pdf",
                "name": "32. Sliedrecht Vught Delfzijl Voorschoten Eijsden-Margraten Haaksbergen Maasdriel Dongeradeel Wierden Putten Baarn Schijndel"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 33 De Wolden 121m.pdf",
                "name": "33. De Wolden Steenbergen Nuenen, Gerwen en Nederwetten Maasgouw Oud-Beijerland Goirle Oegstgeest Borne Loon op Zand Lisse Wijdemeren Elburg Heiloo Wijk bij Duurstede"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 34 Sluis 121m.pdf",
                "name": "34. Sluis Voorst Oldebroek Borsele Losser Koggenland Bloemendaal Reimerswaal Zwartewaterland Geertruidenberg Rucphen Neder-Betuwe Laarbeek Zundert Zeewolde"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 35 Stede 121m.pdf",
                "name": "35. Stede Broec Tubbergen Veere Woensdrecht Hillegom Brummen Roerdalen Franekeradeel Leerdam Alblasserdam Bunschoten Vianen Bladel Urk Cranendonck"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 36 Leek 121m.pdf",
                "name": "36. Leek Drechterland Meerssen Rhenen Weesp Someren Westerveld Druten Dantumadiel Zuidhorn Enkhuizen Sint-Oedenrode Midden-Delfland West Maas en Waal Heerde"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 37 Bergeijk 121m.pdf",
                "name": "37. Bergeijk Eersel Groesbeek Haren Ommen Hardinxveld-Giessendam Olst-Wijhe Oirschot Naarden Gennep Waterland Nederweert Valkenburg aan de Geul Beek Waalre Asten Zandvoort"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 38 Eemsmond 121m.pdf",
                "name": "38. Eemsmond Son en Breugel Staphorst Brielle Heumen Noordwijkerhout Harlingen Vlagtwedde Wormerland Nuth Slochteren Bunnik Heeze-Leende Hilvarenbeek Westervoort Landerd Gulpen-Wittem"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 39 Giessenlanden 121m.pdf",
                "name": "39. Giessenlanden Woudrichem Beesel Winsum Ouder-Amstel Westvoorne Montfoort Menameradiel Lopik Haaren Texel Zederik Bergen (L.) Schinnen Uitgeest Grave Aalburg Kollumerland en Nieuwkruisland Pekela Cromstrijen"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 40 Reusel-De Mierden 121m.pdf",
                "name": "40. Reusel-De Mierden Grootegast Appingedam Voerendaal Woudenberg Kapelle Menterwolde Doesburg Hattem Neerijnen Sint Anthonis Laren Opmeer Mill en Sint Hubert Littenseradiel het Bildt Lingewaal Rijnwaarden Korendijk Simpelveld Bedum Landsmeer"
            }, {
                "url": "http://www.zorgopdekaart.nl/bagwoningen/pdfs/lzw/LZW set 41 De Marne 121m.pdf",
                "name": "41. De Marne Loppersum Marum Leeuwarderadeel Boekel Vaals Oudewater Alphen-Chaam Blaricum Scherpenzeel Bellingwedde Eemnes Oostzaan Strijen Beemster Ferwerderadiel Mook en Middelaar Zoeterwoude Onderbanken Noord-Beveland Ten Boer Baarle-Nassau Muiden Zeevang Haarlemmerliede en Spaarnwoude Renswoude Terschelling Ameland Rozendaal Schiermonnikoog Vlieland\r"
            }]
        }
    }
}