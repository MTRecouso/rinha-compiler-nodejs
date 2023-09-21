const { functionCalls } = require('./optimize');

function printCustom(value) {
  const stdPrint = (value) => value;
  const prints = {
    string: stdPrint,
    number: stdPrint,
    boolean: stdPrint,
    function: (_) => '<#closure>',
    object: (value) => {
      if (value.first && value.second) {
        return `(${printCustom(value.first)}, ${printCustom(value.second)})`;
      } else {
        return 'ERRO';
      }
    },
  };
  return prints[typeof value](value);
}

function print(value) {
  console.log(printCustom(value));
  return value;
}

function memoize(fn, fnName, ...args) {
  const key = `${fnName}_${[...args].join('_')}`;
  if (cache[key]) {
    return cache[key];
  } else {
    cache[key] = fn(...args);
    return cache[key];
  }
}

const compile = (ast) => {
  const term = ast.expression;
  const compileExpression = getCompilerForKind(term.kind);
  const printCustomCompiled = printCustom.toString();
  const printCompiled = print.toString();
  const memoizeCompiled = memoize.toString();
  return (
    printCustomCompiled +
    ' ' +
    printCompiled +
    ' ' +
    'const cache = {}; ' +
    memoizeCompiled +
    ' ' +
    compileExpression(term)
  );
};

const getCompilerForKind = (kind) => kindDict[kind];

const compileTermWithValue = (value) => {
  compileValue = getCompilerForKind(value.kind);
  let compiledValue = compileValue(value);
  if (value.return === true) {
    compiledValue = `return ${compiledValue}`;
  }
  return compiledValue;
};

const addReturnStatements = (currentTerm) => {
  if (currentTerm.kind === 'Let') {
    return addReturnStatements(currentTerm.next);
  }
  if (currentTerm.kind === 'If') {
    addReturnStatements(currentTerm.then);
    return addReturnStatements(currentTerm.otherwise);
  }
  currentTerm.return = true;
  return currentTerm;
};

const compileLet = (term) => {
  const value = compileTermWithValue(term.value);
  const next = compileTermWithValue(term.next);
  return `{let ${term.name.text} = ${value}; ${next}}`;
};

const compilePrint = (term) => {
  const output = compileTermWithValue(term.value);
  return `print(${output})`;
};

const compileFunction = (term) => {
  let parametersOutput = [];
  term.parameters.forEach((parameter) => {
    parametersOutput.push(parameter.text);
  });
  addReturnStatements(term.value, term);
  const output = compileTermWithValue(term.value);
  return `(${parametersOutput.join(',')})=>{${output}}`;
};

const compileIf = (term) => {
  const condition = compileTermWithValue(term.condition);
  const then = compileTermWithValue(term.then);
  const otherwise = compileTermWithValue(term.otherwise);
  return `if(${condition}){${then}}else{${otherwise}}`;
};

const compileBinary = (term) => {
  const lhs = compileTermWithValue(term.lhs);
  const op = binaryOpDict[term.op];
  const rhs = compileTermWithValue(term.rhs);
  return lhs + op + rhs;
};

const compileCall = (term) => {
  const calleeOutput = compileTermWithValue(term.callee);
  let argumentsOutput = [];
  term.arguments.forEach((argument) => {
    argumentsOutput.push(compileTermWithValue(argument));
  });
  let callOutput;
  if (
    functionCalls[term.callee.text] &&
    functionCalls[term.callee.text].isPure === true
  ) {
    callOutput = `memoize(${calleeOutput}, '${
      term.callee.text
    }', ${argumentsOutput.join(',')})`;
  } else {
    callOutput = `${calleeOutput}(${argumentsOutput.join(',')})`;
  }
  return callOutput;
};

const compileTuple = (term) => {
  const first = compileTermWithValue(term.first);
  const second = compileTermWithValue(term.second);
  return `{first: ${first}, second: ${second}}`;
};

const compileFirst = (term) => {
  const tuple = compileTermWithValue(term.value);
  return `${tuple}.first`;
};

const compileSecond = (term) => {
  const tuple = compileTermWithValue(term.value);
  return `${tuple}.second`;
};

const compileVar = (term) => term.text;

const compilePrimitive = (term) => term.value;

const compileString = (term) => `'${term.value}'`;

const kindDict = {
  Let: compileLet,
  Function: compileFunction,
  If: compileIf,
  Print: compilePrint,
  Call: compileCall,
  Var: compileVar,
  Int: compilePrimitive,
  Str: compileString,
  Bool: compilePrimitive,
  Binary: compileBinary,
  Tuple: compileTuple,
  First: compileFirst,
  Second: compileSecond,
};

const binaryOpDict = {
  Add: '+',
  Sub: '-',
  Mul: '*',
  Div: '/',
  Rem: '%',
  Eq: '===',
  Neq: '!==',
  Lt: '<',
  Gt: '>',
  Lte: '<=',
  Gte: '>=',
  And: '&&',
  Or: '||',
};

module.exports = { compile };
