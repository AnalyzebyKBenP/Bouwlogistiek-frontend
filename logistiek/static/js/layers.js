//////////////////////////////////////////////////
// Geoserver(s)
//////////////////////////////////////////////////
client_smartcity_geoserver = new atlas.io.ogc.WfsClient({
    url: 'https://app-geoserver.azurewebsites.net/geoserver/'+GeoserverNamespace+'/ows?service=wfs&version=2.0.0&request=GetCapabilities',
    transformRequest: function (url, resourceType) {
        //Add custom headers to the request.
        return {
            url: url,
            headers: {
                Authorization: GeoserverAuth,
            }
        };
    },
});

client_plancapaciteit_geoserver = new atlas.io.ogc.WfsClient({
    // uses a reverse proxy to circumvent CORS problems
    url: window.location.origin+'/p/'+'https://plancapaciteit.nl/geoserver/plancapaciteit_public/ows?service=wfs&version=2.0.0&request=GetCapabilities'
});

//////////////////////////////////////////////////
// Standaard componenten
//////////////////////////////////////////////////

function createVectorDataSource(VTSid,geoserverURL,environment,layerName,options={}){
    tileURL=`${geoserverURL}/geoserver/wms?service=WMS&version=1.1.0&request=GetMap&layers=${environment}%3A${layerName}&bbox={bbox-epsg-3857}&width=512&height=512&srs=EPSG%3A3857&styles=&format=application%2Fvnd.mapbox-vector-tile`
    // Check for existing vector tile source with provided ID 
    sourceExists = map.sources.getById(VTSid)
    
    if(sourceExists !== undefined) {
        // Check if desired layer is in this data source
        if(sourceExists.options.tiles.filter(function(x) {
            return x.indexOf(`&layers=${environment}%3A${layerName}`)>-1
        }).length>0) {
            // Layer exists, use current datasource without changes
            return sourceExists
        } else {
            // layer does not exist, add
            sourceExists.options.tiles.push(tileURL)
            return sourceExists
        }
    }

    // Create new vector tile source with provided ID and add to the map
    options['tiles']=[tileURL]
    DataSource = new atlas.source.VectorTileSource(VTSid,options);
    map.sources.add(DataSource);

    return DataSource
}

//////////////////////////////////////////////////
// Kaartlagen
//////////////////////////////////////////////////
// Define functions that construct a full layer, including data, styling, events, etc.
// Always returns a promise with an (array of) layers

// If a small adaptation of a layer/function is needed, do not copy/paste the function, instead set "vis=false" when calling the function & put a ".then" behind the function call to make the changes as soon as the promise fullfills, then set visiblity to true
// e.g.: cnstr_somefunctionname(false).then((layers) => {
//     // Make changes here
//     layers[0].setOptions({key1: value1, key2: value2})
//     for (var i = 0; i < l.length; i++) {
//         show_layer(l[i])
//     }
// })


function cnstr_plancapaciteit_layer(vis=true,cql='') {
    // geometry from geoserver
    // detailed info for 1 poly from "https://plancapaciteit.nl/data/plan/[id]?_format=json"
    // detailed info for 1 municipality from "https://plancapaciteit.nl/data/municipality/[id]/plans?_format=json"
    return new Promise(function(resolve, reject) {
        var ds = new atlas.source.DataSource('ds_plancapaciteit');
        map.sources.add(ds)
        
        var layers = []

        layers[0] = new atlas.layer.PolygonLayer(ds, 'plancapaciteit_areas', {
            fillColor: ['get', 'color'],
            opacity: 1,
            visible: vis
        });
      
        layers[1] = new atlas.layer.LineLayer(ds, 'plancapaciteit_outlines', {
            strokeColor: ['get', 'color'],
            strokeWidth: 2,
        });

        map.layers.add(layers,LayerLevelMid);

        client_plancapaciteit_geoserver.getFeatures({
            typeNames: 'plancapaciteit_public:plans_public',
            cql_filter: cql
        }).then(fc => {
                ds.add(fc);
                // console.log(fc)
                resolve(layers)
            }) 
    })
}

