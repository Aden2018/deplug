import m from 'mithril'
import {
  Session
} from 'deplug'
export default class Flags {
  view(vnode) {
    const value = vnode.attrs.prop.value
    const flags = vnode.attrs.layer.attrs.filter((prop) => prop.value && prop.id.startsWith(`${vnode.attrs.prop.id}.`)).map((prop) => {
      const id = prop.id
      const name = (id in Session.attributes) ? Session.attributes[id].name : id
      return name
    }).join(', ')
    return m('span', [flags, ' (', value, ')'])
  }
}
