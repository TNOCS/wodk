import * as Winston from 'winston';
// import geojsonvt = require('geojson-vt');
import fs = require('fs-extra');
import path = require('path');
import webshot = require('webshot');
import stream = require('stream');
import * as csweb from "csweb";
import _ = require("underscore.string");

const LZWSets = require("./setsOverview/setsOverview.json");

Winston.remove(Winston.transports.Console);
Winston.add(Winston.transports.Console, <Winston.ConsoleTransportOptions>{
    colorize: true,
    label: 'csWeb',
    prettyPrint: true
});

var startDatabaseConnection = true;

var port = process.env.PORT || 3002;
var deployPath = process.env.deployPath || '';
console.log('Process env port: ' + port);
console.log('deployPath: ' + deployPath);

// var cs = new csweb.csServer(__dirname, <csweb.csServerOptions>{
var cs = new csweb.csServer(__dirname, <any>{
    port: port,
    swagger: false,
    connectors: {},
    corrsEnabled: false,
    deployPath: deployPath
});

var tileIndex;
cs.start(() => {

    // Should be set to true for server on zodk
    const runOnZODKServer = false;
    const zodkServerAddress = 'http://www.zorgopdekaart.nl/bagwoningen';

    if (startDatabaseConnection) {
        this.config = new csweb.ConfigurationService('./configuration.json');
        this.config.add('server', (runOnZODKServer ? zodkServerAddress : 'http://localhost:') + cs.options.port);
        var bagDatabase = new csweb.BagDatabase(this.config);
        var mapLayerFactory = new csweb.MapLayerFactory(<any>bagDatabase, cs.messageBus, cs.api);

        cs.server.post(deployPath + (runOnZODKServer ? '/public' : '') + '/bagcontours', (req, res) => {
            console.log();
            mapLayerFactory.processBagContours(req, res);
        });

        cs.server.post(deployPath + (runOnZODKServer ? '/public' : '') + '/bagsearchaddress', (req, res) => {
            console.log('/bagsearchaddress');
            mapLayerFactory.processBagSearchQuery(req, res);
        });

        cs.server.post(deployPath + (runOnZODKServer ? '/public' : '') + '/bagbuurten', (req, res) => {
            console.log('/bagbuurten');
            mapLayerFactory.processBagBuurten(req, res);
        });

        cs.server.post(deployPath + (runOnZODKServer ? '/public' : '') + '/bagcontours', (req, res) => {
            console.log();
            mapLayerFactory.processBagContours(req, res);
        });

        cs.server.post(deployPath + (runOnZODKServer ? '/public' : '') + '/searchgemeente', (req, res) => {
            console.log('/searchgemeente');
            if (req.body.loc) {
                bagDatabase.searchGemeenteAtLocation(req.body.loc, 1, (searchResult: any[]) => {
                    if (!searchResult || !searchResult.length || searchResult.length === 0) {
                        res.sendStatus(404);
                    } else {
                        res.status(200).send({ gm_code: 'GM' + _.lpad(searchResult[0].gemeentecode, 4, '0') });
                    }
                });
            } else if (req.body.bu_code) {
                bagDatabase.searchGemeenteWithBuCode(req.body.bu_code, 1, (searchResult: any[]) => {
                    if (!searchResult || !searchResult.length || searchResult.length === 0) {
                        res.sendStatus(404);
                    } else {
                        res.status(200).send({ gm_code: searchResult[0].gemeentecode });
                    }
                });
            } else {
                res.sendStatus(404);
            }
        });

        cs.server.post(deployPath + (runOnZODKServer ? '/public' : '') + '/searchbuurt', (req, res) => {
            console.log('/searchbuurt');
            bagDatabase.searchBuurtAtLocation(req.body.loc, 1, (searchResult: any[]) => {
                if (!searchResult || !searchResult.length || searchResult.length === 0) {
                    res.sendStatus(404);
                } else {
                    res.status(200).send({ bu_code: searchResult[0].bu_code });
                }
            });
        });

        cs.server.post(deployPath + (runOnZODKServer ? '/public' : '') + '/searchpand', (req, res) => {
            console.log('/searchpand');
            bagDatabase.searchPandAtLocation(req.body.loc, 1, (searchResult: any[]) => {
                if (!searchResult || !searchResult.length || searchResult.length === 0) {
                    res.sendStatus(404);
                } else {
                    res.status(200).send({ identificatie: searchResult[0].identificatie });
                }
            });
        });

        cs.server.get(deployPath + (runOnZODKServer ? '/public' : '') + '/findlzwset/:areaId', (req, res) => {
            console.log('/findlzwset');
            let searchResult = LZWSets[req.params.areaId];
            if (!searchResult) {
                res.sendStatus(404);
            } else {
                res.status(200).send(searchResult);
            }
        });

        cs.server.get(deployPath + (runOnZODKServer ? '/public' : '') + '/exportbuurten', (req, res) => {
            console.log('/exportbuurten');
            bagDatabase.exportBuurten(req, res);
        });

        cs.server.get(deployPath + (runOnZODKServer ? '/public' : '') + '/exportwijken', (req, res) => {
            console.log('/exportwijken');
            bagDatabase.exportWijken(req, res);
        });

        cs.server.get(deployPath + (runOnZODKServer ? '/public' : '') + '/exportgemeenten', (req, res) => {
            console.log('/exportgemeenten');
            bagDatabase.exportGemeenten(req, res);
        });

        cs.server.post(deployPath + (runOnZODKServer ? '/public' : '') + '/screenshot', (req, res) => {
            console.log('/screenshot');
            if (req.body && req.body.html) {
                if (<any>webshot) {
                    let image = [];
                    let renderStream: stream.Stream = (<any>webshot)(req.body.html, { hostname: (runOnZODKServer ? zodkServerAddress + '/public/' : `http://localhost:${cs.options.port}/`), siteType: 'html', javascriptEnabled: true, screenSize: { width: req.body.width || 1200, height: req.body.height || 800 }, shotSize: { width: 'window', height: 'window' }, shotOffset: { top: (req.body.topOffset || 0), left: 0, right: 0, bottom: 0 }, phantomConfig: { 'local-to-remote-url-access': true, 'debug': 'false', "cookies-file": "./cookies.txt", "ignore-ssl-errors": 'false', "web-security": 'true', 'disk-cache': 'true' }, errorIfJSException: true, renderDelay: (req.body.fullScreen ? 15000 : 1000) });

                    renderStream.on('data', (data) => {
                        image.push(data);
                    });

                    renderStream.on('end', () => {
                        res.writeHead(200, { "Content-Type": "image/png" });
                        var b = Buffer.concat(image);
                        res.end(b.toString('base64'));
                    });

                    renderStream.on('error', (err) => {
                        console.log(`Webshot error: ${err}`);
                    });

                } else {
                    res.sendStatus(404);
                }
            } else {
                res.sendStatus(404);
            }
        });



        // console.log("Just testing the BAG connection ");
        // bagDatabase.searchAddress('gagel', 15, (res) => {
        //     console.log(JSON.stringify(res, null, 2));
        // });

        // var bagbuurt = fs.readFileSync('./Buurt_2015.json', 'utf8');

        // // build an initial index of tiles
        // tileIndex = geojsonvt(JSON.parse(bagbuurt),
        //     {
        //         maxZoom: 15,  // max zoom to preserve detail on
        //         tolerance: 3, // simplification tolerance (higher means simpler)
        //         extent: 4096, // tile extent (both width and height)
        //         buffer: 64,   // tile buffer on each side
        //         debug: 0,      // logging level (0 to disable, 1 or 2)
        //         indexMaxZoom: 4,        // max zoom in the initial tile index
        //         indexMaxPoints: 100000, // max number of points per tile in the index
        //         solidChildren: false    // whether to include solid tile children in the index
        //     });

        // var urlPath = `/bagbuurt/:z/:x/:y.json`;
        // console.log(`Exposing geojson-vt service at ${urlPath}.`);

        // cs.server.get(urlPath, (req, res) => {
        //     let z = +req.params.z,
        //         x = +req.params.x,
        //         y = +req.params.y;
        //     // request a particular tile
        //     var result = tileIndex.getTile(z, x, y);
        //     if (result) {
        //         console.log(`Tile ${z}/${x}/${y} has ${result.features.length} features`);
        //         res.send(result);
        //     } else {
        //         res.send([]);
        //     }
        // });

        // show an array of tile coordinates created so far
        // console.log(tileIndex.tileCoords); // [{z: 0, x: 0, y: 0}, ...]
    }

    console.log('really started');
    //    //{ key: "imb", s: new ImbAPI.ImbAPI("app-usdebug01.tsn.tno.nl", 4000),options: {} }
    //    var ml = new MobileLayer.MobileLayer(api, "mobilelayer", "/api/resources/SGBO", server, messageBus, cm);
});
