const fs = require('fs');
const { compile } = require('./compile');
const { optimize } = require('./optimize');

const clArgs = process.argv.slice(2);
//TODO: Add Exception when no file is passed
const filePath = `${clArgs[0]}`;
const fileData = fs.readFileSync(filePath);
const parsedAST = JSON.parse(fileData);
optimize(parsedAST);
const output = compile(parsedAST);
console.log(output);
