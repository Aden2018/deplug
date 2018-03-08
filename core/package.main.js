import Content from './lib/content'
import PackageView from './view/package/view'

const components = [
  'core:style'
]
function view (render) {
  render`
      <div>
        <h1>Hello, world!</h1>
        <h2>It is ${new Date().toLocaleTimeString()}.</h2>
      </div>
    `
}

const content = new Content(view,
  'package.main.css',
  [
    `--components=${components.join(',')}`,
    '--loggerDomain=pacakge',
    '--contextMenu',
    '--hyper'
  ])
content.load()
