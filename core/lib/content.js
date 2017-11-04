import Deplug from './deplug'
import ThemeLoader from './theme-loader'
import m from 'mithril'
import path from 'path'
import { shell } from 'electron'

export default class Content {
  constructor (view, less) {
    this.view = view
    this.less = less
  }

  async load () {
    document.addEventListener('dragover', (event) => {
      event.preventDefault()
      return false
    }, false)

    document.addEventListener('drop', (event) => {
      event.preventDefault()
      return false
    }, false)

    document.addEventListener('click', (event) => {
      if (event.target.tagName === 'A') {
        event.preventDefault()
        shell.openExternal(event.target.href)
      }
    })

    const argv = JSON.parse(decodeURIComponent(location.search.substr(1)))
    Reflect.defineProperty(window, 'deplug', { value: new Deplug(argv) })

    const loader = new ThemeLoader(path.join(__dirname, 'theme.less'))
    await loader.load(path.join(__dirname, this.less), document.head)
    m.mount(document.body, this.view)
    await document.fonts.ready
  }
}
