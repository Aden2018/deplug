import Content from './lib/content'
import PcapView from './view/pcap-view'

const content = new Content(PcapView, 'pcap.less')
content.load()
