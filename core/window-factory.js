import { app, BrowserWindow, webContents } from 'electron'
import Config from './config'
import env from './env'
import path from 'path'
import url from 'url'

app.on('window-all-closed', () => {
  for (const wc of webContents.getAllWebContents()) {
    wc.closeDevTools()
  }
  app.quit()
})

export default class WindowFactory {
  static create (argv, profile = 'default') {
    const conf = new Config(profile, 'layout')
    const size = conf.get('_.window.size')
    const options = {
      width: size[0],
      height: size[1],
      show: false,
      titleBarStyle: conf.get('_.window.titleBarStyle'),
      vibrancy: conf.get('_.window.vibrancy'),
    }
    if (process.platform === 'linux') {
      options.icon = env.linuxIconPath
    }
    const mainWindow = new BrowserWindow(options)

    const localUrl = url.format({
      protocol: 'file',
      slashes: true,
      pathname: path.join(__dirname, 'index.htm'),
    })
    mainWindow.loadURL(localUrl)

    const contents = mainWindow.webContents
    contents.on('crashed', () => mainWindow.reload())
    contents.on('unresponsive', () => mainWindow.reload())
    contents.on('dom-ready', () => {
      const jsonArgv =
        JSON.stringify(argv.concat([`--profile=${profile}`]))
      const script = `require("./window.main.js")(${jsonArgv})`
      contents.executeJavaScript(script)
    })

    return mainWindow
  }
}
