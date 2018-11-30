import $ from 'jquery';
import {parseToItems} from './code-analyzer';
import {applySymbolicSubstitution, getClosestValue} from './symbolic-substitution';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let symbolTable = {'x': {0 : 1} , 'y': {0 : 2}, 'z': {0 : 3}};
        let codeLinesAndColors = applySymbolicSubstitution(codeToParse, symbolTable);
        createTable(codeLinesAndColors[0], codeLinesAndColors[1]);
    });
});

function createTable(codeLines, linesColors){ 
    for(let line in codeLines){
        let rowString = createRowString(codeLines[line], line, linesColors)
        $('#itemsTable').append(rowString); 
    } 
}

function createRowString(lineElements, lineNum, linesColors){
    let rowString = '<tr><td';
    rowString += linesColors[lineNum] ? ' class=' + linesColors[lineNum] + '>' : '>';
    let line = ''
    for(let column in lineElements){
        while(line.length < column)
            line += ' ';
        line += lineElements[column];
    }
    rowString += line + '<td></tr>'
    return rowString;
}

function initialTable(){
    $('#itemsTable').empty();
    let row = '<tr>' +
    '<th> Line </th>' +
    '<th> Type </th>' +
    '<th> Name </th>' +
    '<th> Condition </th>' +
    '<th> Value </th>' +
    '</tr>';
    $('#itemsTable').append(row); 
}