// function cnstr_plancapaciteit_layer(vis=true,cql='') {
//     // geometry from geoserver
//     // detailed info for 1 poly from "https://plancapaciteit.nl/data/plan/[id]?_format=json"
//     // detailed info for 1 municipality from "https://plancapaciteit.nl/data/municipality/[id]/plans?_format=json"

//         return new Promise(function(resolve, reject) {
//             sourceLayer= 'bouwplannen'
//             var ds = createVectorDataSource('ds_bouwplannen','https://app-geoserver.azurewebsites.net',GeoserverNamespace,sourceLayer)

//             var layer = new atlas.layer.PolygonLayer(ds, 'bouwplannen', {
//                 sourceLayer: sourceLayer,
//                 fillColor: ['get', 'color'],
//                 opacity: 1,
//                 visible: vis
//             });

//             map.layers.add(layer,LayerLevelMid);
//             resolve(layer)
//         })
// }


// kaartje met aantal vrachtwagens per area

function cnstr_municipalities_layer(vis=true,cql='', herkomstMunicipalities = []) {
    // geometry from geoserver
    // detailed info for 1 poly from "https://plancapaciteit.nl/data/plan/[id]?_format=json"
    // detailed info for 1 municipality from "https://plancapaciteit.nl/data/municipality/[id]/plans?_format=json"

    // register icon for (later) visualisation
    map.imageSprite.add('weight-icon', 'https://stbereikbaarheid001.blob.core.windows.net/mapsprites/weight-icon.svg')
    map.imageSprite.add('cartruck-icon', 'https://stbereikbaarheid001.blob.core.windows.net/mapsprites/cartruck-icon.svg')

    return new Promise(function(resolve, reject) {
        var ds = new atlas.source.DataSource('ds_municipalities');
        map.sources.add(ds)

        var layers = []
        layers[0] = new atlas.layer.PolygonLayer(ds, 'municipalities_areas', {
            fillColor: [
                'case',
                ['in', ['get', 'name'], ['literal', herkomstMunicipalities]], // Controleer of het ID in de lijst zit
                'red', // Nieuwe kleur voor het specifieke polygon
                'transparent'
            ],
            opacity: 0.1,
            visible: vis
        });
        layers[1] = new atlas.layer.SymbolLayer(ds, 'municipalities_numbers', {
            minZoom: 10,
            iconOptions: {
                //Hide the icon image.
                //image: "TemplatedIcon"
                image: "None"
            },
            textOptions: {
                textField: ['get', 'number'],
            },
            visible: vis
        });

        map.layers.add(layers[0],LayerLevelLow);
        map.layers.add(layers[1],LayerLevelHigh);

        client_plancapaciteit_geoserver.getFeatures({
            typeNames: 'plancapaciteit_public:municipalities',
            cql_filter: cql
        }).then(fc => {
            ds.add(fc);
            //console.log('fc', fc)
            resolve(layers)
        }) 
})
}

function cnstr_kwetsbarewegdelen_layer(vis=true,cql='') {
    // Kwetsbare wegdelen van geoserver

    return new Promise(function(resolve, reject) {
        sourceLayer= 'ndw_kwetsbarewegdelen'
        var ds = createVectorDataSource('ds_kwetsbarewegdelen','https://app-geoserver.azurewebsites.net',GeoserverNamespace,sourceLayer)

        var layer = new atlas.layer.LineLayer(ds, 'kwetsbarewegdelen', {
            sourceLayer: sourceLayer,
            visible: vis,
            minZoom: 10,
            strokeColor: '#FFCC00',
            strokeOpacity: 0.9,
            strokeWidth: 3,
            strokeDashArray: [2,2]
        });

        map.layers.add(layer,LayerLevelMid);
        resolve(layer)
    })
}


