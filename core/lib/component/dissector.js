import BaseComponent from './base'
import { CompositeDisposable } from 'disposables'
import exists from 'file-exists'
import glob from 'glob'
import objpath from 'object-path'
import path from 'path'

export default class DissectorComponent extends BaseComponent {
  constructor (comp, dir) {
    super()
    const file = objpath.get(comp, 'main', '')
    if (!file) {
      throw new Error('main field required')
    }

    const searchPaths = [
      '.',
      'build/Debug',
      'build/Release'
    ]
    for (const spath of searchPaths) {
      const absolute = path.join(dir, spath, file)
      if (exists.sync(absolute)) {
        this.mainFile = absolute
        break
      }
    }
    if (!this.mainFile) {
      const libs = glob.sync(
        `crates/${file}/target/{debug,release}/*.{dll,so,dylib}`,
        { cwd: dir })
      if (libs.length > 0) {
        this.mainFile = path.join(dir, libs[0])
      }
    }
    if (!this.mainFile) {
      throw new Error(`could not resolve ${file} in ${dir}`)
    }

    this.linkLayers = objpath.get(comp, 'linkLayers', [])

    this.samples = objpath.get(comp, 'samples', [])
      .map((sample) => ({
        pcap: path.join(dir, sample.pcap),
        assert: path.join(dir, sample.assert),
      }))

    switch (comp.type) {
      case 'core:dissector:packet':
        this.type = 'packet'
        break
      case 'core:dissector:stream':
        this.type = 'stream'
        break
      default:
        throw new Error(`unknown dissector type: ${comp.type}`)
    }
  }
  async load () {
    const ext = path.extname(this.mainFile)
    switch (ext) {
      case '.dll':
      case '.so':
      case '.dylib':
      case '.node':
        this.disposable = deplug.session.registerDissector({
          type: this.type,
          main: this.mainFile.replace(/\bapp\.asar\b/, 'app.asar.unpacked'),
        })
        break
      case '.js':
        this.disposable = deplug.session.registerDissector({
          type: this.type,
          main: this.mainFile,
        })
        break
      default:
        throw new Error(`unknown extension type: ${ext}`)
    }
    for (const layer of this.linkLayers) {
      this.disposable = new CompositeDisposable([
        this.disposable,
        deplug.session.registerLinkLayer(layer)
      ])
    }
    for (const sample of this.samples) {
      this.disposable = new CompositeDisposable([
        this.disposable,
        deplug.session.registerSample(sample)
      ])
    }
    return false
  }
  async unload () {
    if (this.disposable) {
      this.disposable.dispose()
      this.disposable = null
      return false
    }
    return true
  }
}
