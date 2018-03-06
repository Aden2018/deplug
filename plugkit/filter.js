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
        case 'CallExpression':
          if (!(node.callee.name || '').startsWith('__')) {
            return makeOp('()', node.callee, ...node.arguments)
          }
          return node
        default:
      }
    },
  })
}

let counter = 0
function symbolName (base) {
  counter += 1
  return `__$${base.replace(/[^0-9a-zA-Z]/g, '_')}_${counter}`
}

function processArrays (ast, globals) {
  return estraverse.replace(ast, {
    enter: (node) => {
      if (node.type === 'ArrayExpression') {
        if (node.elements.every((elem) =>
          elem.type === 'Literal' && typeof elem.value === 'number')) {
          const sym = symbolName('array')
          const literal = node.elements.map((elem) => elem.value).join(',')
          globals.push(`const ${sym} = [${literal}];`)
          return {
            'type': 'Identifier',
            'name': sym,
          }
        }
      }
    },
  })
}

function processIdentifiers (tokens, attrs, globals) {
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
    const token = identifiers.join('.')
    const sym = symbolName(token)
    globals.push(`const ${sym} = ${Token.get(token)};`)
    resolvedTokens.push(
      {
        type: 'Identifier',
        value: sym,
      }
    )
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

class FilterCompiler {
  constructor () {
    this[fields] = {
      macros: [],
      attrs: {},
    }
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

  transpile (filter, rawResult = false) {
    const { macros, attrs } = this[fields]
    if (!filter) {
      return {
        expression: '',
        globals: [],
      }
    }
    const pattern = new RegExp('(@)([^ ]+)(?: |$)', 'g')
    const str = filter.replace(pattern, (match, prefix, exp) => {
      for (const macro of macros) {
        const result = macro.func(exp)
        if (typeof result === 'string') {
          return result
        }
      }
      throw new Error(`unrecognized macro: @${exp}`)
    })
    const globals = []
    const tokens = processIdentifiers(esprima.tokenize(str), attrs, globals)
    const tree = esprima.parse(tokens.map((token) => token.value).join(' '))
    let ast =
      processArrays(processOperators(tree.body[0].expression), globals)
    if (!rawResult) {
      ast = makeValue(ast)
    }
    return {
      expression: escodegen.generate(ast),
      globals,
    }
  }

  link (code) {
    if (code.expression === '') {
      return ''
    }
    return runtime
      .replace('@@globals@@', code.globals.join('\n'))
      .replace('@@expression@@', code.expression)
  }

  build (prog) {
    const options = { displayErrors: true }
    if (prog === '') {
      return (() => true)
    }
    return vm.runInThisContext(prog, options)
  }

  compile (filter, opt = {}) {
    const options = Object.assign({
      rawResult: false,
      built: true,
    }, opt)
    const result = {
      filter,
      transpiled: this.transpile(filter, options.rawResult),
    }
    result.linked = this.link(result.transpiled)
    if (options.built) {
      result.built = this.build(result.linked)
    }
    return result
  }
}

module.exports = FilterCompiler
