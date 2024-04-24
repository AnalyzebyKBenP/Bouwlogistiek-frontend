//////////////////////////////////////////////////
// Map
//////////////////////////////////////////////////

// Initalize global variables
var savedScenarios = {};
var plangebiedInfo = {};
var verkeersstromen;
var scenario;
var traffic_by_roadID;

// Create a new map instance based on the 'template' defined in CreateMap.js
function GetMapLogistiek() {
    new GetMap().then((map) => {
        map.setServiceOptions({
            transformRequest: function (url, resourceType) {
                if (url.includes('https://app-geoserver.azurewebsites.net')) {
                    // Request directed at our own Geoserver
                    // Add authorization headers to the request.
                    return {
                        url: url,
                        headers: {
                            Authorization: GeoserverAuth,
                        }
                    };
                } else {
                    return { url: url };
                }
            }
        });

        //////////////////////////////////////////////////
        // Add layers
        //////////////////////////////////////////////////
        cnstr_wegennetwerk(true, []);

        cnstr_municipalities_layer(false).then((layer) => {
            show_layer(layer[0]);
        });

        cnstr_plancapaciteit_layer(false, "color = '#FF8000'").then((layer) => {
            show_layer(layer[0]);
        });

        cnstr_kwetsbarewegdelen_layer();

        cnstr_borden_layer();

        // cnstr_doorfietsroutes(true, "provincie = 'Noord-Holland' and realisatiestatus = 'Gerealiseerd'");
        cnstr_doorfietsroutes(false);

        cnstr_kwetsbare_objecten();

        cnstr_wegwerkzaamheden(false);

        cnstr_hubs(false);

        cnstr_vaarwegen(false);

        cnstr_overslagpunten(false);

        //////////////////////////////////////////////////
        // Add events
        //////////////////////////////////////////////////

        map.events.add('click', clickEventsPlangebied);

        var layer_wegwerkzaamheden = map.layers.getLayerById('wegwerkzaamheden');
        map.events.add('mousedown', layer_wegwerkzaamheden, function (e) {
            symbolHoveredWegwerkzaamheden(e);
        });

    });
}


//////////////////////////////////////////////////
// Event callbacks
//////////////////////////////////////////////////

function clickEventsPlangebied(e) {
    // Maak routes van vorig plangebied onzichtbaar
    hide_layer(map.layers.getLayerById('wegennetwerk_routes'));

    // Haal informatie op over het aangeklikte plangebied
    const { plancapacity_ids, municipality_ids, municipality_name, plangebied_coordinaten } = getPlangebiedInfo(e);

    // Controleer of het klikken in een plancapaciteit-gebied plaatsvond
    if (plancapacity_ids.length === 0) {
        return;
    }

    // Controleer of er al opgeslagen routes zijn voor dit plangebied
    if (savedScenarios[plancapacity_ids[0]]) {
        console.log('Plangebied is al eerder aangeklikt; opgeslagen routes kunnen worden gebruikt.');
    }

        // Haal informatie op over de logistiek vanuit de herkomstgemeentes naar plangebied
    if (plancapacity_ids.length > 0 && municipality_ids.length > 0) {
        const relPath = '/psql/bouwlogistiek_od';
        const body = { "gemnaam_bestemming": municipality_name };

        try {
            const promise_verkeersstromen = fetch_json(relPath, body);
            const promise_featuredetails = getPlancapaciteitFeatureDetails();

            // Bereken routes en visualiseer data
            Promise.all([promise_featuredetails, promise_verkeersstromen]).then((values) => {
                // Toon laadbalk tijdens het berekenen van de route
                loading_gif(true);
                handleFeatureDetailsAndVerkeersstromen(values);
                verkeersstromen = values[1];
            });
        } catch (error) {
            console.error('Er is een fout opgetreden bij het maken van het fetch_json-verzoek:', error);
            return;
        }
    }
}


//////////////////////////////////////////////////
// Helper functions ClickEventsPlangebied
//////////////////////////////////////////////////


