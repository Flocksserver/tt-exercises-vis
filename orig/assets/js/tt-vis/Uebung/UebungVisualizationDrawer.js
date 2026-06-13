/**
 * Created by kaufmann on 12.06.15.
 */

var arrowOffsetTable = 15;

var arrowWidth = 3;

var labelTextSize;
var labelPositionSpielerA,labelPositionSpielerB;


function drawUebung(){
    labelTextSize = 20 * scaleFactor;
    labelPositionSpielerA = {x: (spielerA.x - (20 * scaleFactor)), y: (spielerA.y + (35 * scaleFactor))};
    labelPositionSpielerB = {x: (spielerB.x - (20 * scaleFactor)), y: (spielerB.y - (23 * scaleFactor))};
    drawUebungSpielerA();
    drawUebungSpielerB();
    drawTechnikSpielerA();
    drawTechnikSpielerB();
}

function drawUebungSpielerA(){
    if(uebungSpielerA != undefined && uebungSpielerA != ""){
        svg.append("line")
            .attr("x1", spielerA.x)
            .attr("y1", spielerA.y)
            .attr("x2", spielerAzuB.x)
            .attr("y2", spielerAzuB.y)
            .attr("marker-end", "url(#myMarker)")
            .attr("stroke-width", (arrowWidth*scaleFactor))
            .attr("stroke", "black");
    }
}

function drawUebungSpielerB(){
    if(uebungSpielerB != undefined && uebungSpielerB != ""){
        svg.append("line")
            .attr("x1", spielerB.x)
            .attr("y1", spielerB.y)
            .attr("x2", spielerBzuA.x)
            .attr("y2", spielerBzuA.y)
            .attr("marker-end", "url(#myMarker)")
            .attr("stroke-width", (arrowWidth*scaleFactor))
            .attr("stroke", "black");
    }
}

function drawTechnikSpielerA(){
    if(technikSpielerA != undefined){
        svg.append("text")
            .attr("x", labelPositionSpielerA.x)
            .attr("y", labelPositionSpielerA.y)
            .attr("font-family", "sans-serif")
            .attr("font-weight","bold")
            .attr("font-size", labelTextSize)
            .attr("fill", "black")
            .text(technikSpielerA);
    }
}

function drawTechnikSpielerB(){
    if(technikSpielerB=="Frei"){
        labelPositionSpielerB = {x: (spielerAzuB.x - (20 * scaleFactor)), y: (spielerAzuB.y - (23 * scaleFactor))};
    }
    if(technikSpielerB != undefined){
        svg.append("text")
            .attr("x", labelPositionSpielerB.x)
            .attr("y", labelPositionSpielerB.y)
            .attr("font-family", "sans-serif")
            .attr("font-weight","bold")
            .attr("font-size", labelTextSize)
            .attr("fill", "black")
            .text(technikSpielerB);
    }
}

function defineSimpleArrow(){
    var markerHeight = 4;
    var markerWidth = 4;
    svg.append("defs")
        .append("marker")
        .attr("id","myMarker")
        .attr('markerHeight', markerHeight)
        .attr('markerWidth', markerWidth)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX",0)
        .attr("refY",0)
        .attr('orient', 'auto')
        .append("path")
        .attr("d","M0,-5L10,0L0,5")
        .style("fill", "fill:#000000");
}