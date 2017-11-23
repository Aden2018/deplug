import { ipcRenderer, ipcMain } from 'electron'
import Cache from './cache'
import Config from './config'
import KeyBind from './keybind'
import Logger from './logger'
import Menu from './menu'
import Notification from './notification'
import PackageManager from './package-manager'
import PackageRegistry from './package-registry'
import Session from './session'
import minimist from 'minimist'

export default class Deplug {
  constructor (argv) {
    const options = minimist(argv)
    const components = options.components || ''
    const config = new Config(options.profile, 'config')
    this.config = config
    this.layout = new Config(options.profile, 'layout')
    this.keybind = new KeyBind(options.profile)
    this.packages = new PackageManager(config, components.split(','))
    this.registry = new PackageRegistry(options.profile, config)
    this.session = new Session()
    this.menu = new Menu()
    this.notify = new Notification()
    this.logger = new Logger(config)
    this.cache = new Cache(options.profile)
    this.action = ipcRenderer || ipcMain
    this.argv = argv

    this.registry.on('error', (err) => {
      this.logger.warn(err)
    })

    Object.freeze(this)
  }
}
