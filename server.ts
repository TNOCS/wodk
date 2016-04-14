import Winston = require('winston');
import geojsonvt = require('geojson-vt');
import fs = require('fs');
import * as csweb from "csweb";

Winston.remove(Winston.transports.Console);
Winston.add(Winston.transports.Console, <Winston.ConsoleTransportOptions>{
    colorize: true,
    label: 'csWeb',
    prettyPrint: true
});

var startDatabaseConnection = true;

var cs = new csweb.csServer(__dirname, <csweb.csServerOptions>{
    port: 3003,
    swagger: false,
    //connectors: { mqtt: { server: 'localhost', port: 1883 }, mongo: { server : '127.0.0.1', port: 27017} }
});

var tileIndex;
cs.start(() => {

    if (startDatabaseConnection) {
        this.config = new csweb.ConfigurationService('./configuration.json');
        this.config.add('server', 'http://localhost:' + cs.options.port);
        var bagDatabase = new csweb.BagDatabase(this.config);
        var mapLayerFactory = new csweb.MapLayerFactory(<any>bagDatabase, cs.messageBus, cs.api);
        cs.server.post('/bagcontours', (req, res) => {
            mapLayerFactory.processBagContours(req, res);
        });

        cs.server.post('/bagsearchaddress', (req, res) => {
            mapLayerFactory.processBagSearchQuery(req, res);
        });

        cs.server.post('/bagbuurten', (req, res) => {
            mapLayerFactory.processBagBuurten(req, res);
        });


        var bagbuurt = fs.readFileSync('./Buurt_2015.json', 'utf8');

        // build an initial index of tiles
        tileIndex = geojsonvt(JSON.parse(bagbuurt),
            {
                maxZoom: 15,  // max zoom to preserve detail on
                tolerance: 3, // simplification tolerance (higher means simpler)
                extent: 4096, // tile extent (both width and height)
                buffer: 64,   // tile buffer on each side
                debug: 0,      // logging level (0 to disable, 1 or 2)
                indexMaxZoom: 4,        // max zoom in the initial tile index
                indexMaxPoints: 100000, // max number of points per tile in the index
                solidChildren: false    // whether to include solid tile children in the index
            });

        var urlPath = `/bagbuurt/:z/:x/:y.json`;
        console.log(`Exposing geojson-vt service at ${urlPath}.`);

        cs.server.get(urlPath, (req, res) => {
            let z = +req.params.z,
                x = +req.params.x,
                y = +req.params.y;
            // request a particular tile
            var result = tileIndex.getTile(z, x, y);
            if (result) {
                console.log(`Tile ${z}/${x}/${y} has ${result.features.length} features`);
                res.send(result);
            } else {
                res.send([]);
            }
        });

        // show an array of tile coordinates created so far
        console.log(tileIndex.tileCoords); // [{z: 0, x: 0, y: 0}, ...]
    }

    console.log('really started');
    //    //{ key: "imb", s: new ImbAPI.ImbAPI("app-usdebug01.tsn.tno.nl", 4000),options: {} }
    //    var ml = new MobileLayer.MobileLayer(api, "mobilelayer", "/api/resources/SGBO", server, messageBus, cm);
});
