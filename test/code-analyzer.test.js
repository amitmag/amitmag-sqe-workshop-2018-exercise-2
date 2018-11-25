import assert from 'assert';
import {parseCode, parseToItems} from '../src/js/code-analyzer';
import {functionDeclarationHandler} from '../src/js/codeParser';
import * as parser from '../src/js/codeParser';

describe('The javascript parser', () => {
    it('is parsing an empty function correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('')),
            '{"type":"Program","body":[],"sourceType":"script","loc":{"start":{"line":0,"column":0},"end":{"line":0,"column":0}}}'
        );
    });

    it('is parsing a simple variable declarations correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('let a = 1;')),
            '{"type":"Program","body":[{"type":"VariableDeclaration","declarations":[{"type":"VariableDeclarator","id":{"type":"Identifier","name":"a","loc":{"start":{"line":1,"column":4},"end":{"line":1,"column":5}}},"init":{"type":"Literal","value":1,"raw":"1","loc":{"start":{"line":1,"column":8},"end":{"line":1,"column":9}}},"loc":{"start":{"line":1,"column":4},"end":{"line":1,"column":9}}}],"kind":"let","loc":{"start":{"line":1,"column":0},"end":{"line":1,"column":10}}}],"sourceType":"script","loc":{"start":{"line":1,"column":0},"end":{"line":1,"column":10}}}'
        );
    });
});

describe('The variable handling', () => {
    it('initial variables successfully', () => {
        assert.equal(
            parseToItems('let a = 2\n' + 'let a, b, c;\n' + 'let z, a = 0').length, 6)
    })
    it('assign value or expressions to variables successfully', () => {
        assert.equal(
            parseToItems('a = (2 + 3) / n\n' + 'a = z + 1\n' + 'y = a + arr[3]')[2].value, 'a + arr[3]')
    })
})

describe('The function handling', () => {
    it('handle function declaration successfully', () => {
        assert.equal(
            parseToItems('function func1(a, b, c) { }\n' + 'function func2() { return -1}\n' +'function func4(a) { a = a + 1;\n' + 'return n;}\n')[5].type, 'return statement')
    })
    it('handle complex functions successfully', () => {
        assert.equal(
            parseToItems('function binarySearch(X, V, n){\n' + 
                'let low, mid, high;\n' +
                'low = 0;\n' +
                'high = n - 1;\n' +
                'while (low <= high) {\n' +
                    'mid = (low + high)/2;\n' +
                    'if (X < V[mid])\n' +
                        'high = mid - 1;\n' +
                    'else if (X > V[mid])\n' +
                        'low = mid + 1;\n' +
                    'else\n' +
                        'return mid;}\n' +
                'return -1;}').length, 17);
    });
})

describe('The loops handling', () => {
    it('handle while loop successfully', () => {
        assert.equal(
            parseToItems('while(a < 2) {}\n' + 'while(b==3) { b++ }')[0].type, 'while statement')
    })
    it('handle for loop successfully', () => {
        assert.equal(
            parseToItems('for(let i=m; i > n; i--){}').length, 3)
    })  
    it('handle do while loop successfully', () => {
        assert.equal(
            parseToItems('do { i++; } while(i<5);')[0].condition, 'i < 5')
    })  
})

describe('The conditions handling', () => {
    it('handle if statement successfully', () => {
        assert.equal(
            parseToItems('if(a > b) {x = n + 1;}\n' + 'if(a == b) {a = 1;}\n')[2].condition, 'a == b')
    })
    it('handle if else statement successfully', () => {
        assert.equal(
            parseToItems('if(a > b) {x = n + 1;}\n' + 'else if(a == b) {a = 1;}\n' + 'else {a=2;}')[2].type, "else if statement")
    })
})



