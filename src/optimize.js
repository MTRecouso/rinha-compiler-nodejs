const functionCalls = {};

const optimize = (ast) => {
  optimizeRecursions(ast.expression);
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
      scope !== null &&
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
