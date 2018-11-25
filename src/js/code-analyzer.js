import * as esprima from 'esprima';
import {createItemAccordingToType} from './codeParser.js';

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse, {loc: true});
};

export function parseToItems(codeToParse){
    let parsedCode = parseCode(codeToParse);
    let items = [];
    parsedCode.body.forEach(element => {
        items = items.concat(createItemAccordingToType(element));
    });
    return items;
}

export {parseCode};
