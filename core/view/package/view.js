import { el, setAttr } from 'redom'
import DetailView from './detail'
import m from 'mithril'

export default class Hello {
  constructor () {
    this.mode = 'local'
    this.selectedLocalPackage = ''
    this.selectedRegistryPackage = ''
    this.selectedPackage = null

    this.el = el('nav',
      el('div.mode-selector',
        this.localButton = el('button', 'Local'),
        this.registryButton = el('button', 'Registry')
      )
    )
  }

  onmount () {
    deplug.packages.on('updated', () => {
      this.update()
    })
    deplug.registry.on('updated', () => {
      this.update()
    })
    deplug.registry.update()
  }

  update () {
    if (deplug.packages.list.map((pkg) => pkg.data.name)
      .indexOf(this.selectedLocalPackage) < 0) {
      if (deplug.packages.list.length > 0) {
        this.selectedLocalPackage = deplug.packages.list[0].data.name
      } else {
        this.selectedLocalPackage = ''
      }
    }
    if (deplug.registry.packages.map((pkg) => pkg.data.name)
      .indexOf(this.selectedRegistryPackage) < 0) {
      if (deplug.registry.packages.length > 0) {
        this.selectedRegistryPackage = deplug.registry.packages[0].data.name
      } else {
        this.selectedRegistryPackage = ''
      }
    }
    this.selectedPackage = null
    if (this.mode === 'local') {
      this.selectedPackage = deplug.packages.list.find((pkg) =>
        pkg.data.name === this.selectedLocalPackage) || null
    } else {
      this.selectedPackage = deplug.registry.packages.find((pkg) =>
        pkg.data.name === this.selectedRegistryPackage) || null
    }
    if (this.selectedPackage !== null) {
      const installedPkg = deplug.packages.get(this.selectedPackage.data.name)
      this.selectedPackage = installedPkg || this.selectedPackage
    }

    setAttr(this.localButton, { checked: this.mode !== 'local' })
  }
}

class PackageView {
  constructor () {
    this.mode = 'local'
    this.selectedLocalPackage = ''
    this.selectedRegistryPackage = ''
  }

  oncreate () {
    deplug.packages.on('updated', () => {
      m.redraw()
    })
    deplug.registry.on('updated', () => {
      m.redraw()
    })
    deplug.registry.update()
  }

  view () {
    if (deplug.packages.list.map((pkg) => pkg.data.name)
      .indexOf(this.selectedLocalPackage) < 0) {
      if (deplug.packages.list.length > 0) {
        this.selectedLocalPackage = deplug.packages.list[0].data.name
      } else {
        this.selectedLocalPackage = ''
      }
    }
    if (deplug.registry.packages.map((pkg) => pkg.data.name)
      .indexOf(this.selectedRegistryPackage) < 0) {
      if (deplug.registry.packages.length > 0) {
        this.selectedRegistryPackage = deplug.registry.packages[0].data.name
      } else {
        this.selectedRegistryPackage = ''
      }
    }
    let selectedPackage = null
    if (this.mode === 'local') {
      selectedPackage = deplug.packages.list.find((pkg) =>
        pkg.data.name === this.selectedLocalPackage) || null
    } else {
      selectedPackage = deplug.registry.packages.find((pkg) =>
        pkg.data.name === this.selectedRegistryPackage) || null
    }
    if (selectedPackage !== null) {
      const installedPkg = deplug.packages.get(selectedPackage.data.name)
      selectedPackage = installedPkg || selectedPackage
    }
    return [
      m('nav', [
        m('div', { class: 'mode-selector' }, [
          m('button', {
            active: this.mode === 'local',
            onclick: () => {
              this.mode = 'local'
            },
          }, ['Local']),
          m('button', {
            active: this.mode === 'registry',
            onclick: () => {
              this.mode = 'registry'
            },
          }, ['Registry'])
        ]),
        m('div', {
          class: 'local-packages',
          style: {
            display: this.mode === 'local'
              ? 'block'
              : 'none',
          },
        }, [
          m('ul', deplug.packages.list.map((pkg) =>
            m('li', [
              m('a', {
                active: this.selectedLocalPackage === pkg.data.name,
                onclick: () => {
                  this.selectedLocalPackage = pkg.data.name
                },
              }, [
                m('h4', { disabled: pkg.disabled === true }, [pkg.data.name]),
                m('span', [pkg.data.description])
              ])])))
        ]),
        m('div', {
          class: 'registry-packages',
          style: {
            display: this.mode === 'registry'
              ? 'block'
              : 'none',
          },
        }, [
          m('ul', deplug.registry.packages.map((pkg) =>
            m('li', [
              m('a', {
                active: this.selectedRegistryPackage === pkg.data.name,
                onclick: () => {
                  this.selectedRegistryPackage = pkg.data.name
                },
              }, [
                m('h4', [pkg.data.name]),
                m('span', [pkg.data.description])
              ])])))
        ])
      ]),
      m('main', [m(DetailView, { pkg: selectedPackage })]),
      m('div', { class: 'notification' })
    ]
  }
}
