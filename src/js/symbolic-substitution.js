import * as esprima from 'esprima';

let codeLines = {};
let linesColors = {};
let elseIfConditions = {};
let currentLine = 0;

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse, {loc: true});
};

export function applySymbolicSubstitution(codeToParse, symbolTable){
    codeLines = {}, linesColors = {}, elseIfConditions = {};
    let parsedCode = parseCode(codeToParse);
    let inputVector = [];
    parsedCode.body.forEach(element => {
        createItemAccordingToType(element, inputVector, symbolTable, false);
    });
    return [codeLines, linesColors];
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
    'Literal': literalHandler
};

function createItemAccordingToType(element, inputVector, symbolTable, insideFunction, conditions){
    return typeToHandlerMapping[element.type](element, inputVector, symbolTable, insideFunction, conditions);
}

function functionDeclarationHandler(element,inputVector, symbolTable){
    currentLine = element.loc.start.line;
    let stringToReturn = 'function ' + element.id.name + '(';
    let index = 1;
    element.params.forEach(variable => {
        stringToReturn += index++ < element.params.length ? variable.name + ',' : variable.name + ')';
        inputVector.push(variable.name);
    });
    let conditions = [];
    addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    createItemAccordingToType(element.body, inputVector, symbolTable, true, conditions);
}

function variableDeclarationHandler(element, inputVector, symbolTable, insideFunction, conditions){
    let declarationIndex = 1, stringToReturn = '';
    currentLine = element.loc.start.line;
    element.declarations.forEach(declaration => {
        let value = null;
        if(declaration.init != null)
            value = createItemAccordingToType(declaration.init, inputVector, symbolTable, insideFunction, conditions);
        let name = declaration.id.name;
        if(!(name in symbolTable))
            symbolTable[name] = [];
        symbolTable[name].push({'line':element.loc.start.line, 'conditions': [...conditions], 'value': value});
        if(!insideFunction){
            inputVector.push(name);
            stringToReturn += name + ' = ' + value;
            stringToReturn += declarationIndex++ < element.declarations.length ? ', ' : ';';
        }
    });
    if(!insideFunction)
        addToDictionary(element.loc.start.line, element.loc.start.column, element.kind + ' ' + stringToReturn);
}

function expressionStatementHandler(element, inputVector, symbolTable, insideFunction, conditions){
    return createItemAccordingToType(element.expression, inputVector, symbolTable, insideFunction, conditions);
}

function assignmentExpressionHandler(element,inputVector, symbolTable, insideFunction, conditions){
    let name = element.left.name;
    currentLine = element.loc.start.line;
    let value = createItemAccordingToType(element.right, inputVector, symbolTable, insideFunction, conditions);
    if(!(name in symbolTable))
        symbolTable[name] = [];
    symbolTable[name].push({'line':element.loc.start.line, 'conditions': [...conditions], 'value': value});
    if(inputVector.includes(name)){
        let stringToReturn = name + ' = ' + value + ';';
        addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    }
}

function memberExpressionHandler(element, inputVector, symbolTable, insideFunction, conditions){
    let variable = element.object.name;
    let index = createItemAccordingToType(element.property, inputVector, symbolTable, insideFunction, conditions);
    return variable + '[' + index + ']';
}

function binaryExpressionHandler(element, inputVector, symbolTable, insideFunction, conditions){
    let operator = element.operator;
    let right = createItemAccordingToType(element.right, inputVector, symbolTable, insideFunction, conditions);
    let left = createItemAccordingToType(element.left, inputVector, symbolTable, insideFunction, conditions);
    return left + ' ' + operator + ' ' + right;
}

function whileStatementHandler(element, inputVector, symbolTable, insideFunction, conditions){
    let stringToReturn = 'while(';
    currentLine = element.loc.start.line;
    let condition = createItemAccordingToType(element.test, inputVector, symbolTable, insideFunction, conditions);
    checkLineColor(condition, symbolTable, element.loc.start.line);
    stringToReturn += condition + ')';
    addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    conditions.push(element.loc.start.line);
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
    let condition = createItemAccordingToType(element.test, inputVector, symbolTable, insideFunction);
    checkLineColor(condition, symbolTable, element.loc.start.line);
    let stringToReturn = type + '(' + condition + ')';
    addToIfElseConditions(type, element.loc.start.line);
    conditions.push(element.loc.start.line);
    if(type === 'if')
        addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    else
        addToDictionary(element.loc.start.line, element.loc.start.column - 4, stringToReturn);
    createItemAccordingToType(element.consequent, inputVector, symbolTable, insideFunction, conditions);
    conditions.pop();
    if(element.alternate != undefined)
        alternareHandler(element, inputVector, symbolTable, insideFunction, conditions, type);
    return stringToReturn;
}

