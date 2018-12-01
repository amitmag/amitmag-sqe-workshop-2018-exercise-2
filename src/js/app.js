import $ from 'jquery';
import {applySymbolicSubstitution} from './symbolic-substitution';

$(document).ready(function () {
    $('#moreArgs').click(() => {
        $('#argsTable').append('<tr class="arg"><td><label>name: <input id="name" type="text"></label></td><td><label>value: <input id="value" type="text"></label></td></tr>');
    });

    $('#codeSubmissionButton').click(() => {
        let symbolTable = {};
        $('tr.arg').each(function() {
            let argName = $(this).find('#name').val();
            let argValue = $(this).find('#value').val();
            symbolTable[argName] = [];
            symbolTable[argName].push({'line':0, 'conditions': [], 'value': argValue});
        });
        let codeToParse = $('#codePlaceholder').val();
        let codeLinesAndColors = applySymbolicSubstitution(codeToParse, symbolTable);
        createTable(codeLinesAndColors[0], codeLinesAndColors[1]);
    });
});

function createTable(codeLines, linesColors){ 
    let codeString = '';
    for(let line in codeLines){
        codeString += createRowString(codeLines[line], line, linesColors);
    } 
    $('#transformedCode').html(codeString); 

}

function createRowString(lineElements, lineNum, linesColors){
    let rowString = '<pre';
    rowString += linesColors[lineNum] ? ' class=' + linesColors[lineNum] + '>' : '>';
    let line = '';
    for(let column in lineElements){
        while(line.length < column)
            line += ' ';
        line += lineElements[column];
    }
    rowString += line + '</pre>';
    return rowString;
}












