/**
 * Created by kaufmann on 16.06.15.
 */

var aVorhandStart,aBackhandStart,aMidStart,bVorhandEnd,bBackhandEnd,bMidEnd;
var aVorhandShortStart, aBackhandShortStart, aMidShortStart, bVorhandShortEnd,bBackhandShortEnd,bMidShortEnd;

var bVorhandStart,bBackhandStart,bMidStart,aVorhandEnd,aBackhandEnd,aMidEnd;
var bVorhandShortStart,bBackhandShortStart,bMidShortStart,aVorhandShortEnd,aBackhandShortEnd,aMidShortEnd;

function createPositions(){
    createPositionAzuB();
    createPositionBzuA();
}

function createPositionAzuB(){
    /**
     * Positionen Vorhand Rueckhand Mitte für Spieler A zu B - lang
     * @type {{x: number, y: number}}
     */

    aVorhandStart = {x: (startX + tableWidth - (arrowOffsetTable*scaleFactor)) , y: (startY + tableLength - (arrowOffsetTable*scaleFactor))};
    aBackhandStart = {x: (startX + (3.5*scaleFactor) + (arrowOffsetTable*scaleFactor)) , y: (startY + tableLength - (arrowOffsetTable*scaleFactor))};
    aMidStart = {x: startX + (tableWidth / 2), y: (startY + tableLength - (arrowOffsetTable*scaleFactor))};
    bVorhandEnd = {x: (startX + (3.5*scaleFactor) + (arrowOffsetTable*scaleFactor)), y: (startY + (3.5*scaleFactor) + (arrowOffsetTable*scaleFactor))};
    bBackhandEnd = {x: (startX + tableWidth - (arrowOffsetTable*scaleFactor)), y: (startY + (3.5*scaleFactor) + (arrowOffsetTable*scaleFactor))};
    bMidEnd =  {x: startX + (tableWidth / 2), y: (startY + (3.5*scaleFactor) + (arrowOffsetTable*scaleFactor) )};
    /**
     * Positionen Vorhand Rueckhand Mitte für Spieler A zu B - kurz
     * @type {{x: number, y: number}}
     */
    //TODO
    aVorhandShortStart = {x: 0, y: 0};
    aBackhandShortStart = {x: 0, y: 0};
    aMidShortStart = {x: 0, y: 0};
    bVorhandShortEnd = {x: 0, y: 0};
    bBackhandShortEnd = {x: 0, y: 0};
    bMidShortEnd = {x: 0, y: 0};
}

function createPositionBzuA(){
    /**
     * Positionen Vorhand Rueckhand Mitte für Spieler B zu A - lang
     * @type {{x: number, y: number}}
     */
    bVorhandStart = {x: (startX + (3.5*scaleFactor) + (arrowOffsetTable*scaleFactor)), y: (startY + (3.5*scaleFactor) + (arrowOffsetTable*scaleFactor))};
    bBackhandStart = {x: (startX + tableWidth - (arrowOffsetTable*scaleFactor)), y: (startY + (3.5*scaleFactor) + (arrowOffsetTable*scaleFactor))};
    bMidStart =  {x: startX + (tableWidth / 2), y: (startY + (3.5*scaleFactor) + (arrowOffsetTable*scaleFactor) )};
    aVorhandEnd = {x: (startX + tableWidth - (arrowOffsetTable*scaleFactor)) , y: (startY + tableLength - (arrowOffsetTable*scaleFactor))};
    aBackhandEnd = {x: (startX + (3.5*scaleFactor) + (arrowOffsetTable*scaleFactor)) , y: (startY + tableLength - (arrowOffsetTable*scaleFactor))};
    aMidEnd = {x: startX + (tableWidth / 2), y: (startY + tableLength - (arrowOffsetTable*scaleFactor))};
    /**
     * Positionen Vorhand Rueckhand Mitte für Spieler B zu A - kurz
     * @type {{x: number, y: number}}
     */
    //TODO
    bVorhandShortStart = {x: 0, y: 0};
    bBackhandShortStart = {x: 0, y: 0};
    bMidShortStart = {x: 0, y: 0};
    aVorhandShortEnd = {x: 0, y: 0};
    aBackhandShortEnd = {x: 0, y: 0};
    aMidShortEnd = {x: 0, y: 0};
}