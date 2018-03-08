import { Component, wire } from 'hyperhtml'
import DetailView from './detail'

export default class PackageView extends Component {
  constructor () {
    super()
    this.detailView = new DetailView()
    deplug.packages.on('updated', () => {
      this.setState({ localPackages: deplug.packages.list })
    })
    deplug.registry.on('updated', () => {
      this.setState({ registryPackages: deplug.registry.packages })
    })
    deplug.registry.update()
  }

  get defaultState () {
    return {
      mode: 'local',
      localPackages: [],
      registryPackages: [],
      selectedLocalPackage: '',
      selectedRegistryPackage: '',
    }
  }

  local () {
    this.setState({ mode: 'local' })
  }

  registry () {
    this.setState({ mode: 'registry' })
  }

  update () {
    if (deplug.packages.list.map((pkg) => pkg.id)
      .indexOf(this.state.selectedLocalPackage) < 0) {
      if (deplug.packages.list.length > 0) {
        this.state.selectedLocalPackage = deplug.packages.list[0].id
      } else {
        this.state.selectedLocalPackage = ''
      }
    }
    if (deplug.registry.packages.map((pkg) => pkg.id)
      .indexOf(this.state.selectedRegistryPackage) < 0) {
      if (deplug.registry.packages.length > 0) {
        this.state.selectedRegistryPackage = deplug.registry.packages[0].id
      } else {
        this.state.selectedRegistryPackage = ''
      }
    }
    let selectedPackage = null
    if (this.state.mode === 'local') {
      selectedPackage = deplug.packages.list.find((pkg) =>
        pkg.id === this.state.selectedLocalPackage) || null
    } else {
      selectedPackage = deplug.registry.packages.find((pkg) =>
        pkg.id === this.state.selectedRegistryPackage) || null
    }
    if (selectedPackage !== null) {
      const installedPkg = deplug.packages.get(selectedPackage.id)
      selectedPackage = installedPkg || selectedPackage
    }
    this.detailView.setPackage(selectedPackage)
  }

  render () {
    this.update()
    return this.html`
      <nav>
        <div class="mode-selector">
          <button 
            data-call=local onclick=${this}
            active=${this.state.mode === 'local'}
          >Local</button>
          <button 
            data-call=registry onclick=${this}
            active=${this.state.mode === 'registry'}
          >Registry</button>
        </div>
        <div 
          class="local-packages"
          active=${this.state.mode === 'local'}>
          <ul>
            ${this.state.localPackages.map((pkg) => wire(pkg)`<li>
                <a
                  active=${this.state.selectedLocalPackage === pkg.id}
                  onclick=${() => {
    this.setState({ selectedLocalPackage: pkg.id })
  }}>
                  <h4>${pkg.data.name}</h4>
                  <span>${pkg.data.description}</span>
                </a>
              </li>`)}
          </ul>
        </div>
        <div 
          class="registry-packages"
          active=${this.state.mode === 'registry'}>
          <ul>
            ${this.state.registryPackages.map((pkg) => wire(pkg)`<li>
                <a
                  active=${this.state.selectedRegistryPackage === pkg.id}
                  onclick=${() => {
    this.setState({ selectedRegistryPackage: pkg.id })
  }}>
                  <h4>${pkg.data.name}</h4>
                  <span>${pkg.data.description}</span>
                </a>
              </li>`)}
          </ul>
        </div>
      </nav>
      <main>${this.detailView}</main>
      <div class="notification"></div>`
  }
}
