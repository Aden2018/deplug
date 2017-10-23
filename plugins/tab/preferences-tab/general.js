import {
  GlobalChannel,
  Profile,
  Theme
} from 'deplug'
import OptionView from './option-view'
import m from 'mithril'
export default class GeneralView {
  constructor() {
    this.themeId = Theme.currentId
  }
  view(vnode) {
    return [
      m('h1', ['General Settings ']),
      m('table', [
        m('tr', [m('td', ['Theme']), m('td', [
          m('select', {
            onchange: (event) => {
              const id = event.target.options[event.target.selectedIndex].value
              this.themeId = id
              GlobalChannel.emit('core:theme:set', id)
            }
          }, [
            Object.keys(Theme.registry).map((key) => {
              let theme = Theme.registry[key]
              return m('option', {
                selected: this.themeId === theme.id,
                value: theme.id
              }, [theme.name])
            })
          ])
        ])]),
        Profile.globalOptions.map((opt) => {
          return m('tr', [
            m('td', {
              'data-tooltip': `.${opt.id}`
            }, [opt.name]),
            m('td', [m(OptionView, {
              option: opt
            })])
          ])
        })
      ])
    ]
  }
}
