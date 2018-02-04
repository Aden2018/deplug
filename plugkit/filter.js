const { Token } = require('./plugkit')
const estraverse = require('estraverse')
const esprima = require('esprima')
const escodegen = require('escodegen')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const fields = Symbol('fields')
const runtime = fs.readFileSync(path.join(__dirname, 'runtime.js'), 'utf8')
function makeValue (val) {
  return {
    type: 'CallExpression',
    callee: {
      type: 'Identifier',
      name: '__value',
    },
    arguments: [val],
  }
}

function makeOp (opcode, ...args) {
  return {
    type: 'CallExpression',
    callee: {
      type: 'Identifier',
      name: '__operator',
    },
    arguments: [{
      type: 'Literal',
      value: opcode,
    }].concat(args),
  }
}

function processOperators (ast) {
  return estraverse.replace(ast, {
    enter: (node) => {
      switch (node.type) {
        case 'BinaryExpression':
        case 'LogicalExpression':
          return makeOp(node.operator, node.left, node.right)
        case 'UnaryExpression':
          return makeOp(node.operator, node.argument)
        case 'ConditionalExpression':
          node.test = {
            type: 'UnaryExpression',
            operator: '!',
            argument: makeOp('!', node.test),
            prefix: true,
          }
          return node
        default:
      }
    },
  })
}

function processIdentifiers (tokens, attrs) {
  function resolve (identifiers, resolvedTokens) {
    resolvedTokens.push(
      {
        type: 'Identifier',
        value: '__resolve',
      },
      {
        type: 'Punctuator',
        value: '(',
      }
    )
    let index = identifiers.findIndex((id, pos) =>
      !(identifiers.slice(0, pos + 1).join('.') in attrs))
    if (index < 0) {
      index = identifiers.length
    }
    resolvedTokens.push(
      {
        type: 'Literal',
        value: Token.get(identifiers.slice(0, index).join('.')),
      }
    )
    for (const id of identifiers.slice(index)) {
      resolvedTokens.push(
        {
          type: 'Punctuator',
          value: ',',
        },
        {
          type: 'String',
          value: JSON.stringify(id),
        }
      )
    }
    resolvedTokens.push({
      type: 'Punctuator',
      value: ')',
    })
  }

  const resolvedTokens = []
  let identifiers = []
  for (const token of tokens) {
    if (token.type === 'Identifier') {
      identifiers.push(token.value)
    } else if (identifiers.length === 0 || token.value !== '.') {
      if (identifiers.length > 0) {
        resolve(identifiers, resolvedTokens)
        identifiers = []
      }
      resolvedTokens.push(token)
    }
  }
  if (identifiers.length > 0) {
    resolve(identifiers, resolvedTokens)
  }
  return resolvedTokens
}

class Filter {
  constructor () {
    this[fields] = {
      macros: [],
      attrs: {},
      macroPrefix: '@',
    }
  }

  get macroPrefix () {
    return this[fields].macroPrefix
  }

  set macroPrefix (val) {
    this[fields].macroPrefix = val
  }

  set macros (macros) {
    this[fields].macros = macros
  }

  get macros () {
    return this[fields].macros
  }

  set attrs (attrs) {
    this[fields].attrs = attrs
  }

  get attrs () {
    return this[fields].attrs
  }

  compile (filter) {
    const { macros, attrs, macroPrefix } = this[fields]
    if (!filter) {
      return ''
    }
    const pattern = new RegExp(`(${macroPrefix})([^ ]+)(?: |$)`, 'g')
    const str = filter.replace(pattern, (match, prefix, exp) => {
      for (const macro of macros) {
        const result = macro.func(exp)
        if (typeof result === 'string') {
          return result
        }
      }
      throw new Error(`unrecognized macro: ${prefix}${exp}`)
    })
    const tokens = processIdentifiers(esprima.tokenize(str), attrs)
    const tree = esprima.parse(tokens.map((token) => token.value).join(' '))
    const ast = makeValue(processOperators(tree.body[0].expression))
    return runtime.replace('@@@', escodegen.generate(ast))
  }

  compileFunction (filter) {
    const options = { displayErrors: true }
    if (filter.length === 0) {
      return (() => true)
    }
    return vm.runInThisContext(this.compile(filter), options)
  }
}

module.exports = Filter
