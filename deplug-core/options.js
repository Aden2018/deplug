export default {
  snaplen: {
    title: 'Snapshot Length (Bytes)',
    type: 'integer',
    minimum: 0,
    default: 2048,
  },
  confidenceThreshold: {
    title: 'Confidence Threshold',
    type: 'integer',
    enum: [0, 1, 2, 3],
    enumTitles: [
      '0 - Error',
      '1 - Possible',
      '2 - Probable',
      '3 - Exact'
    ],
    minimum: 0,
    maximum: 3,
    default: 2,
  },
  noPrebuilt: {
    title: 'Don\'t Use Pre-Built Binaries',
    description: 'Force to build native add-ons from source',
    type: 'boolean',
    default: false,
  },
  concurrency: {
    title: 'Concurrency',
    type: 'integer',
    maximum: 0,
    default: 0,
  },
  pluginRegistries: {
    title: 'Plugin Registries',
    type: 'array',
    items: {
      type: 'string',
      format: 'uri',
    },
    default: ['https://deplug.net/registry/list.yml'],
  },
}
