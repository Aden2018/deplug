import m from 'mithril'
export default class IPv4Addr {
  view(vnode) {
    const value = vnode.attrs.prop.value
    return m('span', [value[0], '.', value[1], '.', value[2], '.', value[3]])
  }
}