function getPlangebiedInfo(e) {
    const plancapaciteitShapes = e.shapes.filter(x => x.layer.id === 'plancapaciteit_areas');
    const municipalityShapes = e.shapes.filter(x => x.layer.id === 'municipalities_areas');
    
    plangebiedInfo = {
        plancapacity_ids: plancapaciteitShapes.map(x => x.properties.id),
        municipality_ids: municipalityShapes.map(x => x.properties.id),
        municipality_name: municipalityShapes.map(x => x.properties.name)[0],
        plangebied_coordinaten: plancapaciteitShapes.map(x => x.geometry.coordinates)[0][0]
    };

    // Speciale behandeling voor gemeente Landsmeer
    if (plangebiedInfo.municipality_name === "Landsmeer" || plangebiedInfo.municipality_name === "Den Helder") {
        plangebiedInfo.plangebied_coordinaten = plangebiedInfo.plangebied_coordinaten[0];
    }

    return plangebiedInfo;
}


function getPlancapaciteitFeatureDetails() {
    plancapacity_id = plangebiedInfo['plancapacity_ids'][0]
    const url = `https://plancapaciteit.nl/data/plan/${plancapacity_id}?_format=json`;
    promise_featuredetails=fetch(window.location.origin+'/p/'+url).then((response) => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Error when calling plancapaciteit: '+url)
    }).then((respJSON) => {
        plangebiedInfo['housing_units'] = respJSON[0].totals
        return respJSON[0]
    }).catch((error) => {
        console.log(error)
    })

    return promise_featuredetails
}

function handleFeatureDetailsAndVerkeersstromen(values) {
    // Variabelen initialiseren
    const { totals: housing_units, title: plangebied_title } = values[0];
    const verkeersstromen = values[1]; // TODO: Moet dit alleen voor het "niks doen"-scenario zijn? Overweeg het doorgeven aan routes.
    plangebiedInfo['title'] = plangebied_title

    // Informatie naar het linkermenu bijwerken
    const plangebiedDetailsElement = document.getElementById('plangebied_details');
    plangebiedDetailsElement.innerText = `In plangebied ${plangebied_title} zijn ${housing_units} nieuwe woningen gepland.`;
    plangebiedDetailsElement.style.display = 'block';

    // Update kaartlaag gemeentekleuren en getallen
    update_municipalities_layer(true, verkeersstromen, housing_units);
    loading_gif(false);
}


//////////////////////////////////////////////////////////
// Helper functions handleFeatureDetailsAndVerkeersstromen
//////////////////////////////////////////////////////////


function createRequestJson(verkeersstromen, scenario) {
    return {
        "herkomst": Object.keys(verkeersstromen),
        "bestemming": {
            "gemeente": plangebiedInfo.municipality_name,
            "plan_id": plangebiedInfo.plancapacity_ids[0],
            "geometry": plangebiedInfo.plangebied_coordinaten,
            'housing_units': parseInt(plangebiedInfo.housing_units),
        },
        'scenario': scenario,
        'dtp': 'nee'
    };
}

function determineUrl() {
    let url = 'https://func-dijkstrapath-002.azurewebsites.net/api/dijkstra';
    if (window.location.href.includes('localhost:5000') || window.location.href.includes('127.0.0.1:5000')) {
        //url = 'https://func-dijkstrapath-002-dev.azurewebsites.net/api/dijkstra';
        url = 'https://func-dijkstrapath-002.azurewebsites.net/api/dijkstra'
    }
    return url;
}

async function fetchRoutes(request_json) {
    const url = determineUrl();
    const routes = await fetch_json(url, request_json);
    console.log(routes)
    return routes;
}

