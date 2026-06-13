/**
 * Created by kaufmann on 12.06.15.
 */
var svg;
var svgWidth,svgHeight;

var scaleFactor;

var tableWidth;
var tableWidthBoundaryOffset;
var tableLength;

var defaultOffsetX;
var defaultOffsetY;

var offsetX;
var offsetY;

/**
 * y/((x*164)+2*(x*50))=z
 *
 * x = y / (246*z)
 *
 * x = scaleFactor
 * y = windowWidth (containerWidth)
 * z = numberOfTables
 *
 * x = y / (246*z)
 *
 */
function setVariables(containerWidth,numberOfTables){
    scaleFactor = containerWidth / (246*numberOfTables);
    if(scaleFactor>1.2){
        scaleFactor=1.2
    }
    tableWidth = scaleFactor * 164;
    tableWidthBoundaryOffset = 15*scaleFactor;
    tableLength = scaleFactor * 274;
    defaultOffsetX = 50*scaleFactor;
    defaultOffsetY = 50;
    svgWidth = ((uebung.length) * (tableWidth + defaultOffsetX)) + defaultOffsetX;
    svgHeight = tableLength + (2*defaultOffsetY);
}

function startVisualization(uebung){
    var containerWidth = $("#bodyContainer").width();
    if(containerWidth <= 0){
        containerWidth = 768;
    }
    setVariables(containerWidth,uebung.length);

    d3.select("svg").remove();
    svg = d3.select("#svgContainer").append("svg").attr("id","svg").attr("width", svgWidth).attr("height", svgHeight).style("display","block").style("margin","auto");
    defineSimpleArrow();
    for (var i = 0; i < uebung.length; i++){
        createTable(i,uebung[i]);
        createTraining(uebung[i]);
    }

}
