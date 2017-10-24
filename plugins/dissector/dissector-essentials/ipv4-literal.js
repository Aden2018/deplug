import esprima from 'esprima'
import estraverse from 'estraverse'
import objpath from 'object-path'

let counter = 0
export default function (ast) {
  return estraverse.replace(ast, {
    enter: (node) => {
      if (node.type === 'TemplateLiteral') {
        const value = objpath.get(node, 'quasis.0.value.raw', '')
        const addr = value.split('.')
          .map((section) => Number.parseInt(section, 10))
        if (addr.length === 4 &&
            addr.every((section) => section >= 0 && section < 256)) {
          const name = `this.$_val_ipv4_${counter}`
          counter += 1
          const tree = esprima.parse(`(${name} = ${name} ||
            new Uint8Array(${JSON.stringify(addr)}))`)
          return tree.body[0].expression
        }
      }
      return null
    },
  })
}