async function loadRoutes(scenario) {
    loading_gif(true);

    const {plancapacity_ids} = plangebiedInfo;

    if (savedScenarios[plancapacity_ids[0]] && savedScenarios[plancapacity_ids[0]][scenario]) {
        console.log("Opgeslagen route gebruikt.");
        const routes  = savedScenarios[plancapacity_ids[0]][scenario]
        traffic_by_roadID = combineTrafficByRoadID(verkeersstromen, routes);
        const colorArray = valuesToColor(traffic_by_roadID, color = 'blue');
        updateTabelKosten(scenario, routes);
        updateTabelBesparingen(routes, scenario);
        handleRoutes(colorArray, traffic_by_roadID );
        if (scenario == "hubs"){
            hub_id = routes.totaal.hub_id
            handleHubs(hub_id)
        };
        if (scenario == 'vaarwegen'){
            overslagpunten = routes.totaal.oversteekpunten 
            console.log("overslagpunten", overslagpunten)
            handleOverslagpunten(overslagpunten)
        }

    } else {
        console.log('Nieuwe route wordt berekend');

        try {
            const request_json = createRequestJson(verkeersstromen, scenario);
            console.log(request_json)
            const routes = await fetchRoutes(request_json);
            traffic_by_roadID = combineTrafficByRoadID(verkeersstromen, routes);
            const colorArray = valuesToColor(traffic_by_roadID, color = 'blue');

            if (!savedScenarios[plancapacity_ids[0]]) {
                savedScenarios[plancapacity_ids[0]] = {};
            }

            // savedScenarios[plancapacity_ids[0]][scenario] = colorArray;
            savedScenarios[plancapacity_ids[0]][scenario] = routes;

            updateTabelKosten(scenario, routes);
            updateTabelBesparingen(routes, scenario);
            handleRoutes(colorArray, traffic_by_roadID, scenario);
            if (scenario == "hubs"){
                hub_id = routes.totaal.hub_id
                console.log('Dit is het hub id', hub_id)
                handleHubs(hub_id)
            };
            if (scenario == "vaarwegen"){
                overslagpunten = routes.totaal.oversteekpunten
                console.log(overslagpunten)
                handleOverslagpunten(overslagpunten)
            };
        } catch (error) {
            console.error('Fout bij het laden van routes:', error);
        } finally {
            loading_gif(false);
        }
    }
}

function handleRoutes(colorArray, traffic_by_roadID, scenario) {
    const wegennetwerk_routes_layer = map.layers.getLayerById('wegennetwerk_routes');
    const wegennetwerk_routes_buffer_layer = map.layers.getLayerById('wegennetwerk_routes_buffer');
    console.log('layer wegen', wegennetwerk_routes_layer)

    wegennetwerk_routes_layer.setOptions({
        strokeColor: ['match', ['get', 'weg_id'], ...colorArray, 'transparent'],
        strokeWidth: ['case', ['in', ['get', 'weg_id'], ['literal', colorArray]], 4, 0],
        visible: true
    });

    wegennetwerk_routes_buffer_layer.setOptions({
        strokeWidth: ['case', ['in', ['get', 'weg_id'], ['literal', colorArray]], 10, 0]
    });

     // Sluit laadbalk
     loading_gif(false);

    // Create a popup but leave it closed so we can update it and display it later.
    const popup = new atlas.Popup({
        position: [0, 0],
        pixelOffset: [0, -10]
    });

    // Show pop up on hover: informatie over aantal ritten bij routes naar bouwplan weergeven

    // Remove existing event listeners
    map.events.remove('mousemove', wegennetwerk_routes_buffer_layer);

    map.events.add('mousemove', wegennetwerk_routes_buffer_layer, function (e) {
        symbolHoveredRoutes(e, traffic_by_roadID);
    });
    
}
        
function handleHubs(hub_id) {
    const hub_layer = map.layers.getLayerById('hubs');

    hub_layer.setOptions({
        iconOptions: {
            opacity: ['match', ['get', 'hub_id'], ...[hub_id,1], 0.5],
        },
        visible: true
    });
   
     // Sluit laadbalk
     loading_gif(false);
    
}

function handleOverslagpunten(overslagpunten) {
    const overslagpunten_layer = map.layers.getLayerById('overslagpunten');

    // Functie om strings naar integers om te zetten
    function zetStringsOmNaarIntegers(lijst) {
        return lijst.map(function (stringWaarde) {
        return parseInt(stringWaarde, 10);
        });
    }
    
    // Roep de functie aan met de overslagpunten
    let overslagpuntenIntegers = zetStringsOmNaarIntegers(overslagpunten);

    console.log(overslagpuntenIntegers)

    overslagpunten_layer.setOptions({
        iconOptions: {
            opacity: ['case', ['in', ['get', 'oversteek_edge_id'], ['literal', overslagpuntenIntegers]], 1, 0],
        },
        visible: true
    });
   
     // Sluit laadbalk
     loading_gif(false);
    
}

