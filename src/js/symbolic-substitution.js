import * as esprima from 'esprima';

let codeLines = {};
let linesColors = {};
let elseIfConditions = {};

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse, {loc: true});
};

export function applySymbolicSubstitution(codeToParse, symbolTable){
    codeLines = {}, linesColors = {}, elseIfConditions = {};
    let parsedCode = parseCode(codeToParse);
    let inputVector = new Set([]);
    let functionItem;
    parsedCode.body.forEach(element => {
        if(element.type === 'FunctionDeclaration')
            functionItem = element;
        else
            createItemAccordingToType(element, inputVector, symbolTable, false);
    });
    if(functionItem)
        createItemAccordingToType(functionItem, inputVector, symbolTable, false);
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

function createItemAccordingToType(element, inputVector, symbolTable, insideFunction){
    return typeToHandlerMapping[element.type](element, inputVector, symbolTable, insideFunction);
}

function functionDeclarationHandler(element,inputVector, symbolTable){
    let stringToReturn = 'function ' + element.id.name + '(';
    let index = 1;
    element.params.forEach(variable => {
        stringToReturn += index++ < element.params.length ? variable.name + ',' : variable.name + ')';
        inputVector.add(variable.name);
    });
    addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    createItemAccordingToType(element.body, inputVector, symbolTable, true);
}

function variableDeclarationHandler(element, inputVector, symbolTable, insideFunction){
    let declarationIndex = 1, stringToReturn = '';
    element.declarations.forEach(declaration => {
        let value = null;
        if(declaration.init != null)
            value = createItemAccordingToType(declaration.init, inputVector, symbolTable, insideFunction);
        let name = declaration.id.name;
        if(!(name in symbolTable))
            symbolTable[name] = [];
        symbolTable[name].push({'line':element.loc.start.line, 'value': value});
        if(!insideFunction){
            inputVector.add(name);
            stringToReturn += name + ' = ' + value;
            stringToReturn += declarationIndex++ < element.declarations.length ? ', ' : ';';
        }
    });
    if(!insideFunction)
        addToDictionary(element.loc.start.line, element.loc.start.column, element.kind + ' ' + stringToReturn);
}

function expressionStatementHandler(element, inputVector, symbolTable, insideFunction){
    return createItemAccordingToType(element.expression, inputVector, symbolTable, insideFunction);
}

function assignmentExpressionHandler(element,inputVector, symbolTable, insideFunction){
    let name = element.left.name;
    let value = createItemAccordingToType(element.right, inputVector, symbolTable, insideFunction);
    if(!(name in symbolTable))
        symbolTable[name] = [];
    symbolTable[name].push({'line':element.loc.start.line, 'value': value});
    if(inputVector.has(name)){
        let stringToReturn = name + ' = ' + value + ';';
        addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    }
}

function memberExpressionHandler(element, inputVector, symbolTable, insideFunction){
    let variable = element.object.name;
    let index = createItemAccordingToType(element.property, inputVector, symbolTable, insideFunction);
    if(!inputVector.has(variable)){
        return getClosestValue(symbolTable[element.name])[index];
    }
    return variable + '[' + index + ']';
}

function binaryExpressionHandler(element, inputVector, symbolTable, insideFunction){
    let operator = element.operator;
    let right = createItemAccordingToType(element.right, inputVector, symbolTable, insideFunction);
    let left = createItemAccordingToType(element.left, inputVector, symbolTable, insideFunction);
    return left + ' ' + operator + ' ' + right;
}

function whileStatementHandler(element, inputVector, symbolTable, insideFunction){
    let stringToReturn = 'while(';
    let condition = createItemAccordingToType(element.test, inputVector, symbolTable, insideFunction);
    stringToReturn += condition + ')';
    addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    createItemAccordingToType(element.body, inputVector, symbolTable, insideFunction);
}

function unaryExpressionHandler(element, inputVector, symbolTable, insideFunction){
    let operator = element.operator;
    let argument = createItemAccordingToType(element.argument, inputVector, symbolTable, insideFunction);
    return operator + argument;
}

function ifStatementHandler(element, inputVector, symbolTable, insideFunction, type = 'if'){
    let condition = createItemAccordingToType(element.test, inputVector, symbolTable, insideFunction);
    let stringToReturn = type + '(' + condition + ')';
    addToIfElseConditions(type, element.loc.start.line);
    if(type === 'if')
        addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    else
        addToDictionary(element.loc.start.line, element.loc.start.column - 4, stringToReturn);
    createItemAccordingToType(element.consequent, inputVector, symbolTable, insideFunction);
    if(element.alternate != undefined)
        alternareHandler(element, inputVector, symbolTable, insideFunction, type);
    return stringToReturn;
}

function alternareHandler(element, inputVector, symbolTable, insideFunction, type){
    if(element.alternate.type === 'IfStatement')
        ifStatementHandler(element.alternate, inputVector, symbolTable, insideFunction, 'else if');
    else 
        elseHandler(element, type, inputVector, symbolTable, insideFunction);
}

function elseHandler(element, type, inputVector, symbolTable, insideFunction){
    addToIfElseConditions(type, element.consequent.loc.end.line);
    addToDictionary(element.consequent.loc.end.line, element.consequent.loc.end.column + 2, 'else');
    createItemAccordingToType(element.alternate, inputVector, symbolTable, insideFunction,);
}

function addToIfElseConditions(type, line){
    elseIfConditions[line] = [];
    if(type == 'else if'){
        let lastCondition = Object.keys(elseIfConditions)[Object.keys(elseIfConditions).length-2];
        elseIfConditions[line].push(lastCondition);
        elseIfConditions[line].push(...elseIfConditions[lastCondition]);
    }
}

// function checkLineColor(condition, symbolTable, line){
//     let conditionValue = replaceValue(condition, symbolTable, line);
//     if(eval(conditionValue))
//         linesColors[line] = 'green';
//     else
//         linesColors[line] = 'red';
// }

function returnStatementHandler(element, inputVector, symbolTable, insideFunction){
    let value = createItemAccordingToType(element.argument, inputVector, symbolTable, insideFunction);
    addToDictionary(element.loc.start.line, element.loc.start.column, 'return ' + value + ';');
}

function blockStatementHandler(element, inputVector, symbolTable, insideFunction){
    addToDictionary(element.loc.start.line, element.loc.start.column, '{');
    element.body.forEach(bodyElement => {
        createItemAccordingToType(bodyElement, inputVector, symbolTable, insideFunction);
    });
    addToDictionary(element.loc.end.line, element.loc.end.column, '}');
}

function updateExpressionHandler(element, inputVector, symbolTable, insideFunction){
    let operator = element.operator;
    let argument = createItemAccordingToType(element.argument, inputVector, symbolTable, insideFunction);
    return argument + operator;
}

function identifierHandler(element, inputVector, symbolTable){
    let name = element.name;
    if (!inputVector.has(name)){
        let value = getClosestValue(symbolTable[element.name]);
        if(value.length > 2)
            value = '(' + value + ')';
        return value;
    }
    return name;
}

function literalHandler(element){
    return element.raw;
}

function ArrayExpressionHandler(element){
    let elements = [];
    element.elements.forEach(item => {
        elements.push(item);
    });
    return elements;
}

function addToDictionary(line, column, str){
    if(!(line in codeLines))
        codeLines[line] = {};
    codeLines[line][column] = str;
}

export function getClosestValue(variableValues){
    let lastValue = variableValues[Object.keys(variableValues)[Object.keys(variableValues).length - 1]]
    if(Array.isArray(lastValue.value))
        return '[' + lastValue.value + ']';
    else
        return lastValue.value;

    // let closestLine = '';
    // let minDiffValue = Number.MAX_VALUE;
    // for(let variable in variableValues){
    //     if(sourceLine - variableValues[variable].line < minDiffValue){
    //         closestLine = variableValues[variable].value;
    //         minDiffValue = Math.abs(sourceLine - variableValues[variable].line);
    //     }
    // }
    // return closestLine;
}

function createFunctionString(symbolTable, inputVector){
    let codeString = ''; // String with color classes
    let functionString = getVariableDeclarationString(symbolTable, inputVector);
    for(let line in codeLines){
        let lineValue;
        let lineString = createRowString(codeLines[line]);
        if(isNeedToPrintTheLine(lineString)){
            if(lineString.includes('if') || lineString.includes('while')){
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
        !lineString.trim().startsWith('var');
}

function createLineWithClass(lineValue, lineString){
    if(lineValue == true)
        return '<pre class=green>' + lineString + '</pre>';
    else if(lineValue == false) 
        return '<pre class=red>' + lineString + '</pre>';
    else
        return '<pre>' + lineString + '</pre>';
}

function getCondition(line, inputVector, symbolTable){
    let i = 0;
    while (i < line.length && line.charAt(i) != 'i' && line.charAt(i) != 'w') {
        i++;
    }
    line = line.substring(i);
    line += line.endsWith('{') ? '}' : '{}';
    let parsedLine = parseCode(line);
    let condition = parsedLine.body[0].test;
    return createItemAccordingToType(condition, inputVector, symbolTable, false);

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
        declarationString += 'let ' + variable + ' = ' + getClosestValue(symbolTable[variable]) + '; ';

    })
    // for(let variable in inputVector){
    //     declarationString += 'let' + variable + '=' + getClosestValue(symbolTable[variable]) + '; ';
    // }
    return declarationString;
}
// function replaceValue(condition, symbolTable, line){
//     let comperators = ['<', '>', '==', '!=', '<=', '>='];
//     let operators = ['+', '-', '*', '/', '&&', '||', '&', '|'];
//     let finalExpression;
//     let i = 0;
//     let expression = findExpression(condition, skipSpaces(line, i), operators, comperators, symbolTable, line);
//     let operator = findOperator(condition, skipSpaces(line, expression[1]), comperators);
//     finalExpression = expression[0] + operator[0];
//     finalExpression += findExpression(condition, skipSpaces(line, operator[1]), operators, comperators, symbolTable, line)[0];
//     return finalExpression;    
// }

// function findVariable(condition, i, operators){
//     let variable = '';
//     while(i < condition.length && !operators.includes(condition.charAt(i)) && condition.charAt(i) != ' '){
//         variable += condition.charAt(i);
//         i++;
//     }
//     return [variable, i];
// }

// function findOperator(condition, i, operators){
//     let operator = operators.includes(condition.charAt(i)) ? condition.charAt(i++) : '';
//     if(i < condition.length && operators.includes(condition.charAt(i)))
//         operator += condition.charAt[i];
//     return [operator, i];
// }

// function findExpression(condition, i, operators, comperators, symbolTable, line){
//     let expression = '';
//     while(i < condition.length && !comperators.includes(condition.charAt(i))){
//         let variable = findVariable(condition, skipSpaces(condition,i), operators);
//         let operator = findOperator(condition, skipSpaces(condition, variable[1]), operators);
//         i = skipSpaces(condition, operator[1]);
//         if(variable[0] in symbolTable)
//             expression += getClosestValue(line, symbolTable[variable[0]]) + operator[0];
//         else
//             expression += variable[0] + operator[0];
//     }
    
//     return [expression, i];
// }

// function skipSpaces(line, i){
//     while(i < line.length && line.charAt(i) == ' ')
//         i++;
//     return i;
// }



// function checkAllConditions(conditions, line){
//     for(let condition in conditions){
//         if(elseIfConditions[line].includes(conditions[condition].toString()) || linesColors[conditions[condition]] === 'red' || linesColors[conditions[condition]] === '')
//             return false;
//     }
//     return true;
// }

// function checkIfContainConditions(source, target){
//     for(let condition in target){
//         if(!source.includes(target[condition]))
//             return false;
//     }
//     return true;
// }