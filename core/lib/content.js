import { shell, webFrame } from 'electron'
import Deplug from './deplug'
import Style from './style'
import m from 'mithril'
import { mount } from 'redom'
import path from 'path'

export default class Content {
  constructor (view, less, argv = [], redom = false) {
    this.view = view
    this.less = less
    this.argv = argv
    this.redom = redom
  }

  async load () {
    webFrame.setZoomLevelLimits(1, 1)

    document.addEventListener('dragover', (event) => {
      event.preventDefault()
      return false
    }, false)

    document.addEventListener('drop', (event) => {
      event.preventDefault()
      return false
    }, false)

    document.addEventListener('click', (event) => {
      const isUrl = (/^https?:\/\//).test(event.target.href)
      if (event.target.tagName === 'A' && isUrl) {
        event.preventDefault()
        shell.openExternal(event.target.href)
      }
    })

    const argv = JSON.parse(decodeURIComponent(location.search.substr(1)))
      .concat(this.argv)
    Reflect.defineProperty(window, 'deplug', { value: new Deplug(argv) })

    const loader = new Style()
    await loader.applyLess(path.join(__dirname, this.less))
    if (this.redom) {
      const Class = this.view
      mount(document.body, new Class())
    } else {
      m.mount(document.body, this.view)
    }
    await document.fonts.ready
  }
}