function cnstr_borden_layer(vis=true,cql='') {

    //image sprites inladen
    map.imageSprite.add('arrow-left', 'https://stbereikbaarheid001.blob.core.windows.net/mapsprites/right-arrow.png')
    map.imageSprite.createFromTemplate('black_arrow', 'arrow-up-thin', 'black', 'black')
    names=['C01.svg', 'C20leeg.svg', 'C21leeg.svg'];
    for(i=0;i<names.length;i++) {        
        map.imageSprite.add(names[i].split(".").slice(0,-1).join("."), 'https://stbereikbaarheid001.blob.core.windows.net/mapsprites/'+names[i])
    }

    return new Promise(function(resolve, reject) {

        sourceLayer='ndw_bebording_selectie_verfijnd'
        var ds = createVectorDataSource('ds_borden','https://app-geoserver.azurewebsites.net',GeoserverNamespace,sourceLayer)   

        var layers = []

        //Create layers to render the signs.
        layers[0] = new atlas.layer.SymbolLayer(ds, 'borden', {
            sourceLayer: sourceLayer,
            visible: vis,
            minZoom: 13,
            iconOptions: {
                image:  ['case',
                            ['==', ['get', 'rvv_modelnummer'], 'C1'], 'C01',
                            ['==', ['get', 'rvv_modelnummer'], 'C20'], 'C20leeg',
                            ['==', ['get', 'rvv_modelnummer'], 'C21'], 'C21leeg',
                        ''],
                size: ['interpolate',['linear'],['zoom'],14,0.4,16,1],
                anchor: 'center',
                allowOverlap: true,
                ignorePlacement: true,
            },
            textOptions: {
                size: ['interpolate',['linear'],['zoom'],14,6.4,16,16],
                offset: ['case',
                            ['==', ['get', 'rvv_modelnummer'], 'C21'], ["literal",[-0.1, 0.2]],
                            ["literal",[-0.1,-0.2]]
                        ],
                textField: [
                    'format',
                    ['get', 'tekst_waarde'],{}
                ],
            }
        });

        layers[1] = new atlas.layer.SymbolLayer(ds, 'borden_direction', {
            sourceLayer: sourceLayer,
            visible: vis,
            minZoom: 13,
            iconOptions: {
                // image: 'marker-black',
                image:  ['case', 
                            ['==', ['get', 'kijkrichting'], 'N'], 'black_arrow',
                            ['==', ['get', 'kijkrichting'], 'O'], 'black_arrow',
                            ['==', ['get', 'kijkrichting'], 'Z'], 'black_arrow',
                            ['==', ['get', 'kijkrichting'], 'W'], 'black_arrow',
                        ''],
                // size: ['interpolate',['linear'],['zoom'],14,0.3,18,1],
                // anchor: 'top',
                size: ['interpolate',['linear'],['zoom'],14,0.4,16,1],
                anchor: 'center',
                offset: [0,-45],
                rotation:   ['case', 
                                ['==', ['get', 'kijkrichting'], 'N'], 0,
                                ['==', ['get', 'kijkrichting'], 'O'], 90,
                                ['==', ['get', 'kijkrichting'], 'Z'], 180,
                                ['==', ['get', 'kijkrichting'], 'W'], 270,
                            0],
                allowOverlap: true,
                ignorePlacement: true,
            },
        })

        map.layers.add(layers,LayerLevelMid);
        resolve(layers)
    })
}

function cnstr_wegennetwerk(vis=true) {
    // VectorTile van het wegennetwerk van Nederland
    return new Promise(function(resolve, reject) {
        sourceLayer='reduced_wegenbestand'
        var ds = createVectorDataSource('ds_wegennetwerk_vector','https://app-geoserver.azurewebsites.net',GeoserverNamespace,sourceLayer)   
        var layers = []
        layers[0] = new atlas.layer.LineLayer(ds, 'wegennetwerk_routes', {
            sourceLayer: sourceLayer,
            strokeColor:'transparent',
            strokeWidth: 4,
            opacity: 1,
            visible: vis
        });
        layers[1] = new atlas.layer.LineLayer(ds, 'wegennetwerk_routes_buffer', {
            sourceLayer: sourceLayer,
            strokeColor: 'transparent',
            strokeWidth: 10,
            visible: vis
        })
        console.log('kaartlaag wegenbestand', layers[0])
        map.layers.add(layers,LayerLevelMid);
        resolve(layers)
    })
}

