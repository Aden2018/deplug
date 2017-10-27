const fields = Symbol('fields')
function compareUint8Array (lhs, rhs) {
  if (lhs.length !== rhs.length) {
    return false
  }
  for (let pos = 0; pos < lhs.length; pos += 1) {
    if (lhs[pos] !== rhs[pos]) {
      return false
    }
  }
  return true
}

class StreamReader {
  // Construct a new StreamReader instance
  // @return StreamReader
  constructor () {
    this[fields] = {
      length: 0,
      slices: [],
    }
  }

  // Total length of the added payloads
  // @property Integer
  get length () {
    return this[fields].length
  }

  // Add all slices in `payload` to the stream.
  addPayload (payload) {
    if (typeof payload !== 'object' || payload === null ||
        payload.constructor.name !== 'Payload') {
      throw new TypeError('First argument must be an Uint8Array')
    }
    for (const slice of payload.slices) {
      this.addSlice(slice)
    }
  }

  // Add `slice` to the stream.
  addSlice (slice) {
    if (!(slice instanceof Uint8Array)) {
      throw new TypeError('First argument must be an Uint8Array')
    }
    this[fields].length += slice.length
    this[fields].slices.push(slice)
  }

  // Find the first occurrence of `pattern` in the stream.
  // The first `offset` bytes in the stream are skipped.
  // /
  // Return the _end_ position of the found byte sequence,
  // Or -1 if no such byte sequence is found.
  // @return Integer
  search (pattern, offset = 0) {
    if (!(pattern instanceof Uint8Array)) {
      throw new TypeError('First argument must be an Uint8Array')
    }
    if (!Number.isInteger(offset)) {
      throw new TypeError('Second argument must be an integer')
    }

    if (pattern.length === 0) {
      return -1
    }

    const { slices } = this[fields]
    let beginOffset = 0
    let begin = 0
    for (; begin < slices.length &&
      (beginOffset += slices[begin].length) <= offset;) {
        begin += 1
    }
    if (beginOffset <= offset) {
      return -1
    }
    beginOffset -= slices[begin].length
    const front = beginOffset
    for (let cur = begin; cur < slices.length; cur += 1) {
      const slice = slices[cur]
      let index = 0
      if (cur === begin) {
        index = offset - beginOffset
      }
      for (; index < slice.length; index += 1) {
        if (slice[index] === pattern[0]) {
          const window = this.read(pattern.length, front + index)
          if (compareUint8Array(window, pattern)) {
            return front + index + pattern.length
          }
        }
      }
    }

    return -1
  }

  // Read a byte sequence from the stream up to `length` bytes.
  // The first `offset` bytes in the stream are skipped.
  // @return Uint8Array
  read (length, offset = 0) {
    if (!Number.isInteger(length)) {
      throw new TypeError('First argument must be an integer')
    }
    if (!Number.isInteger(offset)) {
      throw new TypeError('Second argument must be an integer')
    }

    const { slices } = this[fields]
    let beginOffset = 0
    let begin = 0
    for (; begin < slices.length &&
      (beginOffset += slices[begin].length) <= offset;) {
        begin += 1
    }
    if (beginOffset <= offset) {
      return new Uint8Array()
    }
    beginOffset -= slices[begin].length
    let endOffset = beginOffset
    let end = begin
    for (; end < slices.length &&
      (endOffset += slices[end].length) < offset + length;) {
        end += 1
    }
    const continuous = true
    const buflen = Math.min(length, endOffset - beginOffset)
    const sliceOffset = offset - beginOffset
    if (slices[begin].length >= sliceOffset + buflen) {
      return slices[begin].slice(sliceOffset, sliceOffset + buflen)
    }
    const data = new Uint8Array(buflen)
    let dst = 0
    for (let index = begin; index <= end; index += 1) {
      let slice = slices[index]
      if (index === begin) {
        slice = slice.slice(offset - beginOffset)
      }
      data.set(slice.slice(0, data.length - dst), dst)
      dst += slice.length
    }
    return data
  }
}

exports.StreamReader = StreamReader
