import BaseComponent from './base'
import { CompositeDisposable } from 'disposables'
import jsonfile from 'jsonfile'
import objpath from 'object-path'
import path from 'path'
import promisify from 'es6-promisify'

const promiseReadFile = promisify(jsonfile.readFile)
async function readFile (filePath) {
    try {
      return await promiseReadFile(filePath)
    } catch (err) {
      return {}
    }
}

export default class TokenComponent extends BaseComponent {
  constructor (comp, dir) {
    super()
    this.tokenFiles =
      objpath.get(comp, 'files', []).map((file) => path.resolve(dir, file))
  }
  async load () {
    const tokenList = await Promise.all(this.tokenFiles.map(readFile))
    this.disposable = new CompositeDisposable(
      tokenList.map((tokens) => deplug.session.registerTokens(tokens)))
    return true
  }
  async unload () {
    if (this.disposable) {
      this.disposable.dispose()
      this.disposable = null
    }
    return true
  }
}
