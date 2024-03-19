function close_sidepanel(){
    var sidepanel = document.getElementById("sidepanel");
    var close_sidepanel = document.getElementById("close-sidepanel")
    // var map_controls_3D = document.getElementById("map_controls_3D")    

    if (sidepanel.style.display == "block"){
        sidepanel.style.display = 'none'
        close_sidepanel.style.marginLeft = '-2px'
        // map_controls_3D.style.left = '4px'
    }else{
        sidepanel.style.display = "block"
        close_sidepanel.style.marginLeft = 'clamp(190px, 20%, 300px)'
        // map_controls_3D.style.left = 'clamp(190px, 20%, 300px)'
    }
}

function activate_legend(){
    // When the layer is initialized. The legend side panel is shown. 
    document.getElementById('legenda_sidepanel').style.display = "block"
}

// function legend_content(layer) {
//     // shows the legend of the layer only when it is shown on the map
//     layer_status = document.getElementById(layer).style.display
//     if (layer_status == "block"){
//         document.getElementById(layer).style.display = "none"
//     }else{
//         document.getElementById(layer).style.display = "block"
//     }
// }

function show_legenda(){

    // Shows the legend sidepanel
    if (document.getElementById("legenda_sidepanel").style.display == "none"){
        // document.getElementById('show_legenda').style.fontWeight = "bold"
        document.getElementById("legenda_sidepanel").style.display = "block"

        // adjust the position of the neighbourhoud information panel and the tomtom panel
        if (document.getElementById("graphs_sidepanel").style.display == "block" || document.getElementById("show_pand_info_sidepanel").style.display == "block"){
            document.getElementById("graphs_sidepanel").style.marginRight = "310px"
            document.getElementById("show_pand_info_sidepanel").style.marginRight = "310px"
            document.getElementById("tomtom_sidepanel").style.marginRight = "620px"
        }
        else {
            document.getElementById("tomtom_sidepanel").style.marginRight = "310px"
        }
    }else{
        // Close the legend sidepanel
        document.getElementById("legenda_sidepanel").style.display = "none"
        // document.getElementById('show_legenda').style.fontWeight = ""

        // adjust the position of the neighbourhoud information panel and the tomtom panel
        if (document.getElementById("graphs_sidepanel").style.display == "block" || document.getElementById("show_pand_info_sidepanel").style.display == "block"){
            document.getElementById("graphs_sidepanel").style.marginRight = "5px"
            document.getElementById("show_pand_info_sidepanel").style.marginRight = "310px"
            document.getElementById("tomtom_sidepanel").style.marginRight = "310px"
        }
        else {
            document.getElementById("tomtom_sidepanel").style.marginRight = "5px"
        }
    }
}

function hide_legenda(){
    // close the legend sidepanel
    show_legenda()
    // document.getElementById('show_legenda').style.fontWeight = ""
}

////////////////////////////////////
/// map control panel background ///

function hide_control_background_panel_and_disclaimer()
{
    document.getElementById('map_controls_background_panel').style.display = "none";
    document.getElementById('map_controls_maptype_button').style.display = "none";  
    document.getElementById('disclaimer').style.display = "none";
    document.getElementById('disclaimer').style.display = "none";  
}

function show_control_background_panel_and_disclaimer()
{
    document.getElementById('map_controls_background_panel').style.display = "inline";
    document.getElementById('map_controls_maptype_button').style.display = "inline";  
    document.getElementById('disclaimer').style.display = "inline";
    document.getElementById('disclaimer').style.display = "inline";  
}