import Dialog from '../../lib/dialog'
import ExportDialog from './export-dialog'
import FilterSuggest from './filter-suggest'
import FrameHeader from './frame-header'
import FrameListView from './frame-list-view'
import PcapDialog from './pcap-dialog'
import ToolBar from './toolbar'
import m from 'mithril'
import path from 'path'
import { remote } from 'electron'
const { dialog } = remote
export default class TopView {
  constructor () {
    this.sess = null
    this.filtered = null
    this.displayFilter = ''
    this.suggestMaxCount = 6
    this.suggestEnabled = false
    this.suggestHint = ''
    this.suggestIndex = -1
    this.viewState = {
      capture: false,
      scrollLock: false,
      checkedFrames: new Set(),
    }
  }

  searchKeyPress (event) {
    switch (event.code) {
      case 'Enter':
        this.suggestIndex = -1
        this.suggestEnabled = false
        deplug.action.emit('core:filter:set', event.target.value.trim())
        break
      case 'ArrowDown':
        if (this.suggestEnabled) {
          deplug.action.emit('core:filter:suggest:next')
        }
        break
      case 'ArrowUp':
        if (this.suggestEnabled) {
          event.preventDefault()
          deplug.action.emit('core:filter:suggest:prev')
        }
        break
      default:
        this.suggestEnabled = true
    }
  }

  view () {
    this.viewState.counter = '0'
    if (this.sess) {
      this.viewState.counter = this.sess.filter.main
        ? `${this.sess.filter.main.frames} / ${this.sess.frame.frames}`
        : `${this.sess.frame.frames}`
    }
    return [
      m('header', [
        m('input', {
          type: 'text',
          placeholder: 'Display Filter',
          onkeydown: (event) => {
            this.searchKeyPress(event)
          },
          onkeyup: (event) => {
            this.suggestHint = event.target.value
          },
          onfocus: () => {
            this.suggestEnabled = true
          },
          onblur: () => {
            this.suggestEnabled = false
          },
          name: 'display-filter',
        }),
        m(FilterSuggest, {
          enabled: this.suggestEnabled,
          hint: this.suggestHint,
        }),
        m(ToolBar, {
          viewState: this.viewState,
          sess: this.sess,
        }),
        m(FrameHeader, {})
      ]),
      this.sess
        ? m(FrameListView, {
          sess: this.sess,
          viewState: this.viewState,
        })
        : m('nav')
    ]
  }

  oncreate () {
    if (deplug.argv.import) {
      const file = path.resolve(deplug.argv.import)
      const browserWindow = remote.getCurrentWindow()
      deplug.packages.once('updated', () => {
        deplug.session.create().then((sess) => {
          deplug.action.emit('core:session:created', sess)
          this.sess = sess
          sess.on('frame', () => {
            m.redraw()
          })
          sess.on('status', (stat) => {
            const progress = stat.importerProgress >= 1.0
              ? -1
              : stat.importerProgress
            browserWindow.setProgressBar(progress)
            this.viewState.capture = stat.capture
            m.redraw()
          })
          sess.on('filter', () => {
            m.redraw()
          })
          sess.importFile(file)
        })
      })
    } else {
      const pcapDialog = new Dialog(PcapDialog)
      pcapDialog.show({ cancelable: false }).then(async (ifs) => {
        const sess = await deplug.session.create(ifs)
        deplug.action.emit('core:session:created', sess)
        this.sess = sess
        sess.startPcap()
        sess.on('frame', () => {
          m.redraw()
        })
        sess.on('status', (stat) => {
          this.viewState.capture = stat.capture
          m.redraw()
        })
        sess.on('filter', () => {
          m.redraw()
        })
      })
    }
    const filterInput = document.querySelector('input[name=display-filter]')
    deplug.action.on('core:filter:suggest:hint-selected', (hint, enter) => {
      filterInput.value = hint
      filterInput.selectionStart = filterInput.value.length
      if (enter) {
        this.suggestIndex = -1
        this.suggestEnabled = false
        deplug.action.emit('core:filter:set', hint.trim())
      }
    })
    deplug.action.global.on('core:file:export', () => {
      const exportDialog = new Dialog(ExportDialog,
        {
          displayFilter: this.displayFilter,
          checkedFrames: this.viewState.checkedFrames,
        })
      exportDialog.show({ cancelable: true }).then(async (filter) => {
        const file = dialog.showSaveDialog(
          { filters: deplug.session.fileExtensions.exporter })
        if (typeof file !== 'undefined') {
          this.sess.exportFile(file, filter)
        }
      })
    })
    deplug.action.global.on('core:pcap:focus-display-filter', () => {
      document.querySelector('input[name=display-filter]').focus()
    })
    deplug.action.on('core:filter:set', (value) => {
      try {
        filterInput.value = value
        this.displayFilter = value
        this.sess.setDisplayFilter('main', value)
        if (value.length > 0) {
          const maxLength = deplug.config.get('_.filter.historyLength', 10)
          const history =
            [].concat(deplug.workspace.get('_.filter.history', []))
          history.push(value)
          const overflow = history.length - maxLength
          if (overflow > 0) {
            history.splice(0, overflow)
          }
          deplug.workspace.set('_.filter.history', history)
        }
        const filter = value.length > 0
          ? deplug.session.createFilterCompiler()
            .compile(value)
          : null
        deplug.action.emit('core:filter:updated', filter)
      } catch (err) {
        deplug.notify.show(
          err.message, {
            type: 'error',
            title: 'Filter Error',
          })
      }
    })
  }
}
