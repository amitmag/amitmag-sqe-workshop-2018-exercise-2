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
    it('replace local variables with the function arguments', () => {
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
    it('handle arrays variables', () => {
        let symbolTable = {};
        assert.equal(
            applySymbolicSubstitution('let arr=[1, 2, 3]; function func(){\n' + 'let a = 0;\n' + 'if(arr[1]>arr[a])\n' + 'return arr[2]+1;\n}', symbolTable),
            '<pre>let arr = [1,2,3]; function func( {</pre><pre class=green>if(arr[1] > arr[0])</pre><pre>return arr[2] + 1;</pre><pre> }</pre>'
        );
    });
    it('handle locals arrays variables', () => {
        let symbolTable = {};
        assert.equal(
            applySymbolicSubstitution('function func(){\n' + 'let arr=[1, 2, 3];\n' + 'if(arr[1]>arr[2])\n' + 'return arr[2]+1;\n}', symbolTable),
            '<pre>function func( {</pre><pre class=red>if(2 > 3)</pre><pre>return 3 + 1;</pre><pre> }</pre>'
        );
    });
    it('handle if else statements', () => {
        assert.equal(
            applySymbolicSubstitution('let x=1;\n' + 'const y=2;\n' + 'function func(){\n' + 'var a = x;\n' + 'if(a>y)\n' + 'return a+1;\n' +
                                        'else if(a<y){\n' + 'x=x+1}\n' + 'else\n' + 'return x+y\n' + 'a=x\n}', {}),
            '<pre>let x = 1;</pre><pre>const y = 2;</pre><pre>function func( {</pre><pre class=red>if(x > y)</pre><pre>return x + 1;</pre><pre class=green> else if(x < y){</pre><pre>x = x + 1;}else</pre><pre>return x + y;</pre><pre> }</pre>'
        );
    });
    it('handle nested if statements', () => {
        assert.equal(
            applySymbolicSubstitution('function func(){\n' + 'let x=2;\n' + 'if(x>1){\n'+ 'if(x>2){\n' + 'x=x+1;}}\n'+ 'return x+1;}\n', {}),
            '<pre>function func( {</pre><pre class=green>if(2 > 1){</pre><pre class=red>if(2 > 2){</pre><pre>       }}</pre><pre>return 2 + 1;}</pre>'
        );
    });
    it('handle while statements', () => {
        assert.equal(
            applySymbolicSubstitution('let x=1, y=2;\n' + 'function func(){\n' + 'x++;\n' + 'let a = x;\n' + 'y = a + 1;\n' + 'while(a>y)\n' + 'return a+1;}', {}),
            '<pre>let x = 1, y = 2;</pre><pre>function func( {</pre><pre>y = x + 1;</pre><pre>while(x > y)</pre><pre>return x + 1;}</pre>'
        );
    });
    it('handle condition with unary variable', () => {
        assert.equal(
            applySymbolicSubstitution('let x=true;\n' + 'function func(){\n' + 'if(!x)\n' + 'return x;}', {}),
            '<pre>let x = true;</pre><pre>function func( {</pre><pre class=red>if(!x)</pre><pre>return x; }</pre>'
        );
    });
});





