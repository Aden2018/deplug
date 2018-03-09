const { Component, wire } = require('hyperhtml')
class BinaryItem extends Component {
  constructor (frame) {
    super();
    [this.payload] = frame.rootLayer.payloads[0].slices

    deplug.action.on('core:frame:range-selected', (range) => {
      this.setState({
        range: range.length === 2
          ? range
          : [-1, -1],
      })
    })
  }

  get defaultState () {
    return { range: [-1, -1] }
  }

  hex (slice, line) {
    return (new Array(slice.length)).fill()
      .map((item, byte) => {
        const index = (line * 16) + byte
        return wire()`
        <span
          data-range-selected=${
  this.state.range[0] <= index && index < this.state.range[1]}
        >
          ${(`0${this.payload[index].toString(16)}`).slice(-2)}
        </span>
      `
      })
  }

  ascii (slice, line) {
    return (new Array(slice.length)).fill()
      .map((item, byte) => {
        const index = (line * 16) + byte
        const char = this.payload[index]
        const ascii = (char >= 0x21 && char <= 0x7e)
          ? String.fromCharCode(char)
          : '.'
        return wire()`
        <span
          data-range-selected=${
  this.state.range[0] <= index && index < this.state.range[1]}
        >
          ${ascii}
        </span>
      `
      })
  }

  render () {
    const array = (new Array(Math.ceil(this.payload.length / 16))).fill()
      .map((idx, line) => this.payload.slice(line * 16, (line + 1) * 16))
    return this.html`
      <ul class="hex-list">
        ${array.map((slice, line) =>
    wire()`<li>${this.hex(slice, line)}</li>`)}
      </ul>
      <ul class="ascii-list">
        ${array.map((slice, line) =>
    wire()`<li>${this.ascii(slice, line)}</li>`)}
      </ul>
    `
  }
}

class BinaryView extends Component {
  constructor () {
    super()
    deplug.action.on('core:frame:selected', (frames) => {
      this.setState({ frame: frames[0] || null })
    })
  }

  get defaultState () {
    return { frame: null }
  }

  render () {
    return this.html`
      <div class="binary-view">
        ${this.state.frame
    ? new BinaryItem(this.state.frame)
    : 'No frame selected'}  
      </div>
    `
  }
}

module.exports = BinaryView