function alternareHandler(element, inputVector, symbolTable, insideFunction, conditions, type){
    if(element.alternate.type === 'IfStatement')
        ifStatementHandler(element.alternate, inputVector, symbolTable, insideFunction, conditions , 'else if');
    else 
        elseHandler(element, type, conditions, inputVector, symbolTable, insideFunction);
}

function elseHandler(element, type, conditions, inputVector, symbolTable, insideFunction){
    addToIfElseConditions(type, element.consequent.loc.end.line);
    conditions.push(element.consequent.loc.end.line);
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

function checkLineColor(condition, symbolTable, line){
    let conditionValue = replaceValue(condition, symbolTable, line);
    if(eval(conditionValue))
        linesColors[line] = 'green';
    else
        linesColors[line] = 'red';
}

function returnStatementHandler(element, inputVector, symbolTable, insideFunction, conditions){
    currentLine = element.loc.start.line;
    let value = createItemAccordingToType(element.argument, inputVector, symbolTable, insideFunction, conditions);
    addToDictionary(element.loc.start.line, element.loc.start.column, 'return ' + value + ';');
}

function blockStatementHandler(element, inputVector, symbolTable, insideFunction, conditions){
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
    if (!inputVector.includes(name)){
        return getClosestValue(currentLine, symbolTable[element.name], conditions);
    }
    return name;
}

function literalHandler(element){
    return element.value;
}

function addToDictionary(line, column, str){
    if(!(line in codeLines))
        codeLines[line] = {};
    codeLines[line][column] = str;
}

function replaceValue(condition, symbolTable, line){
    let comperators = ['<', '>', '==', '!=', '<=', '>='];
    let operators = ['+', '-', '*', '/', '&&', '||', '&', '|'];
    let finalExpression;
    let i = 0;
    let expression = findExpression(condition, skipSpaces(line, i), operators, comperators, symbolTable, line);
    let operator = findOperator(condition, skipSpaces(line, expression[1]), comperators);
    finalExpression = expression[0] + operator[0];
    finalExpression += findExpression(condition, skipSpaces(line, operator[1]), operators, comperators, symbolTable, line)[0];
    return finalExpression;    
}

function findVariable(condition, i, operators){
    let variable = '';
    while(i < condition.length && !operators.includes(condition.charAt(i)) && condition.charAt(i) != ' '){
        variable += condition.charAt(i);
        i++;
    }
    return [variable, i];
}

function findOperator(condition, i, operators){
    let operator = operators.includes(condition.charAt(i)) ? condition.charAt(i++) : '';
    if(i < condition.length && operators.includes(condition.charAt(i)))
        operator += condition.charAt[i];
    return [operator, i];
}

function findExpression(condition, i, operators, comperators, symbolTable, line){
    let expression = '';
    while(i < condition.length && !comperators.includes(condition.charAt(i))){
        let variable = findVariable(condition, skipSpaces(condition,i), operators);
        let operator = findOperator(condition, skipSpaces(condition, variable[1]), operators);
        i = skipSpaces(condition, operator[1]);
        if(variable[0] in symbolTable)
            expression += getClosestValue(line, symbolTable[variable[0]]) + operator[0];
        else
            expression += variable[0] + operator[0];
    }
    return [expression, i];
}

function skipSpaces(line, i){
    while(i < line.length && line.charAt(i) == ' ')
        i++;
    return i;
}

export function getClosestValue(sourceLine, variableValues, conditions){
    let closestLine = '';
    let minDiffValue = Number.MAX_VALUE;
    for(let variable in variableValues){
        if(sourceLine - variableValues[variable].line < minDiffValue && 
            (checkIfContainConditions(conditions, variableValues[variable].conditions) || 
            checkAllConditions(variableValues[variable].conditions, conditions[conditions.length - 1]))){
            closestLine = variableValues[variable].value;
            minDiffValue = Math.abs(sourceLine - variableValues[variable].line);
        }
    }
    return closestLine;
}

function checkAllConditions(conditions, line){
    for(let condition in conditions){
        if(elseIfConditions[line].includes(conditions[condition].toString()) || linesColors[conditions[condition]] === 'red' || linesColors[conditions[condition]] === '')
            return false;
    }
    return true;
}

function checkIfContainConditions(source, target){
    for(let condition in target){
        if(!source.includes(target[condition]))
            return false;
    }
    return true;
}



    


