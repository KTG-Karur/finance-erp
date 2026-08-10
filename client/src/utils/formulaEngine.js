// Evaluates a custom loan formula built entirely by clicking predefined chips in
// FormulaBuilder.jsx — the token array it produces is always grammatically well-formed
// (the builder only ever offers tokens that keep the formula valid), so this is a plain
// operator-precedence evaluator, not a full parser with syntax-error recovery. It still
// never throws: any runtime problem (bad variable, division by zero, non-finite or
// negative result) comes back as { error } so a live preview or collection screen can
// show a message instead of crashing mid-render.

export const FORMULA_VARIABLES = [
  { token: 'principal', label: 'Original Loan Amount' },
  { token: 'outstanding', label: 'Outstanding Balance' },
  { token: 'rate', label: 'Interest Rate' },
  { token: 'days', label: 'Days Since Last Payment' },
  { token: 'tenure_days', label: 'Total Tenure (Days)' },
  { token: 'period', label: 'Period Number' },
  { token: 'periods', label: 'Total Periods' }
];

export const FORMULA_OPERATORS = [
  { token: '+', label: '+' },
  { token: '-', label: '−' },
  { token: '*', label: '×' },
  { token: '/', label: '÷' }
];

export const FORMULA_FUNCTIONS = [
  { token: 'min', label: 'Minimum', arity: 2 },
  { token: 'max', label: 'Maximum', arity: 2 },
  { token: 'round', label: 'Round', arity: 1 }
];

const VARIABLE_TOKENS = new Set(FORMULA_VARIABLES.map(v => v.token));
const OPERATOR_TOKENS = new Set(FORMULA_OPERATORS.map(o => o.token));
const FUNCTION_TOKENS = new Set(FORMULA_FUNCTIONS.map(f => f.token));

const isNumberToken = (tok) => typeof tok === 'number' || (typeof tok === 'string' && tok !== '' && !Number.isNaN(Number(tok)) && !VARIABLE_TOKENS.has(tok));

function labelFor(tok) {
  if (tok === '(' || tok === ')') return tok;
  if (OPERATOR_TOKENS.has(tok)) return FORMULA_OPERATORS.find(o => o.token === tok).label;
  const v = FORMULA_VARIABLES.find(v => v.token === tok);
  if (v) return v.label;
  const f = FORMULA_FUNCTIONS.find(f => f.token === tok);
  if (f) return f.label;
  if (isNumberToken(tok)) return String(tok);
  return String(tok);
}

// Plain-language rendering of the token array, shown in the builder's "tape" and in
// scheme previews — e.g. ['outstanding','*','rate','*','days'] -> "Outstanding Balance
// × Interest Rate × Days Since Last Payment".
export function tokensToDisplayString(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return '';
  return tokens.map(labelFor).join(' ');
}

// Recursive-descent evaluator over an already-valid token stream. Grammar:
//   expr   := term (('+'|'-') term)*
//   term   := factor (('*'|'/') factor)*
//   factor := number | variable | func '(' expr (',' expr)* ')' | '(' expr ')' | '-' factor
function evaluateTokens(tokens, variables) {
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseFactor() {
    const tok = peek();
    if (tok === undefined) throw new Error('Formula is incomplete.');

    if (tok === '-') {
      next();
      return -parseFactor();
    }
    if (tok === '(') {
      next();
      const val = parseExpr();
      if (peek() !== ')') throw new Error('Missing closing bracket.');
      next();
      return val;
    }
    if (FUNCTION_TOKENS.has(tok)) {
      const fn = FORMULA_FUNCTIONS.find(f => f.token === tok);
      next();
      if (peek() !== '(') throw new Error(`"${fn.label}" must be followed by (`);
      next();
      const args = [parseExpr()];
      while (peek() === ',') { next(); args.push(parseExpr()); }
      if (peek() !== ')') throw new Error('Missing closing bracket.');
      next();
      if (args.length !== fn.arity) throw new Error(`"${fn.label}" needs ${fn.arity} value(s).`);
      if (tok === 'min') return Math.min(...args);
      if (tok === 'max') return Math.max(...args);
      if (tok === 'round') return Math.round(args[0]);
      throw new Error(`Unknown function "${tok}".`);
    }
    if (VARIABLE_TOKENS.has(tok)) {
      next();
      const val = variables[tok];
      if (val === undefined || val === null || Number.isNaN(Number(val))) {
        throw new Error(`"${labelFor(tok)}" has no value for this loan.`);
      }
      return Number(val);
    }
    if (isNumberToken(tok)) {
      next();
      return Number(tok);
    }
    if (OPERATOR_TOKENS.has(tok) || tok === ')' || tok === ',') {
      throw new Error(`A number or word is needed here, not "${labelFor(tok)}".`);
    }
    throw new Error(`"${tok}" is not a recognized part of a formula.`);
  }

  function parseTerm() {
    let val = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const rhs = parseFactor();
      if (op === '*') val *= rhs;
      else {
        if (rhs === 0) throw new Error('Formula divides by zero for this loan.');
        val /= rhs;
      }
    }
    return val;
  }

  function parseExpr() {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const rhs = parseTerm();
      val = op === '+' ? val + rhs : val - rhs;
    }
    return val;
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('Formula has extra content after the end.');
  return result;
}

// Public entry point — never throws. `rate` is passed in already as a decimal
// (2% -> 0.02); callers convert from the percentage the UI shows.
export function evaluateFormula(tokens, variables) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { error: 'Formula is empty.' };
  }
  try {
    const value = evaluateTokens(tokens, variables);
    if (!Number.isFinite(value)) return { error: 'Formula produced an invalid number for this loan.' };
    if (value < 0) return { error: 'Formula produced a negative amount, which is not allowed.' };
    return { value };
  } catch (err) {
    return { error: err.message || 'Could not evaluate this formula.' };
  }
}

// ── Grammar helpers used by FormulaBuilder to decide which chips are tappable next ──
//
// A "value" token completes an expression at the current position: a variable, a
// number, or a closing ')'. Everything below is derived from just two facts about the
// token stream: what the last token is, and — for comma/close-paren — a stack of open
// contexts (plain parens vs. a function's argument list, which needs exactly N args).

function isValueEnd(tok) {
  return tok !== undefined && (VARIABLE_TOKENS.has(tok) || isNumberToken(tok) || tok === ')');
}

// Clicking a function chip inserts BOTH the function token and its opening paren in one
// step (e.g. ['min', '(']), so the stack only ever needs to look for that pair together.
function computeOpenContexts(tokens) {
  const stack = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (FUNCTION_TOKENS.has(tok) && tokens[i + 1] === '(') {
      const fn = FORMULA_FUNCTIONS.find(f => f.token === tok);
      stack.push({ kind: 'func', arity: fn.arity, argsSeen: 0 });
      i += 2;
      continue;
    }
    if (tok === '(') { stack.push({ kind: 'paren' }); i++; continue; }
    if (tok === ')') { stack.pop(); i++; continue; }
    if (tok === ',') {
      const top = stack[stack.length - 1];
      if (top && top.kind === 'func') top.argsSeen++;
      i++;
      continue;
    }
    i++;
  }
  return stack;
}

// Used only for the Save gate (formula must be structurally finished — not mid-
// expression, not missing a closing bracket) — chip tapping itself is unrestricted.
export function isFormulaComplete(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return false;
  return computeOpenContexts(tokens).length === 0 && isValueEnd(tokens[tokens.length - 1]);
}