function cnstr_vaarwegen(vis=true) {
    // VectorTile van het waterwegennetwerk 
    return new Promise(function(resolve, reject) {
        sourceLayer='vaarwegen_nh_update'
        var ds = createVectorDataSource('ds_vaarwegen_vector','https://app-geoserver.azurewebsites.net',GeoserverNamespace,sourceLayer)   
        var layers = []
        layers[0]= new atlas.layer.LineLayer(ds, 'vaarwegen', {
            sourceLayer: sourceLayer,
            strokeColor:'LightSteelBlue',
            strokeWidth: 1,
            opacity: 1,
            visible: vis
        });
        layers[1] = new atlas.layer.LineLayer(ds, 'vaarwegen_routes_buffer', {
            sourceLayer: sourceLayer,
            //strokeColor: 'LightSteelBlue', # TODO deze optie aanzetten voor de waterwegen in de route visualisatie
            strokeColor: 'transparent',
            strokeWidth: 5,
            visible: vis
        })

        map.layers.add(layers,LayerLevelMid);
        resolve(layer)
    })
}

function cnstr_overslagpunten(vis=true) {
    //image sprites inladen
    map.imageSprite.add('ship', 'https://stbereikbaarheid001.blob.core.windows.net/mapsprites/ship.svg')
    //map.imageSprite.add('water', 'https://stbereikbaarheid001.blob.core.windows.net/mapsprites/water.svg')

    // VectorTile van het waterwegennetwerk 
    return new Promise(function(resolve, reject) {
        sourceLayer='oversteek_edges'
        var ds = createVectorDataSource('ds_overslagpunten','https://app-geoserver.azurewebsites.net',GeoserverNamespace,sourceLayer)   
        var layers = []
        layers[0] = new atlas.layer.SymbolLayer(ds, 'overslagpunten', {
            sourceLayer: sourceLayer,
            minZoom: 5,
            iconOptions: {
                image: 'ship',
                allowOverlap: true,
                anchor: 'center',
                size: 0.035, 
            },
            visible: vis
        });

        map.layers.add(layers,LayerLevelMid);
        resolve(layer)
    })
}

function cnstr_doorfietsroutes(vis=true,cql='') {
    // geometry from geoserver
    // detailed info for 1 poly from "https://plancapaciteit.nl/data/plan/[id]?_format=json"
    // detailed info for 1 municipality from "https://plancapaciteit.nl/data/municipality/[id]/plans?_format=json"
    return new Promise(function(resolve, reject) {
        // var ds = new atlas.source.DataSource('ds_doorfietsroutes');
        sourceLayer = 'doorfietsroutes';
        var ds = createVectorDataSource('ds_doorfietsroutes','https://app-geoserver.azurewebsites.net',GeoserverNamespace,sourceLayer)   
        // map.sources.add(ds)
        
        var layers = []
        
        layers[0] = new atlas.layer.LineLayer(ds, 'doorfietsroutes', {
            sourceLayer: sourceLayer,
            strokeColor: ['case', 
                    ['==', ['get', 'realisatiestatus'], 'Gerealiseerd'], '#42b37c',
                    ['==', ['get', 'realisatiestatus'], 'Korte termijn'], '#F9A826',
                    ['==', ['get', 'realisatiestatus'], 'Lange termijn'], '#4f0e88',
                'transparent'],
            strokeColor: '#AA336A', //magenta', 
            strokeWidth: 2,
            visible: vis
        });

        map.layers.add(layers,LayerLevelMid);
        resolve(layers[0])


    })
}

function cnstr_kwetsbare_objecten() {
    // WMS
    layer_kwetsbare_objecten = new atlas.layer.TileLayer({
        tileUrl: 'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=isor_kwo_23122022_v2&WIDTH=512&HEIGHT=512&CRS=EPSG:3857&bbox={bbox-epsg-3857}',
        minZoom: 12,
    },'kwetsbareobjecten');
    map.layers.add(layer_kwetsbare_objecten,LayerLevelLow);
}


