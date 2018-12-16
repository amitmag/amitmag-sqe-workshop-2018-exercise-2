import * as esprima from 'esprima';

let codeLines = {};
let elseIfConditions = {};
let currentLine = 0;

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse, {loc: true});
};

export function applySymbolicSubstitution(codeToParse, symbolTable){
    codeLines = {}, elseIfConditions = {}, currentLine = 0;
    let parsedCode = parseCode(codeToParse);
    return replaceLocalVariables(parsedCode, symbolTable);
}

export function replaceLocalVariables(parsedCode, symbolTable){
    let inputVector = new Set([]);
    let functionItem;
    parsedCode.body.forEach(element => {
        if(element.type === 'FunctionDeclaration')
            functionItem = element;
        else
            createItemAccordingToType(element, inputVector, symbolTable, false, []);
    });
    if(functionItem)
        createItemAccordingToType(functionItem, inputVector, symbolTable, false, []);
    return createFunctionString(symbolTable, inputVector);
}



let typeToHandlerMapping = {
    'FunctionDeclaration': functionDeclarationHandler,
    'BlockStatement': blockStatementHandler,
    'VariableDeclaration': variableDeclarationHandler,
    'ExpressionStatement': expressionStatementHandler,
    'WhileStatement': whileStatementHandler,
    'IfStatement': ifStatementHandler,
    'ReturnStatement':returnStatementHandler,
    'BinaryExpression': binaryExpressionHandler,
    'MemberExpression': memberExpressionHandler,
    'UnaryExpression': unaryExpressionHandler,
    'AssignmentExpression': assignmentExpressionHandler,
    'UpdateExpression': updateExpressionHandler,
    'Identifier':identifierHandler,
    'Literal': literalHandler, 
    'ArrayExpression': ArrayExpressionHandler
};

function createItemAccordingToType(element, inputVector, symbolTable, insideFunction, conditions){
    return typeToHandlerMapping[element.type](element, inputVector, symbolTable, insideFunction, conditions);
}

function functionDeclarationHandler(element,inputVector, symbolTable, insideFunction, conditions){
    currentLine = element.loc.start.line;
    let stringToReturn = 'function ' + element.id.name + '(';
    let index = 1;
    element.params.forEach(variable => {
        stringToReturn += index++ < element.params.length ? variable.name + ',' : variable.name + '';
        inputVector.add(variable.name);
    });
    stringToReturn +=')';
    addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    createItemAccordingToType(element.body, inputVector, symbolTable, true, conditions);
}

function variableDeclarationHandler(element, inputVector, symbolTable, insideFunction, conditions){
    currentLine = element.loc.start.line;
    let declarationIndex = 1, stringToReturn = '';
    element.declarations.forEach(declaration => {
        let value = null;
        if(declaration.init != null)
            value = createItemAccordingToType(declaration.init, inputVector, symbolTable, insideFunction, conditions);
        let name = declaration.id.name;
        checkIfIsInSymbolTable(symbolTable, name);
        symbolTable[name].push({'line':element.loc.start.line, 'conditions': [...conditions], 'value': value});
        if(!insideFunction){
            stringToReturn += createVariableDeclarationString(inputVector, name, value, declarationIndex, element);
            declarationIndex++;
        }
    });
    if(!insideFunction)
        addToDictionary(element.loc.start.line, element.loc.start.column, element.kind + ' ' + stringToReturn);
}

function createVariableDeclarationString(inputVector, name, value, declarationIndex, element){
    let stringToReturn = ''
    inputVector.add(name);
    if(value == null)
        stringToReturn += name;
    else
        stringToReturn += !Array.isArray(value) ? name + ' = ' + value : name + ' = [' + value + ']';
    stringToReturn += declarationIndex < element.declarations.length ? ', ' : ';';
    return stringToReturn;
}

function checkIfIsInSymbolTable(symbolTable, name){
    if(!(name in symbolTable))
        symbolTable[name] = [];
}

function expressionStatementHandler(element, inputVector, symbolTable, insideFunction, conditions){
    return createItemAccordingToType(element.expression, inputVector, symbolTable, insideFunction, conditions);
}

