import { EventEmitter } from 'events'
import config from './config'
import fetch from 'node-fetch'
import objpath from 'object-path'
import semver from 'semver'
import yaml from 'js-yaml'

function promiseFilter (proms, errorCb) {
  if (proms.length === 0) {
    return Promise.resolve([])
  }
  return new Promise((res) => {
    let count = proms.length
    const filtered = []
    function update (result) {
      if (arguments.length > 0) {
        filtered.push(result)
      }
      count -= 1
      if (count === 0) {
        res(filtered)
      }
    }

    for (const prom of proms) {
      prom.then((result) => {
        update(result)
      }).catch((err) => {
        update()
        if (errorCb) {
          errorCb(err)
        }
      })
    }
  })
}

async function resolveEntry (entry) {
  if (entry.source === 'npm') {
    const encodedName = entry.name.replace('/', '%2F')
    const url = `https://registry.npmjs.org/${encodedName}`
    const meta = await fetch(url)
      .then((res) => res.text())
      .then((data) => JSON.parse(data))

    const vers = Object.keys(meta.versions)
    vers.sort(semver.rcompare)

    const pkg = meta.versions[vers[0]]
    const engineVersion = objpath.get(pkg, 'engines.deplug', null)
    if (engineVersion === null) {
      throw new Error('Incompatible package')
    }
    if (!semver.satisfies(config.deplug.version, engineVersion)) {
      throw new Error('Deplug version mismatch')
    }
    const tarball = objpath.get(pkg, 'dist.tarball', null)
    if (tarball === null) {
      throw new Error('Tarball not found')
    }

    return {
      name: meta.name,
      description: meta.description,
      timestamp: new Date(meta.time.modified),
      version: vers[0],
      archive: tarball,
      url: entry.url || null,
    }
  }
  throw new Error('Unsupported source type')
}

async function crawlRegistries (registries, errorCb) {
  const tasks = []
  for (const reg of registries) {
    tasks.push(
      fetch(reg)
        .then((res) => res.text())
        .then((data) => Object.values(yaml.safeLoad(data)))
        .then((entries) => promiseFilter(entries.map(resolveEntry), errorCb))
    )
  }
  const data = await promiseFilter(tasks, errorCb)
  return data.reduce((lhs, rhs) => lhs.concat(rhs))
}

const fields = Symbol('fields')
export default class PluginRegistry extends EventEmitter {
  constructor (registries) {
    super()
    this[fields] = {
      registries,
      updating: false,
      plugins: [],
    }
    this.update()
  }

  update () {
    if (this[fields].updating) {
      return
    }
    this[fields].updating = true
    crawlRegistries(this[fields].registries, (err) => {
      this.emit('error', err)
    }).then((plugins) => {
      this[fields].plugins = plugins
      this[fields].updating = false
      this.emit('updated')
    })
  }
}