function cnstr_wegwerkzaamheden(vis) {
    // WFS TileVector
    //image sprites inladen
    map.imageSprite.add('J16', 'https://stbereikbaarheid001.blob.core.windows.net/mapsprites/J16.svg')
    

    return new Promise(function(resolve, reject) {
        sourceLayer = 'ndw_werkzaamheden_wvid_cleaned'
        var ds = createVectorDataSource('ds_wegwerkzaamheden','https://app-geoserver.azurewebsites.net',GeoserverNamespace,sourceLayer)
        // var ds = new atlas.source.DataSource('ds_wegwerkzaamheden');   
        // map.sources.add(ds);
        // url = 'https://stbereikbaarheid001.blob.core.windows.net/geojson/melvin_nh.geojson'
        // ds.importDataFromUrl(url)
    
        // Create layer
        layer = new atlas.layer.SymbolLayer(ds, 'wegwerkzaamheden', {
            sourceLayer: sourceLayer,
            minZoom: 10,
            iconOptions: {
                image: 'J16',
                size: 0.08, 
            },
            visible: vis
        });
        map.layers.add(layer, LayerLevelLow);
        resolve(layer)
    });

}

function cnstr_hubs(vis=true) {
    // WFS TileVector
    //image sprites inladen
    map.imageSprite.add('Hub', 'https://stbereikbaarheid001.blob.core.windows.net/mapsprites/logistieke_hub.svg')


    return new Promise(function(resolve, reject) {
        // Connect datasource
        // var ds = new atlas.source.DataSource('ds_hubs');
        // map.sources.add(ds);
        // url = 'https://stbereikbaarheid001.blob.core.windows.net/geojson/filtered_hubs_with_penalties_wgs84.geojson'
        // ds.importDataFromUrl(url)
        
        sourceLayer= "filtered_hubs"
        var ds = createVectorDataSource('ds_hubs', 'https://app-geoserver.azurewebsites.net',GeoserverNamespace,sourceLayer)

    
        // Create layer
        layer = new atlas.layer.SymbolLayer(ds, 'hubs', {
            sourceLayer : sourceLayer,
            minZoom: 5,
            iconOptions: {
                image: 'Hub',
                size: 0.035, 
                // opacity: ['match', ['get', 'hub_id'], ...[45,1], 0.5],
            },
            visible: vis
        });
        map.layers.add(layer, LayerLevelMid);
        resolve(layer)
    });

}
    


//////////////////////////////////////////////////
// Kaartlaag helper functies
//////////////////////////////////////////////////
// Update data, styling, events, etc.

function update_municipalities_layer(vis=true,verkeersstromen, housing_units) {
    // Vervang de waarden in verkeersstromen dict door kleurcodes en plaats in een array
    fillColorArray = valuesToColor(verkeersstromen, color='purple');

    // update kleuren in kaartlaag
    var polygonLayer = map.layers.getLayerById('municipalities_areas');
    polygonLayer.setOptions({
        fillColor: [
            'match',
            ['get', 'name'],
            ...fillColorArray,
            'transparent'
        ],
        opacity: 0.1,
        visible: vis
    });

    // Vermenigvuldig met housing units en maak teksten voor elke herkomst gemeente met aantal ritten en gewicht
    verkeersstromenNum = {}
    verkeersstromenWeight = {}
    for (var key in verkeersstromen) {
        verkeersstromenNum[key]=Math.round(parseInt(verkeersstromen[key][0]*housing_units))
        verkeersstromenWeight[key]=Math.round(parseInt(verkeersstromen[key][1]*housing_units)/1000)
    }


    // Update display values
    var polygonLayer = map.layers.getLayerById('municipalities_numbers')
    polygonLayer.setOptions({
        filter: ['>',['get', ['get', 'name'], ['literal', verkeersstromenNum]],0],
        minZoom: 0,
        iconOptions: {
            //Hide the icon image.
            image: "none"
        },
        textOptions: {
            // textField: ['get', ['get', 'name'], ['literal', verkeersstromenText]],
            textField: ["format",["image", "cartruck-icon"],' ',['get', ['get', 'name'], ['literal', verkeersstromenNum]],'\n',["image", "weight-icon"],' ',['get', ['get', 'name'], ['literal', verkeersstromenWeight]],' kt'],
            size: 16,
            haloColor: "white",
            haloWidth: 1
        }
    })
    if (document.getElementById('gemeentes_button').checked){
        polygonLayer.setOptions({
            visible: vis
        })
    }
} 