function assignmentExpressionHandler(element,inputVector, symbolTable, insideFunction, conditions){
    currentLine = element.loc.start.line;
    let name = element.left.name;
    let value = createItemAccordingToType(element.right, inputVector, symbolTable, insideFunction, conditions);
    symbolTable[name].push({'line':element.loc.start.line, 'conditions': [...conditions], 'value': value});
    if(inputVector.has(name)){
        let stringToReturn = name + ' = ' + value + ';';
        addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    }
}

function memberExpressionHandler(element, inputVector, symbolTable, insideFunction, conditions){
    let variable = element.object.name;
    let index = createItemAccordingToType(element.property, inputVector, symbolTable, insideFunction, conditions);
    if(!inputVector.has(variable)){
        return getClosestValue(currentLine, symbolTable[element.object.name], conditions)[index];
    }
    return variable + '[' + index + ']';
}

function binaryExpressionHandler(element, inputVector, symbolTable, insideFunction, conditions){
    let operator = element.operator;
    let right = createItemAccordingToType(element.right, inputVector, symbolTable, insideFunction, conditions);
    let left = createItemAccordingToType(element.left, inputVector, symbolTable, insideFunction, conditions);
    return left + ' ' + operator + ' ' + right;
}

function whileStatementHandler(element, inputVector, symbolTable, insideFunction, conditions){
    currentLine = element.loc.start.line;
    let stringToReturn = 'while(';
    let condition = createItemAccordingToType(element.test, inputVector, symbolTable, insideFunction, conditions);
    stringToReturn += condition + ')';
    conditions.push(currentLine);
    addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    createItemAccordingToType(element.body, inputVector, symbolTable, insideFunction, conditions);
    conditions.pop();
}

function unaryExpressionHandler(element, inputVector, symbolTable, insideFunction, conditions){
    let operator = element.operator;
    let argument = createItemAccordingToType(element.argument, inputVector, symbolTable, insideFunction, conditions);
    return operator + argument;
}

function ifStatementHandler(element, inputVector, symbolTable, insideFunction, conditions, type = 'if'){
    currentLine = element.loc.start.line;
    let condition = createItemAccordingToType(element.test, inputVector, symbolTable, insideFunction, conditions);
    let stringToReturn = type + '(' + condition + ')';
    conditions.push(currentLine);
    addToIfElseConditions(type, element.loc.start.line);
    if(type === 'if')
        addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    else
        addToDictionary(element.loc.start.line, element.loc.start.column - 4, stringToReturn);
    createItemAccordingToType(element.consequent, inputVector, symbolTable, insideFunction, conditions);
    conditions.pop();
    if(element.alternate != undefined)
        alternareHandler(element, inputVector, symbolTable, insideFunction, type, conditions);
    return stringToReturn;
}

function alternareHandler(element, inputVector, symbolTable, insideFunction, type, conditions){
    if(element.alternate.type === 'IfStatement')
        ifStatementHandler(element.alternate, inputVector, symbolTable, insideFunction, conditions, 'else if');
    else 
        elseHandler(element, type, inputVector, symbolTable, insideFunction, conditions);
}

function elseHandler(element, type, inputVector, symbolTable, insideFunction, conditions){
    currentLine = element.consequent.loc.end.line;
    conditions.push(currentLine);
    addToIfElseConditions(type, element.consequent.loc.end.line);
    addToDictionary(element.consequent.loc.end.line, element.consequent.loc.end.column + 2, 'else');
    createItemAccordingToType(element.alternate, inputVector, symbolTable, insideFunction, conditions);
    conditions.pop();
}

function addToIfElseConditions(type, line){
    elseIfConditions[line] = [];
    if(type == 'else if'){
        let lastCondition = Object.keys(elseIfConditions)[Object.keys(elseIfConditions).length-2];
        elseIfConditions[line].push(lastCondition);
        elseIfConditions[line].push(...elseIfConditions[lastCondition]);
    }
}

function returnStatementHandler(element, inputVector, symbolTable, insideFunction, conditions){
    currentLine = element.loc.start.line;
    let value = createItemAccordingToType(element.argument, inputVector, symbolTable, insideFunction, conditions);
    addToDictionary(element.loc.start.line, element.loc.start.column, 'return ' + value + ';');
}

