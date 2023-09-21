const variablesList = new Set();
const functionCalls = {};

const optimize = (ast) => {
  ast.expression = eliminateDeadCode(ast.expression);
  optimizeRecursions(ast.expression);
};

const eliminateDeadCode = (term) => {
  findDeadVariables(term);
  if (variablesList.size > 0) {
    term = eliminateDeadVariables(term);
  }
  return term;
};

const findDeadVariables = (term) => {
  if (
    term.kind === 'Let' &&
    term.next.kind !== 'Print' &&
    term.next.kind !== 'Call'
  ) {
    variablesList.add(term.name.text);
  }
  if (term.kind === 'Var') {
    variablesList.delete(term.text);
  }

  if (term.value) {
    findDeadVariables(term.value);
  }
  if (term.next) {
    findDeadVariables(term.next);
  }
  if (term.kind === 'If') {
    findDeadVariables(term.condition);
    findDeadVariables(term.then);
    findDeadVariables(term.otherwise);
  }
  if (term.kind === 'Binary') {
    findDeadVariables(term.rhs);
    findDeadVariables(term.lhs);
  }
  if (term.kind === 'Call') {
    findDeadVariables(term.callee);
    term.arguments.forEach((argument) => {
      findDeadVariables(argument);
    });
  }
};

const eliminateDeadVariables = (term) => {
  if (term.kind === 'Let' && variablesList.has(term.name.text)) {
    variablesList.delete(term.name.text);
    term = term.next;
  }
  if (term.value) {
    term.value = eliminateDeadVariables(term.value);
  }
  if (term.next) {
    term.next = eliminateDeadVariables(term.next);
  }
  if (term.kind === 'If') {
    term.condition = eliminateDeadVariables(term.condition);
    term.then = eliminateDeadVariables(term.then);
    term.otherwise = eliminateDeadVariables(term.otherwise);
  }
  if (term.kind === 'Call') {
    term.callee = eliminateDeadVariables(term.callee);
    term.arguments = term.arguments.map((argument) =>
      eliminateDeadVariables(argument)
    );
  }
  return term;
};

const optimizeRecursions = (term, scope = null) => {
  if (term.kind === 'Let' && term.value.kind === 'Function') {
    functionCalls[term.name.text] = { isPure: true };
    optimizeRecursions(term.value, term.name.text);
  }
  if (term.value) {
    optimizeRecursions(term.value, scope);
  }
  if (term.next) {
    optimizeRecursions(term.next, scope);
  }
  if (term.kind === 'Print') {
    if (scope !== null) {
      functionCalls[scope] = { isPure: false };
    }
  }
  if (term.kind === 'If') {
    optimizeRecursions(term.then);
    optimizeRecursions(term.otherwise);
  }
  if (term.kind === 'Call') {
    if (
      functionCalls[term.callee.text] &&
      functionCalls[term.callee.text].isPure === false
    ) {
      functionCalls[scope].isPure = false;
    }
    optimizeRecursions(term.callee, scope);
    term.arguments.map((argument) => optimizeRecursions(argument, scope));
  }
};

module.exports = { optimize, functionCalls };