/////////////////////////////////////////////////////////
// Functions for layer interactions
/////////////////////////////////////////////////////////

function symbolHoveredRoutes(e, traffic_by_roadID) {
    const shapes = e.shapes;

    if (shapes && shapes.length > 0) {
        const weg_id = shapes[0].properties.weg_id;
        //const [rides, weight, trucks, vans] = traffic_by_roadID[weg_id].map(value => Math.round(parseInt(value * plangebiedInfo.housing_units)));
        const roadData = traffic_by_roadID[weg_id];

        let rides, weight, trucks, vans;
        if (roadData) {
            [rides, weight, trucks, vans] = roadData.map(value => Math.round(parseInt(value * plangebiedInfo.housing_units)));
            // Rest of your code using rides, weight, trucks, vans
        } else {
            // Handle the case when roadData is undefined
            //console.error(`Road data for weg_id ${weg_id} is not available in traffic_by_roadID.`);
        }

        const content = `
            <div style="padding: 10px; color: white; max-width: 500px;">
                <b>Plangebied ${plangebiedInfo['title']}</b><br/><br/>
                <b>Verwachte bouwlogistiek langs deze weg</b><br/>
                Aantal vrachtwagens: ${trucks}<br/>
                Aantal bestelbussen: ${vans}<br/>
                Totale gewicht: ${weight} kt
            </div>
        `;

        popup.setOptions({
            content,
            position: e.position,
            pixelOffset: [0, -10],
            fillColor: 'rgba(0,0,0,0.5)',
            closeButton: true
        });

        if (scenario === 'standaard'){
            popup.open(map);
            document.getElementById('mapContainer').addEventListener('mouseleave', function () {
                popup.close();
            });

        }
        //tijdelijke oplossing tot data juist aangevuld is
        else{
            popup.close(map)
        }

        
        
    }
}


function symbolHoveredWegwerkzaamheden(e) {
    // Toon informatie bij symbool/wegvak voor wegwerkzaamheden
    const shapes = e.shapes;

    if (shapes && shapes.length > 0) {
        console.log(shapes[0])
        console.log(shapes[0].properties)
        const properties = shapes[0].properties;
        const {
            timeperiod_enddate: endDate,
            timeperiod_startdate: startDate,
            roadname,
            city,
            melvin_id,
        } = properties;

        const melvin_link = `https://melvin.ndw.nu/public/situation/${melvin_id}`;

        const buttonStyle = `
        flex: 1;
        background-color: rgba(0, 0, 0, 0);
        color: white;
        border: 1px solid white;
        border-radius: 5px;
        font-size: 14px;
        cursor: pointer;
        margin-left: 10px;
        `;

        const content = `
            <div style="padding: 10px; color: white; max-width: 150px; text-align: center;">
                <b>Geplande wegwerkzaamheden</b><br/><br/>
                Locatie: ${roadname}, ${city}<br/>
                Start datum: ${startDate.substring(0, 10)}<br/>
                Eind datum: ${endDate.substring(0, 10)}<br/>
                <br/>
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <button style="${buttonStyle}" onclick="window.open('${melvin_link}', '_blank')">Meer informatie</button>
                    <button style="${buttonStyle}" onclick="popup.close()">Sluiten</button>
                </div>
            </div>
        `;

        popup.setOptions({
            content,
            position: e.position,
            pixelOffset: [0, -10],
            fillColor: 'rgba(0,0,0,0.5)',
            closeButton: false
        });

        popup.open(map);
    }
}


/////////////////////////////////////////
// Functions for data display scenario's
////////////////////////////////////////


