import { Component, wire } from 'hyperhtml'
import Installer from '../../lib/package-install'
import env from '../../lib/env'
import path from 'path'

let installerCallback = null
async function install (pkg) {
  const shortName = pkg.id
  const installer = new Installer()
  installer.rustpath = deplug.config.get('_.package.rustpath', '')
  installer.on('output', (chunk) => {
    if (installerCallback !== null) {
      installerCallback(chunk)
    }
  })
  try {
    await installer.install(
      path.join(env.userPackagePath, shortName), pkg.archive)
    deplug.notify.show(
      `package: ${shortName}`, {
        type: 'success',
        title: 'Successfully installed',
      })
  } catch (err) {
    deplug.notify.show(
      err.message, {
        type: 'error',
        title: 'Installation failed',
        ttl: 0,
      })
  }
  deplug.packages.update()
}

class ButtonView extends Component {
  constructor (pkg) {
    super()
    this.pkg = pkg
  }

  render () {
    if (this.pkg.archive) {
      return this.archive()
    }
    if (this.pkg.removal) {
      return this.removed()
    }
    return this.installed()
  }

  archive () {
    return wire()`
    <span class="button-box">
      <input 
        type="button" 
        value="Install"
        onclick=${() => {
    install(this.pkg)
  }}
        >
      </input>
    </span>`
  }

  removed () {
    return wire()`
    <p>
    This package will be removed on the next startup.
    </p>
    <span class="button-box">
      <input 
        type="button" 
        value="Undo"
        onclick=${() => {
    deplug.packages.setUninstallFlag(this.pkg.id, false)
  }}
      >
      </input>
    </span>`
  }

  installed () {
    return wire()`
    <span class="button-box">
      <input 
        type="button" 
        value=${this.pkg.disabled
    ? 'Enable'
    : 'Disable'}
        onclick=${() => {
    if (this.pkg.disabled) {
      deplug.packages.enable(this.pkg.id)
    } else {
      deplug.packages.disable(this.pkg.id)
    }
  }}
      >
      </input>
      <input 
        type="button" 
        value="Uninstall"
        style=${{
    display: this.pkg.builtin
      ? 'none'
      : 'block',
  }}
        onclick=${() => {
    deplug.packages.setUninstallFlag(this.pkg.id, true)
  }}
      >
      </input>
    </span>`
  }
}

export default class DetailView extends Component {
  get defaultState () {
    return {
      pkg: null,
      output: {},
    }
  }

  setPackage (pkg) {
    this.setState({ pkg })
    installerCallback = (chunk) => {
      this.setState({
        output: Object.assign(this.state.output,
          { [pkg.id]: (this.state.output[pkg.id] || '') + chunk }),
      })
    }
  }

  render () {
    return this.html`
    <article>
      ${this.state.pkg
    ? this.detail()
    : this.nopkg()}
    </article>
    `
  }

  nopkg () {
    return wire()`<p>No package selected</p>`
  }

  detail () {
    const { pkg } = this.state
    const config = Object.entries(deplug.config.schema)
      .filter(([id]) => id.startsWith(`${pkg.id}.`))
    return wire()`<h1
      disabled=${pkg.disabled}
    >
      ${pkg.data.name}
      <span class="version">${pkg.data.version}</span>
    </h1>
    <p>${pkg.data.description}</p>
    ${new ButtonView(pkg)}
    <p>
      ${config.map(([schema]) => wire()`
        <section>
          <h4>${schema.title}</h4>
        </section>`)}
    </p>
    <pre class="output">
      ${this.state.output[pkg.id]}
    </pre>`
  }
}
