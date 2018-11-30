import * as esprima from 'esprima';
import * as codeParser from './codeParser';
import {parseToItems} from './code-analyzer';

let codeLines = {}

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse, {loc: true});
};

export function applySymbolicSubstitution(codeToParse, symbolTable){
    codeLines = {}
	let parsedCode = parseCode(codeToParse);
	let inputVector = [];
    parsedCode.body.forEach(element => {
        createItemAccordingToType(element, inputVector, symbolTable, false);
    });
    return [codeLines, colorLines(symbolTable)];
}

function colorLines(symbolTable){
    let linesColors = {};
    for (let line in codeLines){
        for(let element in codeLines[line]){
            if(codeLines[line][element].startsWith("if") || codeLines[line][element].startsWith("else if")){
                let condition = codeLines[line][element].split('(')[1].split(')')[0];
                let conditionValue = replaceValue(condition, symbolTable)
                if(eval(conditionValue))
                    linesColors[line] = 'green';
                else
                    linesColors[line] = 'red';
            }
        }
    }
    return linesColors;
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

function createItemAccordingToType(element, inputVector, symbolTable, insideFunction){
    return typeToHandlerMapping[element.type](element, inputVector, symbolTable, insideFunction);
}

function functionDeclarationHandler(element,inputVector, symbolTable, insideFunction){
    let stringToReturn = 'function ' + element.id.name + '(';
    let index = 1;
        element.params.forEach(variable => {
            stringToReturn += index++ < element.params.length ? variable.name + ',' : variable.name + ')';
            inputVector.push(variable.name);
    });
    addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    createItemAccordingToType(element.body, inputVector, symbolTable, true);
}

function variableDeclarationHandler(element, inputVector, symbolTable, insideFunction){
    let declarationIndex = 1;
    element.declarations.forEach(declaration => {
        let value = null;
        if(declaration.init != null)
            value = createItemAccordingToType(declaration.init, inputVector, symbolTable, insideFunction);
        let name = declaration.id.name;
        if(!(name in symbolTable))
            symbolTable[name] = {};
		symbolTable[name][element.loc.start.line] = value;
		if(!insideFunction){
            inputVector.push(name);
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
	let name = createItemAccordingToType(element.left, inputVector, symbolTable, insideFunction);
    let value = createItemAccordingToType(element.right, inputVector, symbolTable, insideFunction);
    if(!(element.left.name in symbolTable))
        symbolTable[element.left.name] = {};
    symbolTable[element.left.name][element.loc.start.line] = value;
    if(inputVector.includes(element.left.name)){
        let stringToReturn = name + ' = ' + value + ';';
        addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    }
}

function memberExpressionHandler(element, inputVector, symbolTable, insideFunction){
    let variable = element.object.name;
    let index = createItemAccordingToType(element.property, inputVector, symbolTable, insideFunction);
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
	let condition = createItemAccordingToType(element.test, inputVector, symbolTable, insideFunction)
    stringToReturn += condition + ')'
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
    // let localSymbolTable = {}
    addToDictionary(element.loc.start.line, element.loc.start.column, stringToReturn);
    createItemAccordingToType(element.consequent, inputVector, symbolTable, insideFunction, localSymbolTable);
    // if(checkCondition(condition)) //TODO:implement the method!
    //     addLocalTableToGlobalTable(localSymbolTable, symbolTable);
    // }
    if(element.alternate != undefined) {
        if(element.alternate.type === 'IfStatement')
            ifStatementHandler(element.alternate, inputVector, symbolTable, insideFunction, 'else if');
        else {
            addToDictionary(element.consequent.loc.end.line, element.consequent.loc.end.column + 1, 'else');
            createItemAccordingToType(element.alternate, inputVector, symbolTable, insideFunction);
        }
    }
    return stringToReturn;
}

// function addLocalTableToGlobalTable(localSymbolTable, globalSymbolTable){
//     for(let variable in localSymbolTable){
//         if(variable in globalSymbolTable){
//             for(let line in localSymbolTable[variable]){
//                 globalSymbolTable[variable][line] = localSymbolTable[variable][line]; 
//             }
//         }
//     }
// }

function returnStatementHandler(element, inputVector, symbolTable, insideFunction){
    let value = createItemAccordingToType(element.argument, inputVector, symbolTable, insideFunction);
    addToDictionary(element.loc.start.line, element.loc.start.column, 'return ' + value + ';');
}

function blockStatementHandler(element, inputVector, symbolTable, insideFunction){
    addToDictionary(element.loc.start.line, element.loc.start.column, '{');
    element.body.forEach(bodyElement => {
        createItemAccordingToType(bodyElement, inputVector, symbolTable, insideFunction) 
    });
    addToDictionary(element.loc.end.line, element.loc.end.column, '}');
}

function updateExpressionHandler(element, inputVector, symbolTable, insideFunction){
    let operator = element.operator;
    let argument = createItemAccordingToType(element.argument, inputVector, symbolTable, insideFunction);
    return argument + operator;
}

function identifierHandler(element, inputVector, symbolTable, insideFunction, localSymbolTable){
	let name = element.name;
	if (!inputVector.includes(name)){
        if(localSymbolTable && element.name in localSymbolTable)
            return getClosestValue(0, symbolTable[element.name]);
        else
            return getClosestValue(0, symbolTable[element.name]); // The line is 0 since we want the initial value
	}
	return name;
}

function literalHandler(element, inputVector, symbolTable, insideFunction){
    return element.value;
}

function addToDictionary(line, column, str){
    if(!(line in codeLines))
        codeLines[line] = {}
    codeLines[line][column] = str;
}

function replaceValue(line, args){
    let comperators = ['<', '>', '==', '!=', '<=', '>='];
    let operators = ['+', '-', '*', '/', '&&', '||', '&', '|']
    let finalExpression;
    let i = 0;
    let expression = findExpression(line, skipSpaces(line, i), operators, comperators, args);
    let operator = findOperator(line, skipSpaces(line, expression[1]), comperators);
    finalExpression = expression[0] + operator[0];
    finalExpression += findExpression(line, skipSpaces(line, operator[1]), operators, comperators, args)[0];
    return finalExpression;    
}

function findVariable(line, i, operators){
    let variable = '';
    while(i < line.length && !operators.includes(line.charAt(i)) && line.charAt(i) != ' '){
        variable += line.charAt(i);
        i++
    }
    return [variable, i];
}

function findOperator(line, i, operators){
    let operator = operators.includes(line.charAt(i)) ? line.charAt(i++) : '';
    if(i < line.length && operators.includes(line.charAt(i)))
        operator += line.charAt[i];
    return [operator, i];
}

function findExpression(line, i, operators, comperators, args){
    let expression = '';
    while(i < line.length && !comperators.includes(line.charAt(i))){
        let variable = findVariable(line, skipSpaces(line,i), operators);
        let operator = findOperator(line, skipSpaces(line, variable[1]), operators);
        i = skipSpaces(line, operator[1]);
        if(variable[0] in args)
            expression += args[variable[0]] + operator[0];
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

export function getClosestValue(sourceLine, variableValues){
    let closestValue = '';
    let minValue = Number.MAX_VALUE;
    for(let line in variableValues){
        if(sourceLine - line < minValue){
            closestValue = variableValues[line];
            minValue = Math.abs(sourceLine - line);
        }
    }
    return closestValue;
}



    


