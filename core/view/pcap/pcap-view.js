import Dialog from '../../lib/dialog'
import PcapDetailView from './detail'
import PcapDialog from './dialog'
import PcapToolView from './tool'
import m from 'mithril'
import path from 'path'
import { remote } from 'electron'
const { dialog } = remote
class FrameView {
  view (vnode) {
    if (!this.frame) {
      const { sess, key } = vnode.attrs;
      [this.frame] = sess.getFrames(key, 1)
    }
    if (!this.frame) {
      return m('div')
    }
    const { id } = this.frame.primaryLayer
    const renderer = deplug.session.layerRenderer(id) || 'p'
    return m('div', {
      class: 'frame',
      style: vnode.attrs.style,
      'data-layer': this.frame.primaryLayer.tags.join(' '),
      onclick: () => {
        deplug.action.emit('core:frame:selected', [this.frame])
      },
    }, [
      m('div', { class: 'header' }, [
        m('span', [deplug.session.token(id).name]),
        m('span', { class: 'right' }, [`${this.frame.length} bytes`])
      ]),
      m('div', { class: 'content' }, [
        m(renderer, { layer: this.frame.primaryLayer })
      ])
    ])
  }
}

class FrameListView {
  constructor () {
    this.itemHeight = 60
    this.height = 0
    this.scrollTop = 0
    this.prevFrames = 0
  }

  view (vnode) {
    const { frame, filter } = vnode.attrs.sess
    let { frames } = frame
    if (filter.main) {
      frames = filter.main.frames
    }
    const visibleItems = Math.min(
      Math.floor(this.height / this.itemHeight) + 2, frames)
    const startIndex = Math.floor(this.scrollTop / this.itemHeight)
    const listStyle = { height: `${frames * this.itemHeight}px` }

    const filteredFrames =
      vnode.attrs.sess.getFilteredFrames('main', startIndex, visibleItems)

    const items = []
    for (let index = 0; index < visibleItems; index += 1) {
      const seq = (filter.main)
        ? filteredFrames[index] - 1
        : index + startIndex
      const itemStyle = {
        height: `${this.itemHeight}px`,
        top: `${(index + startIndex) * this.itemHeight}px`,
      }
      items.push(m(FrameView, {
        style: itemStyle,
        key: seq,
        sess: vnode.attrs.sess,
      }))
    }
    return m('nav', [
      m('div', {
        class: 'container',
        style: listStyle,
      }, items)
    ])
  }

  onupdate (vnode) {
    const { frames } = vnode.attrs.sess.frame
    if (this.prevFrames !== frames) {
      this.prevFrames = frames
      if (!vnode.attrs.scrollLock) {
        vnode.dom.scrollTop = vnode.dom.scrollHeight - vnode.dom.clientHeight
      }
    }
  }

  oncreate (vnode) {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === vnode.dom) {
          this.height = entry.contentRect.height
          m.redraw()
        }
       }
    })
    resizeObserver.observe(vnode.dom)
    vnode.dom.addEventListener('scroll', (event) => {
      this.scrollTop = event.target.scrollTop
      m.redraw()
    })
  }
}

export default class PcapView {
  constructor () {
    this.sess = null
    this.capture = false
    this.filtered = null
    this.scrollLock = false
  }

  searchKeyPress (event) {
    switch (event.code) {
    case 'Enter':
      try {
        const { value } = event.target
        this.sess.setDisplayFilter('main', value)
        if (value.length > 0) {
          const maxLength = deplug.config.get('_.filterHistoryLength', 10)
          const history =
            [].concat(deplug.workspace.get('_.filter.history', []))
          history.push(value)
          const overflow = history.length - maxLength
          if (overflow > 0) {
            history.splice(0, overflow)
          }
          deplug.workspace.set('_.filter.history', history)
        }
      } catch (err) {
        deplug.notify.show(
          err.message, {
            type: 'error',
            title: 'Filter Error',
          })
      }
      break
      default:
    }
  }

  view () {
    let counter = '0'
    if (this.sess) {
      counter = this.sess.filter.main
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
        }),
        m('span', {
          class: 'button',
          'data-balloon': `Capture ${this.capture
            ? 'Running'
            : 'Paused'}`,
          'data-balloon-pos': 'right',
          onclick: () => {
            const { sess } = this
            if (this.capture) {
              sess.stopPcap()
            } else {
              sess.startPcap()
            }
            this.capture = !this.capture
          },
        }, [
          m('i', {
            class: this.capture
              ? 'fa fa-play-circle'
              : 'fa fa-pause-circle',
          })
        ]),
        m('span', {
          class: 'button',
          'data-balloon': `Scroll ${this.scrollLock
            ? 'Locked'
            : 'Unlocked'}`,
          'data-balloon-pos': 'right',
          onclick: () => {
            this.scrollLock = !this.scrollLock
          },
        }, [
          m('i', {
            class: this.scrollLock
              ? 'fa fa-lock'
              : 'fa fa-unlock-alt',
          })
        ]),
        m('span', {
          'data-balloon': 'Frame Counter',
          'data-balloon-pos': 'right',
        }, [counter])
      ]),
      this.sess
      ? m(FrameListView, {
        sess: this.sess,
        scrollLock: this.scrollLock,
      })
      : m('nav'),
      m('main', [
        m(PcapDetailView, {}),
        m(PcapToolView, {})
      ]),
      m('div', { class: 'notification' })
    ]
  }

  oncreate () {
    if (deplug.argv.import) {
      const file = path.resolve(deplug.argv.import)
      const browserWindow = remote.getCurrentWindow()
      deplug.packages.once('updated', () => {
        deplug.session.create().then((sess) => {
          this.sess = sess
          sess.on('frame', (stat) => {
            deplug.logger.debug(stat)
            m.redraw()
          })
          sess.on('status', (stat) => {
            const progress = stat.importerProgress >= 1.0
              ? -1
              : stat.importerProgress
            browserWindow.setProgressBar(progress)
            this.capture = stat.capture
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
        this.sess = sess
        sess.startPcap()
        sess.on('frame', (stat) => {
          deplug.logger.debug(stat)
          m.redraw()
        })
        sess.on('status', (stat) => {
          this.capture = stat.capture
          m.redraw()
        })
        sess.on('filter', () => {
          m.redraw()
        })
      })
    }
    deplug.action.global.on('core:file:export', () => {
      const file = dialog.showSaveDialog(
        { filters: deplug.session.fileExtensions.exporter })
      if (typeof file !== 'undefined') {
        this.sess.exportFile(file, '')
      }
    })
  }
}
