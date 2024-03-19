// Do _NOT_ call GetMap()
// Instead, instanciating a new map happens by:
    // new GetMap().then((map) => {
    //     // add layers, events, etc. 
    // })
    function GetMap(AzureMapsClientId='d7c4f1bc-92ff-45de-8265-43ea84713a96',center=[4.72,52.45],zoom=10) {
        if (sessionStorage.getItem('camera') !== null) {
            var c = JSON.parse(sessionStorage.getItem('camera'))[0]
            var z = JSON.parse(sessionStorage.getItem('camera'))[1]
            // console.log('Map initialization location read from session storage, center: %o, zoom: %o',c,z)
        } else {
            var c=center
            var z=zoom
            // console.log('Map initialization location standard values used, center: %o, zoom: %o',c,z)
        }
    
        return new Promise(function(resolve) {
            // Init
            var authOptions = {
                authType: "anonymous",
                clientId: AzureMapsClientId, // azure map account client id
                getToken: function(resolve, reject, map) {
                    fetch(window.location.origin+'/api/maptoken').then(function(response) {
                        return response.text();
                    }).then(function(token) {
                        resolve(token);
                    });
                }
            }
            
            map = new atlas.Map('map', 
            {
                view: 'Auto',
                // pitch: 45,
                center: c,
                zoom: z,
                authOptions: authOptions,
                style: 'blank' // don't show default azure maps map
                
            });
        
            //Wait until the map resources are ready.
            map.events.add('ready', function () {
                basicMapStyling()
                follow2Dmapview() 
    
                ///---------------------------------------------------------------------------------------------------------
                ///    DUMMY LAYERS TO SET Z-INDEX   ///
                ///---------------------------------------------------------------------------------------------------------
                // Layers, by default, are added as the top layer
                // Alternatively, they can be inserted below an existing layer
                // This section defines dummy (empty) layers, that allow some control over z-index
                
                dummy_dataSource = new atlas.source.DataSource();
                map.sources.add(dummy_dataSource);
    
                LayerLevelLow = new atlas.layer.LineLayer(dummy_dataSource,'LayerLevelLow')
                map.layers.add(LayerLevelLow);
    
                LayerLevelMid = new atlas.layer.LineLayer(dummy_dataSource,'LayerLevelMid')
                map.layers.add(LayerLevelMid);
    
                LayerLevelHigh = new atlas.layer.LineLayer(dummy_dataSource,'LayerLevelHigh')
                map.layers.add(LayerLevelHigh);
    
                resolve(map)
    
            });  
        })
    }
    
    // ----------------------------------------------------------------------------------
    //      Locatie op map opslaan om te kunnen behouden tussen verschillende kaarten (in geval van meerdere tabbladen met kaarten)
    // ----------------------------------------------------------------------------------
    
    function follow2Dmapview() {
        map.events.add('moveend', follow2Dmap);
    
        function follow2Dmap(e) {
            b=map.getCamera().center
            c=map.getCamera().zoom
            sessionStorage.setItem('camera',JSON.stringify([b,c]))
        }
    }
    
    function basicMapStyling() {
        //////////////////////////////////////////////////
        // Base map styling
        //////////////////////////////////////////////////
    
        // console.log('voor add controls')
        // Basic controls, but no mapPicker
        add_controls();
        // console.log('na add controls')
    
        // Add pdok map types URLs
        mapTypes=['https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:3857/{z}/{x}/{y}.png',
        'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png',
        'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/pastel/EPSG:3857/{z}/{x}/{y}.png',
        'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/water/EPSG:3857/{z}/{x}/{y}.png',
        'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.png'];
        
        // Starting map
        currentMap=0;
    
        // Add pdok map layer
        bg_layer=new atlas.layer.TileLayer({
            tileUrl: mapTypes[currentMap],
            tileSize: 256,
            bounds: atlas.data.BoundingBox.fromEdges(-1.65729160235431, 48.0405018704265, 11.2902578747914,55.9136415748388),
            maxSourceZoom: 21
        },'background')
        map.layers.add(bg_layer,'labels');
    
        popup = new atlas.Popup();
    }
    
    function add_controls()
    {
        map.controls.add([new atlas.control.ZoomControl(),
            new atlas.control.CompassControl(),
            new atlas.control.PitchControl()
        ],{position: 'bottom-right'});
    
        maptype_div=document.getElementById('map_controls_maptype');
        if(maptype_div===null) {
            // create a mappicker element
            el=document.getElementById('leftSideWrapper');
            var newEl=document.createElement('div');
            newEl.id='map_controls_maptype';
            newEl.innerHTML=
            '<div id="map_controls_maptype_panel">'+
                '<button class="azure-maps-control-button curr-style" title="Grijs" alt="Select Style" type="button" onclick="change_bg_map(0)">'+
                    '<img src="https://analyzestmow001.blob.core.windows.net/public/BRT-grijs.png" alt="Grijs" style="width: 32px; height:32px;">'+
                '</button>'+
                '<button class="azure-maps-control-button curr-style" title="Standaard" alt="Select Style" type="button" style="margin-left:3px" onclick="change_bg_map(1)">'+
                    '<img src="https://analyzestmow001.blob.core.windows.net/public/BRT-standaard.png" alt="Standaard" style="width: 32px; height:32px;">'+
                '</button>'+
                '<button class="azure-maps-control-button curr-style" title="Pastel" alt="Select Style" type="button" style="margin-left:3px" onclick="change_bg_map(2)">'+
                    '<img src="https://analyzestmow001.blob.core.windows.net/public/BRT-pastel.png" alt="Pastel" style="width: 32px; height:32px;">'+
                '</button>'+
                '<button class="azure-maps-control-button curr-style" title="Water" alt="Select Style" type="button" style="margin-left:3px" onclick="change_bg_map(3)">'+
                    '<img src="https://analyzestmow001.blob.core.windows.net/public/BRT-water.png" alt="Water" style="width: 32px; height:32px;">'+
                '</button>'+
                '<button class="azure-maps-control-button curr-style" title="Satelliet" alt="Select Style" type="button" style="margin-left:3px" onclick="change_bg_map(4)">'+
                    '<img src="https://analyzestmow001.blob.core.windows.net/public/BRT-lucht.png" alt="Satelliet" style="width: 32px; height:32px;">'+
                '</button>'+
            '</div>'+
            '<button class="azure-maps-control-button curr-style" title="Selecteer kaarttype" alt="Selecteer kaarttype" type="button" style="margin:3px" onclick="change_bg_map()">'+
                '<img src="https://analyzestmow001.blob.core.windows.net/public/BRT-grijs.png" alt="Grijs" style="width: 32px; height:32px;">'+
                '<div class="icon" style="transform:rotate(180deg);"></div>'+
            '</button>';
    
            // // Background behing existing azure maps elements
            // var bgEl=document.createElement('div');
            // bgEl.id='map_controls_azure_bg';
    
            // // add div after leftSideWrapper
            // el.parentNode.insertBefore(bgEl, el.nextSibling);
            // el.parentNode.insertBefore(newEl, el.nextSibling);
            document.getElementById('map').appendChild(newEl)
        } else {
            // set visible
            document.getElementById('map_controls_maptype').style.display='block';
        }
    }
    
    function remove_controls()
    {
        map.controls.remove(map.controls.getControls());
        document.getElementById('map_controls_maptype').style.display='none';
    }