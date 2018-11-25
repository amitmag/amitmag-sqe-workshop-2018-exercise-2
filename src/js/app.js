import $ from 'jquery';
import {parseToItems} from './code-analyzer';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let items = parseToItems(codeToParse);
        createTable(items);
    });
});

function createTable(items){ 
    initialTable();       
    items.forEach(item => {
        let row = '<tr>' +
                '<td>' + item.line + '</td>' +
                '<td>' + item.type + '</td>' +
                '<td>' + item.name + '</td>' +
                '<td>' + item.condition + '</td>' +
                '<td>' + item.value + '</td>' +
                '</tr>';
        $('#itemsTable').append(row);           
    });   
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












