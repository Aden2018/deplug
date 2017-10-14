class Reader {
  // @return Reader
  constructor(data) {
    if (!(data instanceof Uint8Array)) {
      throw new TypeError('First argument must be an Uint8Array')
    }
    this._fields = {
      data,
      lastRange: [0, 0],
      lastError: '',
      getDateView: () => {
        return new DataView(data.buffer, data.byteOffset, data.byteLength)
      },
      nextRange: (size) => {
        this._fields.lastRange[0] = this._fields.lastRange[1]
        this._fields.lastRange[1] = this._fields.lastRange[0] + size
      }
    }
  }

  // @return UInt8Array
  slice(begin, end) {
    if (!Number.isInteger(begin)) {
      throw new TypeError('First argument must be an integer')
    }
    if (!Number.isInteger(end)) {
      throw new TypeError('Second argument must be an integer')
    }
    if (end < begin) {
      throw new RangeError('Second argument must be greater than first argument')
    }
    const offset = this._fields.lastRange[1]
    const length = this._fields.data.length
    const sliceBegin = offset + begin
    const sliceEnd = offset + end
    if (sliceBegin >= length || sliceEnd > length) {
      this._fields.lastError = '!out-of-bounds'
      return this._fields.data.slice(0, 0)
    }
    const slice = this._fields.data.slice(sliceBegin, sliceEnd)
    this._fields.lastRange[0] = this._fields.lastRange[1]
    this._fields.lastRange[1] = sliceEnd
    return slice
  }

  // @return UInt8Array
  sliceAll(begin = 0) {
    if (!Number.isInteger(begin)) {
      throw new TypeError('First argument must be an integer')
    }
    const offset = this._fields.lastRange[1]
    const length = this._fields.data.length
    const sliceBegin = offset + begin
    if (sliceBegin >= length) {
      this._fields.lastError = '!out-of-bounds'
      return this._fields.data.slice(0, 0)
    }
    const slice = this._fields.data.slice(sliceBegin)
    this._fields.lastRange[0] = this._fields.lastRange[1]
    this._fields.lastRange[1] = sliceEnd
    return slice
  }

  // Returns an unsigned 8-bit integer
  // @return Integer
  getUint8() {
    try {
      const value = this._fields.getDateView().getUint8(this._fields.lastRange[1])
      this._fields.nextRange(1)
      return value
    } catch (err) {
      this._fields.lastError = '!out-of-bounds'
      return 0
    }
  }

  // @return Integer
  getInt8() {
    try {
      const value = this._fields.getDateView().getInt8(this._fields.lastRange[1])
      this._fields.nextRange(1)
      return value
    } catch (err) {
      this._fields.lastError = '!out-of-bounds'
      return 0
    }
  }

  // @return Integer
  getUint16(littleEndian = false) {
    if (typeof littleEndian !== 'boolean') {
      throw new TypeError('First argument must be boolean')
    }
    try {
      const value = this._fields.getDateView().getUint16(this._fields.lastRange[1], littleEndian)
      this._fields.nextRange(2)
      return value
    } catch (err) {
      this._fields.lastError = '!out-of-bounds'
      return 0
    }
  }

  // @return Integer
  getUint32(littleEndian = false) {
    if (typeof littleEndian !== 'boolean') {
      throw new TypeError('First argument must be boolean')
    }
    try {
      const value = this._fields.getDateView().getUint32(this._fields.lastRange[1], littleEndian)
      this._fields.nextRange(4)
      return value
    } catch (err) {
      this._fields.lastError = '!out-of-bounds'
      return 0
    }
  }

  // @return Integer
  getInt16(littleEndian = false) {
    if (typeof littleEndian !== 'boolean') {
      throw new TypeError('First argument must be boolean')
    }
    try {
      const value = this._fields.getDateView().getInt16(this._fields.lastRange[1], littleEndian)
      this._fields.nextRange(2)
      return value
    } catch (err) {
      this._fields.lastError = '!out-of-bounds'
      return 0
    }
  }

  // @return Integer
  getInt32(littleEndian = false) {
    if (typeof littleEndian !== 'boolean') {
      throw new TypeError('First argument must be boolean')
    }
    try {
      const value = this._fields.getDateView().getInt32(this._fields.lastRange[1], littleEndian)
      this._fields.nextRange(4)
      return value
    } catch (err) {
      this._fields.lastError = '!out-of-bounds'
      return 0
    }
  }

  // @return Double
  getFloat32(littleEndian = false) {
    if (typeof littleEndian !== 'boolean') {
      throw new TypeError('First argument must be boolean')
    }
    try {
      const value = this._fields.getDateView().getFloat32(this._fields.lastRange[1], littleEndian)
      this._fields.nextRange(4)
      return value
    } catch (err) {
      this._fields.lastError = '!out-of-bounds'
      return 0
    }
  }

  // @return Double
  getFloat64(littleEndian = false) {
    if (typeof littleEndian !== 'boolean') {
      throw new TypeError('First argument must be boolean')
    }
    try {
      const value = this._fields.getDateView().getFloat64(this._fields.lastRange[1], littleEndian)
      this._fields.nextRange(8)
      return value
    } catch (err) {
      this._fields.lastError = '!out-of-bounds'
      return 0
    }
  }

  get lastRange() {
    return this._fields.lastRange
  }

  set lastRange(value) {
    if (Array.isArray(value) && value.length >= 2) {
      this._fields.lastRange = value.slice(0, 2)
    }
  }

  get lastError() {
    return this._fields.lastError
  }

  get data() {
    return this._fields.data
  }
}

exports.Reader = Reader
