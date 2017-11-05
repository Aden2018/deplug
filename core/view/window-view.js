import WebView from '../lib/webview'
import m from 'mithril'

export default class WindowView {
  constructor () {
    this.tabs = [{
      id: 'preference',
      src: 'preference.htm',
      argv: deplug.argv,
      loading: true,
    },
    {
      id: 'pcap-1',
      src: 'pcap.htm',
      argv: deplug.argv,
      loading: true,
    }]
    this.activeTab = 'preference'
  }

  view () {
    return [
      m('nav', [
        m('ul', [
          m('li', [
            m('a', {
              onclick: () => {
               this.activeTab = 'pcap-1'
              },
              active: this.activeTab === 'pcap-1',
            }, ['Live Capture 1'])
          ])
        ]),
        m('ul', [
          m('li', [m('a', {
             onclick: () => {
             this.activeTab = 'preference'
            },
            active: this.activeTab === 'preference',
          }, [m('i', { class: 'fa fa-cog' }), ' ', 'Preferences'])])
        ])
      ]),
      m('main', this.tabs.map((tab) => m(WebView, {
        tab,
        active: this.activeTab === tab.id,
      })))
    ]
  }
}
