import SchemaInput from '../../lib/schema-input'
import m from 'mithril'
import marked from 'marked'

class Markdown {
  view () {
    return m('p', { class: 'description' })
  }

  oncreate (vnode) {
    vnode.dom.innerHTML = marked(vnode.attrs.content)
  }
}

export default class General {
  view (vnode) {
    const config = Object.entries(deplug.config.schema)
      .filter(([id]) => id.startsWith(vnode.attrs.prefix))
    return [
      m('div',
        config.map(([id, schema]) => m('section', [
          m('h4', [schema.title, m('span', { class: 'schema-path' }, [id])]),
          m(SchemaInput, {
            id,
            schema,
          }),
          m(Markdown, { content: schema.description || '' })
        ])))
    ]
  }

  oncreate () {
    deplug.config.watch('_', () => {
      m.redraw()
    })
  }
}
