import WebView from '../lib/webview'
import m from 'mithril'
import path from 'path'
import { remote } from 'electron'

const { dialog } = remote
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

  oncreate () {
    deplug.action.global.on('core:tab:open-devtool', () => {
      document.querySelector('webview[active]').openDevTools()
    })
    deplug.action.global.on('core:tab:new-pcap', () => {
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
  }

  view () {
    return [
      m('nav', this.tabs.map((tab) => m('ul', [
          m('li', [
            m('a', {
              onclick: () => {
               this.activeTab = tab.id
              },
              active: this.activeTab === tab.id,
            }, [
              m('i', { class: `fa ${tab.icon}` }),
              ' ',
              tab.name,
              m('i', {
                class: 'fa fa-close close-button',
                style: {
                  display: tab.system
                    ? 'none'
                    : 'inline-block',
                },
                onclick: () => {
                  this.tabs = this.tabs.filter((item) => tab.id !== item.id)
                  m.redraw()
                },
              })
            ])
          ])
        ]))),
      m('main', this.tabs.map((tab) => m(WebView, {
        tab,
        key: tab.id,
        active: this.activeTab === tab.id,
      })))
    ]
  }
}
