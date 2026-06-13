/**
 * Created by kaufmann on 12.06.15.
 */

var spielerA,spielerB;
var spielerAzuB,spielerBzuA;
var uebungSpielerA,uebungSpielerB;

var uebungSpielerASplit, uebungSpielerBSplit;
var technikSpielerA,technikSpielerB;

function processUebung(uebung){
    uebungSpielerA = uebung[0];
    uebungSpielerB = uebung[1];
    processUebungSpielerA(uebungSpielerA);
    processUebungSpielerB(uebungSpielerB);
}

function processUebungSpielerA(uebungSpielerA){
    uebungSpielerASplit = uebungSpielerA.split(" ");
    technikSpielerA = getTechnikSpielerA(uebungSpielerASplit);
    //VON
    if(uebungSpielerASplit[2] == "VH"){
        spielerA = aVorhandStart;
    }else if(uebungSpielerASplit[2] == "Mitte"){
        spielerA = aMidStart;
    }else if(uebungSpielerASplit[2] == "RH"){
        spielerA = aBackhandStart;
    }
    //NACH
    if(uebungSpielerASplit[4] == "VH"){
        spielerAzuB = bVorhandEnd;
    }else if(uebungSpielerASplit[4] == "Mitte"){
        spielerAzuB = bMidEnd;
    }if(uebungSpielerASplit[4] == "RH"){
        spielerAzuB = bBackhandEnd;
    }
}

function processUebungSpielerB(uebungSpielerB){
    if(uebungSpielerB == "Frei"){
        technikSpielerB = "Frei";
    }else {
        uebungSpielerBSplit = uebungSpielerB.split(" ");
        technikSpielerB = uebungSpielerBSplit[0];
        //VON
        if (uebungSpielerBSplit[2] == "VH") {
            spielerB = bVorhandStart;
        } else if (uebungSpielerBSplit[2] == "Mitte") {
            spielerB = bMidStart;
        } else if (uebungSpielerBSplit[2] == "RH") {
            spielerB = bBackhandStart;
        }
        //NACH
        if (uebungSpielerBSplit[4] == "VH") {
            spielerBzuA = aVorhandEnd;
        } else if (uebungSpielerBSplit[4] == "Mitte") {
            spielerBzuA = aMidEnd;
        }
        if (uebungSpielerBSplit[4] == "RH") {
            spielerBzuA = aBackhandEnd;
        }
    }
}

function getTechnikSpielerA(uebungSpielerASplit){
    return uebungSpielerASplit[0];
}