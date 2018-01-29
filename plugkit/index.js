const kit = require('./plugkit')
const fs = require('fs')
const promisify = require('es6-promisify')
const EventEmitter = require('events')
const FilterCompiler = require('./filter')
const InspectorServer = require('./inspector')

const fields = Symbol('fields')
const promiseReadFile = promisify(fs.readFile)
class Session extends EventEmitter {
  constructor (sess, options) {
    super()
    this[fields] = Object.assign({
      sess,
      filterCompiler: new FilterCompiler(),
    }, options)

    if (options.enableDebugSession) {
      this[fields].inspector = new InspectorServer(sess)
    }

    const filterCompiler = new FilterCompiler()
    filterCompiler.macroPrefix = options.macroPrefix
    for (const macro of options.macros) {
      filterCompiler.registerMacro(macro.func)
    }
    for (const trans of options.transforms) {
      switch (trans.type) {
        case 'string':
          filterCompiler.registerStringTransform(trans.func)
          break
        case 'token':
          filterCompiler.registerTokenTransform(trans.func)
          break
        case 'ast':
          filterCompiler.registerAstTransform(trans.func)
          break
        case 'template':
          filterCompiler.registerTemplateTransform(trans.func)
          break
        default:
          throw new Error(`unknown transform type: ${trans.type}`)
      }
    }
    this[fields].filterCompiler = filterCompiler

    this.status = { capture: false }
    this.filter = {}
    this.frame = { frames: 0 }

    sess.setStatusCallback((status) => {
      this.status = status
      this.emit('status', status)
    })
    sess.setFilterCallback((filter) => {
      this.filter = filter
      this.emit('filter', filter)
    })
    sess.setFrameCallback((frame) => {
      this.frame = frame
      this.emit('frame', frame)
    })
    sess.setLoggerCallback((log) => {
      this.emit('log', log)
    })
  }

  importFile (file) {
    return this[fields].sess.importFile(file)
  }

  exportFile (file, filter = '') {
    const { filterCompiler } = this[fields]
    const body = filterCompiler.compile(filter)
    return this[fields].sess.exportFile(file, body)
  }

  get networkInterface () {
    return this[fields].sess.networkInterface
  }

  get promiscuous () {
    return this[fields].sess.promiscuous
  }

  get snaplen () {
    return this[fields].sess.snaplen
  }

  get id () {
    return this[fields].sess.id
  }

  get options () {
    return this[fields].sess.options
  }

  get inspectorSessions () {
    const { inspector } = this[fields]
    if (inspector) {
      return inspector.sessions
    }
    return null
  }

  startPcap () {
    return this[fields].sess.startPcap()
  }

  stopPcap () {
    return this[fields].sess.stopPcap()
  }

  destroy () {
    return this[fields].sess.destroy()
  }

  getFilteredFrames (name, offset, length) {
    return this[fields].sess.getFilteredFrames(name, offset, length)
  }

  getFrames (offset, length) {
    const { sess } = this[fields]
    return sess.getFrames(offset, length)
  }

  setDisplayFilter (name, filter) {
    const { filterCompiler } = this[fields]
    const body = filterCompiler.compile(filter)
    return this[fields].sess.setDisplayFilter(name, body)
  }

  createFilter (filter) {
    const { filterCompiler } = this[fields]
    return {
      expression: filter,
      test: filterCompiler.compileFunction(filter),
    }
  }
}

class SessionFactory extends kit.SessionFactory {
  constructor () {
    super()
    this[fields] = {
      tasks: [],
      linkLayers: [],
      transforms: [],
      macros: [],
      attributes: {},
      enableDebugSession: false,
      macroPrefix: '@',
    }
  }

  create () {
    return Promise.all(this[fields].tasks).then(() => {
      for (const link of this[fields].linkLayers) {
        super.registerLinkLayer(link.link, link.id, link.name)
      }
      return new Session(super.create(), this[fields])
    })
  }

  get macroPrefix () {
    return this[fields].macroPrefix
  }

  set macroPrefix (val) {
    this[fields].macroPrefix = val
  }

  registerLinkLayer (layer) {
    this[fields].linkLayers.push(layer)
  }

  registerFilterTransform (trans) {
    this[fields].transforms.push(trans)
  }

  registerFilterMacro (macro) {
    this[fields].macros.push(macro)
  }

  registerImporter (importer) {
    super.registerImporter(importer)
  }

  registerExporter (exporter) {
    super.registerExporter(exporter)
  }

  registerAttributes (attrs) {
    this[fields].attributes = Object.assign(this[fields].attributes, attrs)
  }

  get enableDebugSession () {
    return this[fields].enableDebugSession
  }

  set enableDebugSession (flag) {
    this[fields].enableDebugSession = flag
  }

  registerDissector (dissector) {
    if (dissector.main.endsWith('.js')) {
      const task = promiseReadFile(dissector.main, 'utf8')
        .then((script) => {
          const func = `(function(module){${script}})`
          super.registerDissector(func, dissector.type)
          return Promise.resolve()
        })
      this[fields].tasks.push(task)
    } else {
      super.registerDissector(dissector.main, dissector.type)
    }
  }
}

module.exports = {
  Layer: kit.Layer,
  Pcap: kit.Pcap,
  SessionFactory,
  Token: kit.Token,
  Reader: kit.Reader,
  StreamReader: kit.StreamReader,
  Testing: kit.Testing,
}
