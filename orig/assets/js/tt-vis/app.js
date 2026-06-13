/**
 * Created by marcel on 29.04.15.
 */

/**
 * Einstiegspunkt!
 */


$( document ).ready(function() {
    initApp();
});



var defaultUebung;
var uebung;

function initApp() {
    createDefaultUebung();
    writeDefaultUebungInTable();
    addChangeListenerToTable();
    createNewUebung();
}

/**
 * (kurzer) TECHNIK aus POSITION in (kurze) POSITION
 * (a-b) (kurzer) TECHNIK aus POSITION in (kurze) POSITION
 * (a-b) (kurzer) TECHNIK aus POSITION in (kurze) POSITION oder (kurze) Position oder (kurze) Position
 * (a-b) (kurzer) TECHNIK aus POSITION in (kurze) POSITION oder/bis (kurze) Position oder/bis (kurze) Position
 *
 * 2-3 mal VHT aus Mitte in VH oder kurze Mitte bis RH
 */

function createNewUebung(){
    uebung = getUebungFromTable();
    startVisualization(uebung);
}

function getUebungFromTable(){
    var localUebung = new Array();
    for(var i = 1 ; i <= 5; i++){
        idA = "#a"+i;
        idB = "#b"+i;
        var teilUebung = new Array();
        if(checkTextIsOk(idA)){
            teilUebung.push($(idA).text());
        }else{
            break;
        }
        if(checkTextIsOk(idB)){
            teilUebung.push($(idB).text());
        }else{
            teilUebung.push("");
        }
        localUebung.push(teilUebung);
    }
    return localUebung;
}

function writeDefaultUebungInTable(){
    for(var i = 1 ; i <= 3; i++){
        idA = "#a"+i;
        idB = "#b"+i;
        $(idA).text(defaultUebung[i-1][0]);
        $(idB).text(defaultUebung[i-1][1]);
    }
}

function createDefaultUebung(){
    defaultUebung = new Array();

    var teilUebung = new Array();
    teilUebung.push("VHT aus VH in Mitte");
    teilUebung.push("VHB aus Mitte in RH");
    defaultUebung.push(teilUebung);

    var teilUebung = new Array();
    teilUebung.push("RHT aus RH in VH");
    teilUebung.push("VHT aus VH in VH");
    defaultUebung.push(teilUebung);

    var teilUebung = new Array();
    teilUebung.push("VHT aus VH in VH");
    teilUebung.push("Frei");
    defaultUebung.push(teilUebung);
}


