import Installer from '@deplug/package-install'
import env from '../../lib/env'
import m from 'mithril'
import path from 'path'
import { shell } from 'electron'
export default class Plugin {
  view () {
    return [
      m('h1', ['Install']),
      m('div', deplug.registry.packages.map((pkg) => {
        const installedPkg = deplug.packages.get(pkg.name)
        return m('section', { class: 'package' }, [
          m('h4', [
            pkg.name,
            m('span', { class: 'schema-path' },
            [pkg.version])
          ]),
          m('p', [pkg.description]),
          m('span', { class: 'button-box' }, [
            m('input', {
              type: 'button',
              value: 'Open Website',
              style: {
                display: pkg.homepage
                  ? 'block'
                  : 'none',
              },
              onclick: () => {
                shell.openExternal(pkg.homepage)
              },
            }),
            m('input', {
              type: 'button',
              value: 'Install',
              style: {
                display: installedPkg
                  ? 'none'
                  : 'block',
              },
              onclick: () => {
                this.install(pkg)
              },
            }),
            m('input', {
              type: 'button',
              value: 'Uninstall',
              style: {
                display: installedPkg
                  ? 'block'
                  : 'none',
              },
            })
          ])
        ])
      }))
    ]
  }

  oncreate () {
    deplug.registry.on('updated', () => {
      m.redraw()
    })
    deplug.registry.update()
  }

  async install (pkg) {
    const shortName = pkg.name.replace(/@\w+\//, '')
    const installer = new Installer({
      dir: path.join(env.userPackagePath, shortName),
      url: pkg.archive,
      version: env.deplug.devDependencies.negatron,
      noPrebuilt: deplug.config.get('_.noPrebuilt'),
    })
    try {
      await installer.install()
      deplug.notify.show(
        `package: ${shortName}`, {
          type: 'success',
          title: 'Successfully installed',
        })
    } catch (err) {
      deplug.notify.show(
        m('section', [
          m('p', [`${err.message}`]),
          m('p', [`See ${installer.logFile} for details.`])
        ]), {
          type: 'error',
          title: 'Installation failed',
        })
    }
    deplug.packages.update()
  }
}
