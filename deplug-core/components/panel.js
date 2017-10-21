import Component from './base'
import GlobalChannel from '../global-channel'
import Panel from '../panel'
import objpath from 'object-path'
import path from 'path'
import roll from '../roll'

export default class PanelComponent extends Component {
  async load () {
    const name = objpath.get(this.comp, 'name', '')
    if (name === '') {
      throw new Error('name field required')
    }

    const slot = objpath.get(this.comp, 'slot', '')
    if (slot === '') {
      throw new Error('slot field required')
    }

    const less = objpath.get(this.comp, 'less', '')
    if (less !== '') {
      this.lessFile = path.join(this.rootDir, less)
    }

    const main = objpath.get(this.comp, 'main', '')
    if (main !== '') {
      const mainFile = path.join(this.rootDir, main)
      const func = await roll(mainFile, this.rootDir, this.localExtern)
      func({}, this.rootDir)
    }

    const root = objpath.get(this.comp, 'root', '')
    if (root === '') {
      throw new Error('root field required')
    }

    const rootFile = path.join(this.rootDir, root)
    const func = await roll(rootFile, this.rootDir, this.localExtern)
    const module = {}
    func(module)
    Panel.mount(name, slot, module.exports, this.lessFile)
  }

  async unload () {
    GlobalChannel.removeListener('core:theme:updated', this.updateTheme)
  }
}
