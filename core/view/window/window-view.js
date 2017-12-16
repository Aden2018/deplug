import { remote, ipcRenderer } from 'electron'
import Menu from './menu'
import Stack from './stack'
import { VSplitter } from '../../lib/splitter'
import m from 'mithril'
import path from 'path'

const { dialog } = remote
const windowId = remote.getCurrentWindow().id
export default class WindowView {
  constructor () {
    this.tabs = [
    {
      id: 'preference',
      name: 'Preferences',
      src: 'preference.htm',
      argv: deplug.argv,
      loading: true,
      system: true,
      icon: 'fa-cog',
    }, {
      id: 'log',
      name: 'Logs',
      src: 'log.htm',
      argv: deplug.argv,
      loading: true,
      system: true,
      icon: 'fa-book',
    }]
    this.activeTab = 'preference'
    this.counter = 1
  }

  createPcapTab () {
    const number = this.counter
    this.counter += 1
    const id = `pcap-${number}`
    this.tabs.unshift({
      id,
      name: `Pcap ${number}`,
      src: 'pcap.htm',
      argv: deplug.argv,
      loading: true,
    })
    this.activeTab = id
    m.redraw()
  }

  oncreate () {
    ipcRenderer.on('core:menu:action', (event, channel) => {
      document
        .querySelector('webview[active]')
        .getWebContents()
        .send(`${channel} #${windowId}`)
      remote
        .getCurrentWebContents()
        .send(`${channel} #${windowId}`)
    })
    deplug.action.global.on('core:tab:open-devtool', () => {
      document.querySelector('webview[active]').openDevTools()
    })
    deplug.action.global.on('core:tab:new-pcap', () => {
      this.createPcapTab()
    })
    deplug.action.global.on('core:file:import', () => {
      const files = dialog.showOpenDialog({
        properties: ['openFile'],
        filters: deplug.session.fileExtensions.importer,
      })
      if (typeof files !== 'undefined' && files.length > 0) {
        const [file] = files
        const id = `import-${file}`
        this.tabs.unshift({
          id,
          name: path.basename(file),
          src: 'pcap.htm',
          argv: deplug.argv.concat([`--import=${file}`]),
          loading: true,
        })
        this.activeTab = id
        m.redraw()
      }
    })
    this.createPcapTab()
  }

  view () {
    return [
      m(VSplitter, {
        left: Menu,
        right: Stack,
        parent: this,
        width: 180,
        workspace: '_.menuWidth',
      })
    ]
  }
}
