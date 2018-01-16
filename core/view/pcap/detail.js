import { BufferValueItem, AttributeValueItem } from './value'
import m from 'mithril'
import moment from '@deplug/moment.min'

function selectRange (range = []) {
  deplug.action.emit('core:frame:range-selected', range)
}

class AttributeItem {
  view (vnode) {
    const { item, layer } = vnode.attrs
    const { attr, children } = item
    let faClass = 'attribute'
    if (children.length) {
      faClass = 'attribute children'
    }
    const { name } = deplug.session.token(attr.id)
    const attrRenderer =
      deplug.session.attrRenderer(attr.type) || AttributeValueItem
    return m('li', [
      m('details', [
        m('summary', {
          class: faClass,
          onmouseover: () => selectRange([
            layer.range[0] + attr.range[0],
            layer.range[0] + attr.range[1]
          ]),
          onmouseout: () => selectRange(),
          oncontextmenu: (event) => {
            const { id } = attr
            deplug.menu.showContextMenu(event, [
              {
                label: `Apply Filter: ${id}`,
                click: () => deplug.action
                  .emit('core:filter:set', id),
              },
              {
                label: 'Reveal in Developer Tools...',
                click: () => {
                  // eslint-disable-next-line no-console
                  console.log(attr)
                  deplug.action.global.emit('core:tab:open-devtool')
                },
              }
            ])
          },
        }, [
          m('span', { class: 'label' }, [
            m('i', { class: 'fa fa-circle-o' }, [' ']),
            m('i', { class: 'fa fa-arrow-circle-right' }, [' ']),
            m('i', { class: 'fa fa-arrow-circle-down' }, [' ']),
            name, ': '
          ]),
          m(attrRenderer, {
            attr,
            layer: vnode.attrs.layer,
          }),
          m('span', {
            class: 'label error',
            style: {
              display: attr.error
                ? 'inline'
                : 'none',
            },
          }, [m('i', { class: 'fa fa-exclamation-triangle' }), ' ', attr.error])
        ]),
        m('ul', [
          children.map((child) => m(AttributeItem, {
            item: child,
            layer,
          }))
        ])
      ])
    ])
  }
}

class LayerItem {
  view (vnode) {
    const { layer } = vnode.attrs
    let dataOffset = 0
    if (layer.parent) {
      const [parentPayload] = layer.parent.payloads
      const parentAddr = parentPayload.slices[0].addr
      let rootPayload = parentPayload
      for (let { parent } = layer.parent; parent; { parent } = parent) {
        [rootPayload] = parent.payloads
      }
      const rootAddr = rootPayload.slices[0].addr
      dataOffset = parentAddr[1] - rootAddr[1]
    }
    const { name } = deplug.session.token(layer.id)

    const attrArray = [{
      key: layer.id,
      children: [],
    }]
    let prevDepth = 0
    for (const attr of layer.attrs) {
      let { id } = attr
      if (id.startsWith('.')) {
        id = layer.id + id
      }
      const attrPath = id.split('.')
      let items = attrArray
      let child = null
      for (let index = 0; index < attrPath.length; index += 1) {
        const key = attrPath[index]
        if (index < attrPath.length - 1 || prevDepth < attrPath.length) {
          child = items.find((item) => item.key === key) || null
        } else {
          child = null
        }
        if (child === null) {
          child = {
            key,
            children: [],
          }
          items.push(child)
        }
        items = child.children
      }
      child.attr = attr
      prevDepth = attrPath.length
    }
    return m('ul', [
      m('li', [
        m('details', { open: true }, [
          m('summary', {
            class: 'layer children',
            'data-layer': layer.tags.join(' '),
            onmouseover: () => selectRange(layer.range),
            onmouseout: () => selectRange(),
            oncontextmenu: (event) => {
              deplug.menu.showContextMenu(event, [
                {
                  label: `Apply Filter: ${layer.id}`,
                  click: () => deplug.action
                    .emit('core:filter:set', layer.id),
                },
                {
                  label: 'Reveal in Developer Tools...',
                  click: () => {
                    // eslint-disable-next-line no-console
                    console.log(layer)
                    deplug.action.global.emit('core:tab:open-devtool')
                  },
                }
              ])
            },
          }, [
            m('i', { class: 'fa fa-arrow-circle-right' }, [' ']),
            m('i', { class: 'fa fa-arrow-circle-down' }, [' ']),
            name, ' ',
            m('span', {
              style: {
                display: layer.streamId > 0
                  ? 'inline'
                  : 'none',
              },
            },
            [
              m('i', { class: 'fa fa-exchange' }),
              ' Stream #', layer.streamId]),
            m('span', {
              style: {
                display: layer.confidence < 1.0
                  ? 'inline'
                  : 'none',
              },
            }, [
              m('i', { class: 'fa fa-question-circle' }),
              ' ',
              layer.confidence * 100, '%'
            ])
          ]),
          attrArray[0].children.map((item) =>
            m(AttributeItem, {
              item,
              layer,
              dataOffset,
            })),
          m('a', ['Payloads']),
          m('ul', [
            layer.payloads.map(
              (payload) => payload.slices.map(
                (slice) => m('li', {
                  onmouseover: () => selectRange(payload.range),
                  onmouseout: () => selectRange(),
                }, [
                  ' ',
                  m(BufferValueItem, { value: slice }),
                  ' : ', payload.type, ' '])))
          ])
        ])
      ]),
      m('li', [
        m('ul', [
          layer.layers.map((child) => m(LayerItem, { layer: child }))
        ])
      ])
    ])
  }
}