function blockStatementHandler(element, inputVector, symbolTable, insideFunction, conditions){
    currentLine = element.loc.start.line;
    addToDictionary(element.loc.start.line, element.loc.start.column, '{');
    element.body.forEach(bodyElement => {
        createItemAccordingToType(bodyElement, inputVector, symbolTable, insideFunction, conditions);
    });
    addToDictionary(element.loc.end.line, element.loc.end.column, '}');
}

function updateExpressionHandler(element, inputVector, symbolTable, insideFunction, conditions){
    let operator = element.operator;
    let argument = createItemAccordingToType(element.argument, inputVector, symbolTable, insideFunction, conditions);
    return argument + operator;
}

function identifierHandler(element, inputVector, symbolTable, insideFunction, conditions){
    let name = element.name;
    if (!inputVector.has(name)){
        let value = getClosestValue(currentLine, symbolTable[element.name], conditions);
        if(value.length > 2)
            value = '(' + value + ')';
        return value;
    }
    return name;
}

function literalHandler(element){
    return element.raw;
}

function ArrayExpressionHandler(element, inputVector, symbolTable, insideFunction, conditions){
    let elements = [];
    element.elements.forEach(item => {
        elements.push(createItemAccordingToType(item, inputVector, symbolTable, insideFunction, conditions));
    });
    return elements;
}

function addToDictionary(line, column, str){
    if(!(line in codeLines))
        codeLines[line] = {};
    codeLines[line][column] = str;
}

export function getClosestValue(sourceLine, variableValues, conditions){
    let closestLine = '';
    let minDiffValue = Number.MAX_VALUE;
    for(let variable in variableValues){
        if(Math.abs(sourceLine - variableValues[variable].line) < minDiffValue && checkIfContainConditions(conditions, variableValues[variable].conditions)){
            closestLine = variableValues[variable].value;
            minDiffValue = Math.abs(sourceLine - variableValues[variable].line);
        }
    }
    return closestLine;
}

function getVariableValue(sourceLine, variableValues, conditions){
    let value = getClosestValue(sourceLine, variableValues, conditions);
    if(Array.isArray(value))
        return '[' + value + ']';
    else
        return value;
}

export function createFunctionString(symbolTable, inputVector){
    let codeString = ''; // String with color classes
    let functionString = getVariableDeclarationString(symbolTable, inputVector);
    for(let line in codeLines){
        let lineValue;
        let lineString = createRowString(codeLines[line]);
        if(isNeedToPrintTheLine(lineString)){
            if(lineString.includes('if')){
                let condition = getCondition(lineString, inputVector, symbolTable);
                lineValue = eval(functionString + condition);
            }
            else
                functionString += lineString;           
        }
        codeString += createLineWithClass(lineValue, lineString);
    } 
    return codeString;
}

function isNeedToPrintTheLine(lineString){
    return !lineString.trim().startsWith('function') && !lineString.trim().startsWith('return') && 
        !lineString.trim().startsWith('let') && !lineString.trim().startsWith('const') &&
        !lineString.trim().startsWith('var') && !lineString.trim().startsWith('while');
}

export function createLineWithClass(lineValue, lineString){
    if(lineValue == true)
        return '<pre class=green>' + lineString + '</pre>';
    else if(lineValue == false) 
        return '<pre class=red>' + lineString + '</pre>';
    else
        return '<pre>' + lineString + '</pre>';
}

function getCondition(line, inputVector, symbolTable, conditions){
    let i = 0;
    while (i < line.length && line.charAt(i) != 'i') {
        i++;
    }
    line = line.substring(i);
    line += line.endsWith('{') ? '}' : '{}';
    let parsedLine = parseCode(line);
    let condition = parsedLine.body[0].test;
    return createItemAccordingToType(condition, inputVector, symbolTable, false, conditions);

}

function createRowString(lineElements){
    let line = '';
    for(let column in lineElements){
        while(line.length < column)
            line += ' ';
        line += lineElements[column];
    }
    return line;
}

function getVariableDeclarationString(symbolTable, inputVector){
    let declarationString = '';
    inputVector.forEach(variable => {
        declarationString += 'let ' + variable + ' = ' + getVariableValue(0, symbolTable[variable]) + '; ';
    });
    return declarationString;
}

function checkIfContainConditions(source, target){
    if(target == undefined)
        return true;
    for(let condition in target){
        if(!source.includes(target[condition]))
            return false;
    }
    return true;
}