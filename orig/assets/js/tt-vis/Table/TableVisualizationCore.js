/**
 * Created by kaufmann on 12.06.15.
 */

var startX;
var startY;

function createTable(tableNumber){
    offsetX = (tableNumber * (tableWidth + defaultOffsetX)) + defaultOffsetX;
    offsetY = defaultOffsetY;
    startX = 0 + offsetX;
    startY = 0 + offsetY;

    svg.append("rect")
        .attr("x", startX)
        .attr("y", startY)
        .attr("width", tableWidth)
        .attr("height", tableLength)
        .attr("fill","black");

    svg.append("rect")
        .attr("x", startX + (1*scaleFactor))
        .attr("y", startY + (1*scaleFactor))
        .attr("width", tableWidth - (2*scaleFactor))
        .attr("height", tableLength - (2*scaleFactor))
        .attr("fill","white");

    svg.append("rect")
        .attr("x", startX + (3.5*scaleFactor))
        .attr("y", startY + (3.5*scaleFactor))
        .attr("width", tableWidth - (7*scaleFactor))
        .attr("height", tableLength - (7*scaleFactor))
        .attr("fill","green");

    svg.append("line")
        .attr("x1", startX + (tableWidth / 2) )
        .attr("y1", startY + (3.4*scaleFactor))
        .attr("x2", startX + (tableWidth / 2) )
        .attr("y2", startY + tableLength - (3.4*scaleFactor))
        .attr("stroke-width", (2*scaleFactor))
        .attr("stroke", "white");

    svg.append("line")
        .attr("x1", startX - tableWidthBoundaryOffset)
        .attr("y1", startY + (tableLength / 2))
        .attr("x2", startX + tableWidthBoundaryOffset + tableWidth )
        .attr("y2", startY + (tableLength / 2))
        .attr("stroke-width", (3.5*scaleFactor))
        .attr("stroke", "grey");
}