function updateTabelBesparingen(routes, scenario) {
    // Check the scenario
    if (scenario === 'standaard') {
        // If the scenario is 'standaard', empty the table
        const dataCells = document.querySelectorAll('#data-scenario-1 #data-scenario-1-right > div, #data-scenario-2 #data-scenario-2-right > div');
        dataCells.forEach(function(cell) {
            cell.innerText = '';
        });

        // Additionally, you can update any other elements or perform specific actions for the 'standaard' scenario here.

        // Update tekst in linkermenu
        const el_ = document.getElementById('bouwlogistiek_uitstoot');
        el_.innerText = 'De maatschappelijke kosten zijn niet beschikbaar voor het standaard scenario.';
        el_.style.display = 'block';

        return; // Exit the function if the scenario is 'standaard'
    }

    // Continue with the rest of the function for other scenarios

    // CO2 uitstoot
    let CO2_kg;

    // Update waardes based on scenario
    let km_vrachtwagen, km_bestelbussen, km_kwetsbare_infra, kwetsbare_objecten, knelpunten_fiets;

    if (scenario === 'hubs') {
        // If the scenario is 'hubs', use routes.totaal_binnen
        CO2_kg = routes.totaal.avg_besparing_binnen;
        km_vrachtwagen = routes.totaal.km_vracht_winst;
        km_bestelbussen = routes.totaal.km_bestel_winst;
        km_kwetsbare_infra = 'X';
        kwetsbare_objecten = 'X';
        knelpunten_fiets = 'X';
    } else if (scenario === 'vaarwegen') {
        // If the scenario is 'vaarwegen', use routes.totaal
        CO2_kg = routes.totaal.avg_besparing;
        km_vrachtwagen = 'X';
        km_bestelbussen = 'X';
        km_kwetsbare_infra = 'X';
        kwetsbare_objecten = 'X';
        knelpunten_fiets = 'X';
    }

    // Lijst met maatschappelijke kosten
    const kosten = [
        `${km_vrachtwagen} minder km vrachtwagens ${scenario === 'vaarwegen' ? 'over totale route' : 'bebouwde kom'}`,
        `${km_bestelbussen} minder km bestelbussen ${scenario === 'vaarwegen' ? 'over totale route' : 'bebouwde kom'}`,
        `langs ${km_kwetsbare_infra} minder km kwetsbare infra`,
        `${CO2_kg} % CO2 uitstoot ${scenario === 'vaarwegen' ? 'over totale route' : 'bebouwde kom'}`,
        `langs ${kwetsbare_objecten} minder kwetsbare objecten`,
        `langs ${knelpunten_fiets} minder kruisingen met doorfietsroutes`
    ];

    // Haal alle datacellen op en update de tekst op basis van het geselecteerde bouwplan
    const dataCells = document.querySelectorAll('#data-scenario-1 #data-scenario-1-right > div, #data-scenario-2 #data-scenario-2-right > div');

    dataCells.forEach(function(cell, index) {
        cell.innerText = kosten[index] || ''; // Leeg laten als er geen gegevens beschikbaar zijn
    });

    // Update tekst in linkermenu
    const el_ = document.getElementById('bouwlogistiek_uitstoot');
    el_.innerText = 'De maatschappelijke kosten zijn berekend op basis van de verwachte volumes vrachtwagens en bestelbussen.';
    el_.style.display = 'block';
}

