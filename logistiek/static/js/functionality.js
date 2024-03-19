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
                Authorization: 'Basic UkRUX3Bhc3N3b3JkX2FjY2VzczpSbjVFQFloNkJVbyQkNw==',
            }
        };
    },
});

///---------------------------------------------------------------------------------------------------------
///    layer en view toggles   ///
///---------------------------------------------------------------------------------------------------------


function toggle_layer(layer) {
    // adjust the visibility of the layer, makes it visible or hidden
    if (layer.options.visible == false){
        layer.setOptions({
            visible: true
        })
    }else{
        layer.setOptions({
            visible: false
        })
    }}


function show_layer(layer) {
    // Pas de zichtbaarheid van de laag aan, maakt het zichtbaar of verborgen
    layer.setOptions({
        visible: true
    });
}

function hide_layer(layer) {
    // Pas de zichtbaarheid van de laag aan, maakt het zichtbaar of verborgen
    layer.setOptions({
        visible: false
    });

}

function toggle_layer_municipality() {
    layer1 = map.layers.getLayerById('municipalities_areas')
    if (layer1.options.fillOpacity > 0){
        layer1.setOptions({
            fillOpacity: 0
        })
    } else {
        layer1.setOptions({
            fillOpacity: 0.5
        })
    }
    layer2 = map.layers.getLayerById('municipalities_numbers')
    if (document.getElementById('gemeentes_button').checked){
        layer2.setOptions({
            visible: vis
        })
    } else {
        layer2.setOptions({
            visible: false
        })
    }
}

function show_content(layer) {
    // shows the legend of the layer only when it is shown on the map
    layer_status = document.getElementById(layer).style.display
    if (layer_status == "block"){
        document.getElementById(layer).style.display = "none"
    }else{
        document.getElementById(layer).style.display = "block"
    }
}

function constructorToToggle(id,newFunc) {
    // Change behavior of the button from constructing (a layer) to toggling
    document.getElementById(id).checked = true;
    document.getElementById(id).setAttribute('onclick',newFunc);
}

function loading_gif(loading){
    return new Promise(function(resolve, reject) {
        if (loading == true){
            document.getElementById('loading_panel_id').style.display = "block"
        }
        else{
            document.getElementById('loading_panel_id').style.display = "none"
        }
        resolve()
    })
}

function notification_popup(loading){
    return new Promise(function(resolve, reject) {
        if (loading == true){
            document.getElementById('notification_panel_id').style.display = "block"
        }
        else{
            document.getElementById('notification_panel_id').style.display = "none"
        }
        resolve()
    })
}

// ----------------------------------------------------------------------------------
//      DATA FUNCTIONALITEITEN
// ----------------------------------------------------------------------------------

let isRequestInProgress = false;

