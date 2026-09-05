const tokenPattern = /[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]/g;
const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

const evaluateExpression = (expression, values) => {
  const source = String(expression || '').replace(/\s+/g, '');
  const tokens = source.match(tokenPattern) || [];
  if (!source || tokens.join('') !== source) throw new Error('Formula contains unsupported characters');

  const output = [];
  const operators = [];
  let previousType = 'operator';
  for (const token of tokens) {
    if (/^[A-Za-z_]/.test(token)) {
      if (!Object.prototype.hasOwnProperty.call(values, token)) throw new Error(`Unknown salary value: ${token}`);
      output.push(values[token]);
      previousType = 'value';
    } else if (/^\d/.test(token)) {
      output.push(Number(token));
      previousType = 'value';
    } else if (token === '(') {
      operators.push(token);
      previousType = 'operator';
    } else if (token === ')') {
      while (operators.length && operators.at(-1) !== '(') output.push(operators.pop());
      if (operators.pop() !== '(') throw new Error('Unbalanced formula parentheses');
      previousType = 'value';
    } else {
      if (token === '-' && previousType === 'operator') output.push(0);
      while (operators.length && operators.at(-1) !== '(' && precedence[operators.at(-1)] >= precedence[token]) {
        output.push(operators.pop());
      }
      operators.push(token);
      previousType = 'operator';
    }
  }
  while (operators.length) {
    const operator = operators.pop();
    if (operator === '(') throw new Error('Unbalanced formula parentheses');
    output.push(operator);
  }

  const stack = [];
  for (const token of output) {
    if (typeof token === 'number') {
      stack.push(token);
      continue;
    }
    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) throw new Error('Invalid salary formula');
    if (token === '+') stack.push(left + right);
    if (token === '-') stack.push(left - right);
    if (token === '*') stack.push(left * right);
    if (token === '/') stack.push(right === 0 ? 0 : left / right);
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) throw new Error('Invalid salary formula result');
  return stack[0];
};

export const executeSalaryRules = (rules, baseSalary) => {
  const values = { BASIC: Number(baseSalary) || 0 };
  const results = [];

  for (const rule of [...rules].filter((item) => item.active).sort((a, b) => a.sequence - b.sequence)) {
    let amount = 0;
    if (rule.category === 'BASIC') {
      amount = values.BASIC;
    } else if (rule.calculationMethod === 'FIXED') {
      amount = Number(rule.fixedAmount) || 0;
    } else if (rule.calculationMethod === 'PERCENTAGE') {
      amount = (Number(rule.percentage) || 0) * (values.BASIC || 0) / 100;
    } else if (rule.calculationMethod === 'FORMULA') {
      amount = evaluateExpression(rule.formula, values);
    }

    amount = Math.round(amount * 100) / 100;
    values[rule.code] = amount;
    results.push({
      code: rule.code,
      name: rule.name,
      category: rule.category,
      sequence: rule.sequence,
      amount
    });
  }

  const earnings = results.filter((rule) => ['BASIC', 'ALLOWANCE'].includes(rule.category));
  const deductions = results.filter((rule) => ['DEDUCTION', 'CONTRIBUTION'].includes(rule.category));
  const grossRule = results.find((rule) => rule.category === 'GROSS');
  const netRule = results.find((rule) => rule.category === 'NET');
  const grossSalary = grossRule?.amount ?? earnings.reduce((sum, rule) => sum + rule.amount, 0);
  const totalDeductions = deductions.reduce((sum, rule) => sum + rule.amount, 0);
  const netSalary = netRule?.amount ?? grossSalary - totalDeductions;

  return {
    results,
    basicSalary: values.BASIC,
    allowances: earnings.filter((rule) => rule.category === 'ALLOWANCE').reduce((sum, rule) => sum + rule.amount, 0),
    grossSalary: Math.round(grossSalary * 100) / 100,
    deductions: Math.round(totalDeductions * 100) / 100,
    taxes: deductions.filter((rule) => /tax/i.test(rule.code) || /tax/i.test(rule.name)).reduce((sum, rule) => sum + rule.amount, 0),
    netSalary: Math.round(netSalary * 100) / 100
  };
};