function updateTabelKosten(scenario, routes) {
    
    let CO2_ton;

    if (scenario === "hubs"){
        // CO2 uitstoot 
        const CO2_kg = routes.totaal.co2_totaal_binnen;
        CO2_ton = Math.round(CO2_kg / Math.pow(10, 3))

        // Update waardes in de tabel 'Maatschappelijke kosten' wanneer er geklikt wordt op een bouwplan op de kaart
        km_vrachtwagen = routes.totaal.aantal_km_vracht_binnen
        km_bestelbussen = routes.totaal.aantal_km_bestel_binnen
        km_kwetsbare_infra = 'X'
        kwetsbare_objecten = 'X'
        knelpunten_fiets = "X"
    } else if (scenario == "vaarwegen"){
        // CO2 uitstoot 
        const CO2_kg = routes.totaal.co2_totaal;
        CO2_ton = Math.round(CO2_kg / Math.pow(10, 3));

        // Update waardes in de tabel 'Maatschappelijke kosten' wanneer er geklikt wordt op een bouwplan op de kaart
        km_vrachtwagen = "X"
        km_bestelbussen = "X"
        km_kwetsbare_infra = 'X'
        kwetsbare_objecten = 'X'
        knelpunten_fiets = "X"
    } else {
        // CO2 uitstoot 
        const CO2_kg = routes.totaal.co2_totaal;
        CO2_ton = Math.round(CO2_kg / Math.pow(10, 3));

        // Update waardes in de tabel 'Maatschappelijke kosten' wanneer er geklikt wordt op een bouwplan op de kaart
        km_vrachtwagen = routes.totaal.aantal_km_vracht
        km_bestelbussen = routes.totaal.aantal_km_bestel
        km_kwetsbare_infra = 'X'
        kwetsbare_objecten = 'X'
        knelpunten_fiets = "X"
    }

    // Lijst met maatschappelijke kosten
    const kosten = [
        `${km_vrachtwagen} km vrachtwagens ${scenario === 'hubs' ? 'bebouwde kom' : 'over totale route'}`,
        `${km_bestelbussen} km bestelbussen ${scenario === 'hubs' ? 'bebouwde kom' : 'over totale route'}`,
        `langs ${km_kwetsbare_infra} km kwetsbare infra`,
        `${CO2_ton} ton CO2 uitstoot ${scenario === 'hubs' ? 'bebouwde kom' : 'over totale route'}`,
        `langs ${kwetsbare_objecten} kwetsbare objecten`,
        `langs ${knelpunten_fiets} kruisingen met doorfietsroutes`,
    ];
    
    // Haal alle datacellen op en update de tekst op basis van het geselecteerde bouwplan
    const dataCells = document.querySelectorAll('#data-scenario-1 #data-scenario-1-left > div, #data-scenario-2 #data-scenario-2-left > div');

    dataCells.forEach(function(cell, index) {
        cell.innerText = kosten[index] || ''; // Leeg laten als er geen gegevens beschikbaar zijn
    })

    // update tekst in linkermenu
    const el_ = document.getElementById('bouwlogistiek_uitstoot');
    el_.innerText = `De maatschappelijke kosten zijn berekend op basis van de verwachte volumes vrachtwagens en bestelbussen.`;
    el_.style.display = 'block';
}

function updateKaartlagenScenarios(selection) {

    if (Object.keys(plangebiedInfo).length === 0) {
        notification_popup(true);
        return;
    }

    //kaartlagen aan/uitzetten afhankelijk van scenario
    const scenarioMap = {
        'niks_doen': { scenario: 'standaard', layers: [] },
        'scenario_2_over_water': { scenario: 'vaarwegen', layers: ['vaarwegen', 'overslagpunten'] },
        'scenario_1_hubs': { scenario: 'hubs', layers: ['hubs'] },
    };

    const scenarioLayers = scenarioMap[selection];
    scenario = scenarioLayers.scenario

    // Toon geselecteerde overslagpunten voor scenario water
    // if (scenario === 'vaarwegen'){
    //     const overslagpunten_layer = map.layers.getLayerById('overslagpunten');

    //     overslagpunten.setOptions({
    //         iconOptions: {
    //             image: 'ship',
    //             allowOverlap: false,
    //             anchor: 'center',
    //             size: 0.05, 
    //             opacity: ['case', ['in', ['get', 'vwk_id'], ['literal', ['4611_1']]], 1, 0.1]
    //         },
    //     });

    // }

    if (scenarioLayers) {

        // Toon scenario afankelijke routes
        loadRoutes(scenario);

        // Verberg alle kaartlagen
        ['vaarwegen', 'overslagpunten','hubs', 'municipalities_numbers'].forEach(layer => hide_layer(map.layers.getLayerById(layer)));

        // Toon specifieke kaartlagen
        scenarioLayers.layers.forEach(layer => show_layer(map.layers.getLayerById(layer)));

        // Wijzig checkbox kaartlagen
        if (scenarioLayers.layers[0]){
            document.getElementById(`${scenarioLayers.layers[0]}_button`).checked = scenarioLayers.layers.includes('vaarwegen');
        }
        
    }
}
