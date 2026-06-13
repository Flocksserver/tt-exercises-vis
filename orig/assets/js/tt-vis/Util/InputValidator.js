/**
 * Created by kaufmann on 18.06.15.
 */
function addChangeListenerToTable(){
    var idA,idB;
        for(var i = 1 ; i <= 5; i++){
            idA = "#a"+i;
            idB = "#b"+i;

            $(idA).on('input', function() {
                checkInput(this);
            });
            $(idB).on('input', function() {
                checkInput(this);
            });
        }
}

function checkInput(me){
    var checkOK = checkTextIsOkVal(me);
    if(checkOK){
        $(me).removeClass("inputError");
    }else{
        $(me).addClass("inputError");
    }
}

/**
 * To Valdidate the TDs is empty string ok
 * @param me
 * @returns {boolean}
 */
function checkTextIsOkVal(me){
    var standardUebung = /^\w* aus (RH|VH|Mitte) in (RH|VH|Mitte)$/g;
    var checkingString =  $(me).text();
    if(checkingString.match(standardUebung)|| checkingString == "Frei" || checkingString == ""){
        return true;
    }else{
        return false;
    }
}

/**
 * To create the task the empty string is not ok
 * @param me
 * @returns {boolean}
 */

function checkTextIsOk(me){
    var standardUebung = /^\w* aus (RH|VH|Mitte) in (RH|VH|Mitte)$/g;
    var checkingString =  $(me).text();
    if(checkingString.match(standardUebung)|| checkingString == "Frei"){
        return true;
    }else{
        return false;
    }
}