function fetch_json(relPathOrURL,body) {
    if (!relPathOrURL.includes('https')){
        relPathOrURL = window.location.origin+relPathOrURL
    } 
    return new Promise(function(resolve, reject) {
        if (isRequestInProgress){
            reject(new Error('Een verzoek is al in uitvoering. Wacht tot het is voltooid.'));
            return;
        }

        isRequestInProgress = true;

        fetch(relPathOrURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then((response) => {
            if (response.ok) {
                try {resolve(response.json())
                } catch {
                    console.log('Raw reponse: %o',response)
                    throw new Error('Did not obtain a valid JSON while calling '+ url +'.')
                } finally {
                    isRequestInProgress = false; // Markeer het verzoek als voltooid
                }
            }
        }).catch((error) => {
            console.log('Error details: %o',error)
            reject(error)
            isRequestInProgress = false; // Markeer het verzoek als voltooid, zelfs bij fouten
        })
    })
}

function yyyymmdd(dateIn,detail='min') {
    var yyyy = dateIn.getFullYear();
    var mm = dateIn.getMonth() + 1; // getMonth() is zero-based
    var dd = dateIn.getDate();
    var hh = dateIn.getHours();
    var min = dateIn.getMinutes();
    var ss = dateIn.getSeconds();

    if(detail=='day') {
    date_str=yyyy+'-'+mm.toString().padStart(2, '0')+'-'+dd.toString().padStart(2, '0')
    } else if(detail=='min') {
        date_str+=', '+hh.toString().padStart(2, '0')+':'+min.toString().padStart(2, '0')
    } else if(detail=='sec') {
        date_str+=':'+ss.toString().padStart(2, '0')
    }
    return date_str
}


function value_to_color(value, min_value, max_value, expo ){
    start_color=[0,255,255]
    end_color=[0,50,100]

    value = Math.max(Math.min(value, max_value), min_value)
    proportion = (value - min_value) / (max_value - min_value)
    transformed_value = Math.pow(proportion, expo)

    r = Math.floor(start_color[0] + transformed_value * (end_color[0] - start_color[0]))
    g = Math.floor(start_color[1] + transformed_value * (end_color[1] - start_color[1]))
    b = Math.floor(start_color[2] + transformed_value * (end_color[2] - start_color[2]))
    return [r,g,b]


}

function valuesToColor(verkeersstromen, color) {
    // Bepaal de max en min waarde
    let min = Infinity; // Begin met een zeer grote waarde
    let max = -Infinity; // Begin met een zeer kleine waarde
    waarde = []

    for (let key in verkeersstromen) {
        waarde.push(verkeersstromen[key][0])
        if (verkeersstromen.hasOwnProperty(key)) {
            if (verkeersstromen[key][0] > max) {
                max = verkeersstromen[key][0]; // max aantal ritten
            }
            if (verkeersstromen[key][0] < min) {
                min = verkeersstromen[key][0]; // min aantal ritten
            }
        }
    }

    //maak een array met voor elke key een kleurwaarde
    fillColorArray = []
    for (var key in verkeersstromen) {
        value = verkeersstromen[key][0] // aantal ritten
    
        // Converteer de waarde naar een kleurcode tussen transparant en paars
        if (color === 'purple') {
            var adjustedValue = Math.pow((value - min) / (max - min), 0.25);    // Pas de normalisatie aan op basis van een exponentiële functie. Dit vermindert de kleurvariatie tussen kleine waarden en vergroot de variatie tussen grote waarden.
            var opacity = Math.min(1, Math.max(0.25, adjustedValue));           // Normaliseer de schaal naar het bereik van minOpacity en maxOpacity
            var red = Math.round(75 * opacity);
            var blue = Math.round(255 * opacity);
            
          } else if (color === 'blue') {
            var intensity = 0.25 // intensity means how fast colors go from start to end color. > 1 for  more high values.  < 1 for more low values
            var red = value_to_color(value, min, max, intensity)[0]
            var green = value_to_color(value, min, max, intensity)[1]
            var blue = value_to_color(value, min, max, intensity)[2]

          }

        if (color == 'purple'){
            fillColorArray.push(String(key), `rgba(${red}, 0, ${blue}, ${opacity})`)
        } else if (color == 'blue'){
            fillColorArray.push(String(key), `rgba(${red}, ${green}, ${blue}, 1)`)
        }

    }
    return fillColorArray
}

function get_bbox(shapes_array) {
    if (shapes_array[0].data.geometry.type == "LineString") {
        sw_lon=Math.min(...shapes_array.map(x => Math.min(...x.data.geometry.coordinates.map(y => y[0]))));
        sw_lat=Math.min(...shapes_array.map(x => Math.min(...x.data.geometry.coordinates.map(y => y[1]))));
        ne_lon=Math.max(...shapes_array.map(x => Math.max(...x.data.geometry.coordinates.map(y => y[0]))));
        ne_lat=Math.max(...shapes_array.map(x => Math.max(...x.data.geometry.coordinates.map(y => y[1]))));
    } else {
        sw_lon=Math.min(...shapes_array.map(x => Math.min(...x.data.geometry.coordinates[0].map(y => y[0]))));
        sw_lat=Math.min(...shapes_array.map(x => Math.min(...x.data.geometry.coordinates[0].map(y => y[1]))));
        ne_lon=Math.max(...shapes_array.map(x => Math.max(...x.data.geometry.coordinates[0].map(y => y[0]))));
        ne_lat=Math.max(...shapes_array.map(x => Math.max(...x.data.geometry.coordinates[0].map(y => y[1]))));
    }
    return [sw_lon,sw_lat,ne_lon,ne_lat]
}

function combineTrafficByRoadID(verkeersstromen, roadIdsByRoute){
    // Een nieuwe dictionary om de gecombineerde gegevens op te slaan
    const trafficByRoadId = {};
    // Itereer door de verkeersstromen dictionary om het aantal ritten en gewicht te ordenen per wegvakId ipv per gemeente

    for (const gemnaam_herkomst in verkeersstromen) {
        if (roadIdsByRoute.hasOwnProperty(gemnaam_herkomst)){
            // Haal de road_ids op uit de roadIdsPerRoute dictionary
            var roadIds = roadIdsByRoute[gemnaam_herkomst]["route"];
            roadIds = roadIds.map(x => x) // use the absolute values to make it traffic-direction independent

            // Itereer door de road_ids en voeg ze toe aan de gecombineerde dictionary
            for (const roadId of roadIds) {
                if (trafficByRoadId[roadId]) {
                    // Als de road_id al in de gecombineerdeData dictionary bestaat, tel de waarde op
                    trafficByRoadId[roadId][0] += parseFloat(verkeersstromen[gemnaam_herkomst][0].toFixed(2)) //aantal ritten
                    trafficByRoadId[roadId][1] += parseFloat(verkeersstromen[gemnaam_herkomst][1].toFixed(2)) //gewicht
                    trafficByRoadId[roadId][2] += parseFloat(verkeersstromen[gemnaam_herkomst][2].toFixed(2)) //aantal vrachtwagens
                    trafficByRoadId[roadId][3] += parseFloat(verkeersstromen[gemnaam_herkomst][3].toFixed(2)) //aantal bestelbussen
                } else {
                    // Als de road_id nog niet in de gecombineerdeData dictionary bestaat, voeg deze toe
                    trafficByRoadId[roadId] = [
                        parseFloat(verkeersstromen[gemnaam_herkomst][0]), //aantal ritten
                        parseFloat(verkeersstromen[gemnaam_herkomst][1]), //gewicht
                        parseFloat(verkeersstromen[gemnaam_herkomst][2]), //aantal vrachtwagens
                        parseFloat(verkeersstromen[gemnaam_herkomst][3]), //aantal bestelbussen
                    ]   
                        
                }
            }
        }
    }


    const trafficByRoadId_n = {}
    for ( var key in trafficByRoadId ){
        var aantal  = trafficByRoadId[key][0]
        var gewicht  = trafficByRoadId[key][1]
        var vrachtwagens  = trafficByRoadId[key][2]
        var bestelbussen  = trafficByRoadId[key][3]
        
        aantal_n  = Math.round(aantal * 100)/100
        gewicht_n  = Math.round(gewicht * 100)/100
        vrachtwagens_n  = Math.round(vrachtwagens * 100)/100
        bestelbussen_n  = Math.round(bestelbussen * 100)/100
        trafficByRoadId_n[key] = [
            aantal_n, gewicht_n, vrachtwagens_n, bestelbussen_n
        ]

    }

    return trafficByRoadId_n
}


// ----------------------------------------------------------------------------------
//      DATASOURCES FILTEREN
// ----------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------
//      MAP FUNCTIONALITEITEN
// ----------------------------------------------------------------------------------

function change_bg_map(mapnum) {
    if(mapnum === undefined) {
        currentMap=(currentMap + 1) % mapTypes.length;
    } else {
        currentMap=mapnum;
    }
    bg_layer.setOptions({tileUrl:mapTypes[currentMap]})
}

function flyToBBOX(sw_lon,sw_lat,ne_lon,ne_lat) {
    bbox=new atlas.data.BoundingBox([sw_lon,sw_lat,ne_lon,ne_lat])
    map.setCamera({
        bounds: bbox,
        padding: 50,
        pitch: 0,
        type: 'fly',
        duration: 2000,
    })
}

function flyToLoc(lon,lat) {
    map.setCamera({
        center: [lon,lat],
        zoom: 16,
        pitch: 0,
        type: 'fly',
        duration: 2000,
    })
}

// ----------------------------------------------------------------------------------
//      POPUP INFORMATION
// ----------------------------------------------------------------------------------



addEventListener('DOMContentLoaded', (dom) => {
    let dropdown = document.getElementsByClassName("dropdown-btn");
    let i;            
    for (i = 0; i < dropdown.length; i++) {
        dropdown[i].addEventListener("click", function(e) {
            e.currentTarget.parentElement.classList.toggle("active");
        });
    }

    document.getElementById('scenarios').addEventListener("click", function(e) {
        document.getElementById('scenario-panel').classList.toggle('active-scenarios');
    });

    document.getElementById('kosten').addEventListener("click", function(e) {
        document.getElementById('scenario-panel').classList.toggle('active-scenarios');
    });

    let dropdownsSidepanel = ['scenarios','kosten'];
    dropdownsSidepanel.forEach(function(dd){
        document.getElementById(dd).addEventListener("click", function(e) {
            e.currentTarget.classList.toggle('active-dd');
            if(document.querySelector('.active-dd')) {
                document.getElementById('scenario-panel').classList.add('active-scenarios');
                let spHeight = document.getElementById('scenario-panel').offsetHeight;
                spHeight = spHeight + 110;
                document.getElementById('information-panel').setAttribute("style","height: calc(100% - " + spHeight + "px)");
            } else {
                document.getElementById('scenario-panel').classList.remove('active-scenarios');
                document.getElementById('information-panel').style.height = '';
            }
        });
    })

    const sceneBtns = document.querySelectorAll('.scenario-btn');
    sceneBtns.forEach(function(sceneBtn) {
        sceneBtn.addEventListener('click', function(e){
            // Update de tekst in de header-cel met de titel van de geselecteerde scenario-knop
            document.getElementById('scenario-header-left').innerText = `Maatschappelijke kosten bij scenario: ${e.currentTarget.dataset.title}`;
            
            console.log(e.currentTarget.dataset.title)
            if (e.currentTarget.dataset.title !== 'Niks doen') {
                document.getElementById('scenario-header-right').innerText = `Besparingen t.o.v. "Niks doen"`;
            }
            // Te tonen kaartlagen wijzigen op basis van geselecteerde scenario
            updateKaartlagenScenarios(e.currentTarget.id);
            sceneBtns.forEach(function(notsceneBtn) {
                notsceneBtn.classList.remove('activebtn');
            });
            e.currentTarget.classList.add('activebtn');

            sceneBtns.forEach(function(btn) {
                btn.disabled = false;
            });
            
        });
    });
    
    function buttonClick(target,e) {
        document.getElementById(target).style.display = 'block';
        e.classList.add('deactivated-button'); 
        setTimeout(function(){
            document.getElementById(target).classList.add('active-panel');
        }, 10);
    }

    function closeClick(target,e) {
        e.parentElement.classList.remove('active-panel');
        document.getElementById(target).classList.remove('deactivated-button');
        setTimeout(function(){
            e.parentElement.style.display = 'none';
        },300);
    }
});

// ----------------------------------------------------------------------------------
//      POPUP INFORMATION
// ----------------------------------------------------------------------------------