export default class PcapDetailView {
  constructor () {
    this.selectedFrame = null
    this.displayFilter = null
    deplug.action.on('core:frame:selected', (frames) => {
      this.selectedFrame = frames[0] || null
      m.redraw()
    })
  }

  oncreate () {
    deplug.action.on('core:filter:updated', (filter) => {
      this.displayFilter = filter
      m.redraw()
    })
  }

  view () {
    if (this.selectedFrame === null) {
      return m('div', { class: 'detail-view' }, ['No frame selected'])
    }
    const frame = this.selectedFrame

    const tsString =
      moment(frame.timestamp).format('YYYY-MM-DDTHH:mm:ss.SSSZ')

    let length = `${frame.rootLayer.payloads[0].slices[0].length}`
    if (frame.length > frame.rootLayer.payloads[0].slices[0].length) {
      length += ` (actual: ${frame.length})`
    }

    let children = frame.rootLayer.layers
    const rootId = frame.rootLayer.id
    if (rootId.startsWith('[')) {
      children = frame.rootLayer.layers
    }

    let filterValue = '(null)'
    if (this.displayFilter) {
      const value = this.displayFilter.test(frame)
      if (value !== null) {
        filterValue = value
      }
    } else {
      filterValue = 'No filter'
    }

    return m('div', { class: 'detail-view' }, [
      m('ul', [
        m('li', [
          m('i', { class: 'fa fa-circle-o' }),
          m('span', { class: 'label' }, [' Timestamp: ']),
          m('span', [' ', tsString, ' '])
        ]),
        m('li', [
          m('i', { class: 'fa fa-circle-o' }),
          m('span', { class: 'label' }, [' Length: ']),
          m('span', [' ', length, ' '])
        ]),
        m('li', [
          m('i', { class: 'fa fa-circle-o' }),
          m('span', { class: 'label' }, [' Evaluated Filter: ']),
          m('span', [
            this.displayFilter
              ? `${this.displayFilter.expression} =>`
              : '',
            ' ']),
          m('span', [m(AttributeValueItem, { attr: { value: filterValue } })])
        ])
      ]),
      children.map((layer) => m(LayerItem, { layer }))
    ])
  }
}
