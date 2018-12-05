import $ from 'jquery';
import {applySymbolicSubstitution} from './symbolic-substitution';

$(document).ready(function () {
    $('#moreArgs').click(() => {
        $('#argsTable').append('<tr class="arg"><td><label>name: <input id="name" type="text"></label></td><td><label>value: <input id="value" type="text"></label></td></tr>');
    });

    $('#codeSubmissionButton').click(() => {
        codeSubmissionClicked();
    });
});

function codeSubmissionClicked(){
    let symbolTable = {};
    $('tr.arg').each(function() {
        let argName = $(this).find('#name').val();
        let argValue = $(this).find('#value').val();
        if(argValue.charAt(0) == '['){
            let array = argValue.substring(1, argValue.length - 1).replace(/ /g,'').split(',');
            argValue = array;
        }
        symbolTable[argName] = [];
        symbolTable[argName].push({'line': 0, 'conditions': [], 'value': argValue});
    });
    let codeToParse = $('#codePlaceholder').val();
    let functionString = applySymbolicSubstitution(codeToParse, symbolTable);
    $('#transformedCode').html(functionString);
}













