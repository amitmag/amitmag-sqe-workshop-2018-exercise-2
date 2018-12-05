import assert from 'assert';
import {applySymbolicSubstitution} from '../src/js/symbolic-substitution';

describe('The symbol substitution', () => {
    it('replace local variables', () => {
        assert.equal(
            applySymbolicSubstitution('function func(x){\n' + 'let a=x;\n' + 'return a;\n' +'}', {}),
            '<pre>function func(x){</pre><pre>return x;</pre><pre> }</pre>'
        );
    });
    it('handle global variables', () => {
        assert.equal(
            applySymbolicSubstitution('let x=2;\n' + 'function func(){\n' + 'let a=x+1;\n' + 'return a;\n' +'}', {}),
            '<pre>let x = 2;</pre><pre>function func( {</pre><pre>return (x + 1);</pre><pre> }</pre>'
        );
    });
    it('replace global variables with the function arguments', () => {
        let symbolTable = {};
        symbolTable['x'] = [];
        symbolTable['y'] = [];
        symbolTable['z'] = [];
        symbolTable['x'].push({'line': 0, 'conditions:': [], 'value:': 1});
        symbolTable['y'].push({'line': 0, 'conditions:': [], 'value:': 2});
        symbolTable['z'].push({'line': 0, 'conditions:': [], 'value:': 3});
        assert.equal(
            applySymbolicSubstitution('function func(x, y, z){\n' + 'let a=x+y+z;\n' + 'if(a>5)\n' + 'return a+a;\n' +'}', symbolTable),
            '<pre>function func(x,y,z)  {</pre><pre class=red>if((x + y + z) > 5)</pre><pre>return (x + y + z) + (x + y + z);</pre><pre> }</pre>'
        );
    });
    // it('handle arrays variables', () => {
    //     let symbolTable = {};
    //     symbolTable['arr'] = [];
    //     symbolTable['arr'].push({'line': 0, 'conditions:': [], 'value:': [1,2,3]});
    //     assert.equal(
    //         applySymbolicSubstitution('function func(arr){\n' + 'let a = 0;\n' + 'if(arr[0]>arr[a])\n' + 'return arr+1;\n}', symbolTable),
    //         '<pre>function func(arr){</pre><pre class=green>if(arr[1] > arr[0])</pre><pre>return 0 + 1;</pre><pre> }</pre>'
    //     );
    // });
    // it('handle if else statements', () => {
    //     assert.equal(
    //         applySymbolicSubstitution('let x=1;\n' + 'let y=2;\n' + 'function func(){\n' + 'let a = x;\n' + 'if(a>y)\n' + 'return a+1;\n' +
    //                                     'else if(a<y){\n' + 'x=x+1\n' + 'return x+a;}\n' + 'else\n' + 'return x+y\n' + '}', {}),
    //         '<pre>let x = 2;</pre><pre>function func( {</pre><pre>return (x + 1);</pre><pre> }</pre>'
    //     );
    // });
});





