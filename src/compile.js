const { functionCalls } = require('./optimize');

function printCustom(value) {
  const stdPrint = (value) => value;
  const prints = {
    string: stdPrint,
    number: stdPrint,
    boolean: stdPrint,
    function: (_) => '<#closure>',
    object: (value) => {
      if (value[0] !== undefined && value[1] !== undefined) {
        return `(${printCustom(value[0])}, ${printCustom(value[1])})`;
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

function executeIf(condition, then, otherwise) {
  if (condition()) {
    return then();
  } else {
    return otherwise();
  }
}

const compile = (ast) => {
  const term = ast.expression;
  const compileExpression = getCompilerForKind(term.kind);
  const printCustomCompiled = printCustom.toString();
  const printCompiled = print.toString();
  const executeIfCompiled = executeIf.toString();
  const memoizeCompiled = memoize.toString();
  return (
    printCustomCompiled +
    ' ' +
    printCompiled +
    ' ' +
    executeIfCompiled +
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
  currentTerm.return = true;
  return currentTerm;
};

const compileLet = (term) => {
  const value = compileTermWithValue(term.value);
  const next = compileTermWithValue(term.next);
  return `${term.name.text} = ${value}; ${next}`;
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
  addReturnStatements(term.condition);
  addReturnStatements(term.then);
  addReturnStatements(term.otherwise);
  const condition = `() => { ${compileTermWithValue(term.condition)} }`;
  const then = `() => { ${compileTermWithValue(term.then)} }`;
  const otherwise = `() => { ${compileTermWithValue(term.otherwise)} }`;
  return `executeIf(${condition}, ${then}, ${otherwise})`;
};

const compileBinary = (term) => {
  const lhs = compileTermWithValue(term.lhs);
  const op = binaryOpDict[term.op];
  const rhs = compileTermWithValue(term.rhs);
  const binary = lhs + op + rhs;
  return term.op === 'Div' ? `Math.trunc(${binary})` : binary;
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
  return `[${first}, ${second}]`;
};

const compileFirst = (term) => {
  const tuple = compileTermWithValue(term.value);
  return `${tuple}[0]`;
};

const compileSecond = (term) => {
  const tuple = compileTermWithValue(term.value);
  return `${tuple}[1]`;
};

const compileVar = (term) => term.text;

const compilePrimitive = (term) => term.value;

const compileString = (term) => `"${term.value}"`;

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
