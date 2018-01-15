#include <plugkit/attr.h>
#include <plugkit/context.h>
#include <plugkit/dissector.h>
#include <plugkit/layer.h>
#include <plugkit/module.h>
#include <plugkit/payload.h>
#include <plugkit/reader.h>
#include <plugkit/token.h>
#include <plugkit/variant.h>
#include <string>
#include <unordered_map>

using namespace plugkit;

namespace {

const std::pair<uint16_t, Token> flagTable[] = {
    std::make_pair(0x1, Token_get("ipv4.flags.reserved")),
    std::make_pair(0x2, Token_get("ipv4.flags.dontFragment")),
    std::make_pair(0x4, Token_get("ipv4.flags.moreFragments")),
};

const std::unordered_map<uint16_t, std::pair<Token, Token>> protoTable = {
    {0x01,
     std::make_pair(Token_get("[icmp]"), Token_get("ipv4.protocol.icmp"))},
    {0x02,
     std::make_pair(Token_get("[igmp]"), Token_get("ipv4.protocol.igmp"))},
    {0x06, std::make_pair(Token_get("[tcp]"), Token_get("ipv4.protocol.tcp"))},
    {0x11, std::make_pair(Token_get("[udp]"), Token_get("ipv4.protocol.udp"))},
};

const auto ipv4Token = Token_get("ipv4");
const auto versionToken = Token_get("ipv4.version");
const auto hLenToken = Token_get("ipv4.headerLength");
const auto typeToken = Token_get("ipv4.type");
const auto tLenToken = Token_get("ipv4.totalLength");
const auto idToken = Token_get("ipv4.id");
const auto flagsToken = Token_get("ipv4.flags");
const auto fOffsetToken = Token_get("ipv4.fragmentOffset");
const auto ttlToken = Token_get("ipv4.ttl");
const auto protocolToken = Token_get("ipv4.protocol");
const auto checksumToken = Token_get("ipv4.checksum");
const auto srcToken = Token_get("ipv4.src");
const auto dstToken = Token_get("ipv4.dst");
const auto ipv4AddrToken = Token_get("@ipv4:addr");
const auto flagsTypeToken = Token_get("@flags");
const auto enumToken = Token_get("@enum");
const auto novalueToken = Token_get("@novalue");

void analyze(Context *ctx, const Dissector *diss, Worker data, Layer *layer) {
  Reader reader;
  Reader_reset(&reader);

  const Payload *parentPayload = Layer_payloads(layer, nullptr)[0];
  Range payloadRange = Payload_range(parentPayload);
  reader.data = Payload_slices(parentPayload, nullptr)[0];

  Layer *child = Layer_addLayer(layer, ctx, ipv4Token);
  Layer_addTag(child, ipv4Token);
  Layer_setRange(child, payloadRange);

  uint8_t header = Reader_getUint8(&reader);
  int version = header >> 4;
  int headerLength = header & 0b00001111;

  Attr *ver = Layer_addAttr(child, ctx, versionToken);
  Attr_setUint32(ver, version);
  Attr_setRange(ver, reader.lastRange);

  Attr *hlen = Layer_addAttr(child, ctx, hLenToken);
  Attr_setUint32(hlen, headerLength);
  Attr_setRange(hlen, reader.lastRange);

  Attr *tos = Layer_addAttr(child, ctx, typeToken);
  Attr_setUint32(tos, Reader_getUint8(&reader));
  Attr_setRange(tos, reader.lastRange);

  uint16_t totalLength = Reader_getUint16(&reader, false);
  Attr *tlen = Layer_addAttr(child, ctx, tLenToken);
  Attr_setUint32(tlen, totalLength);
  Attr_setRange(tlen, reader.lastRange);

  Attr *id = Layer_addAttr(child, ctx, idToken);
  Attr_setUint32(id, Reader_getUint16(&reader, false));
  Attr_setRange(id, reader.lastRange);

  uint8_t flagAndOffset = Reader_getUint8(&reader);
  uint8_t flag = (flagAndOffset >> 5) & 0b00000111;

  Attr *flags = Layer_addAttr(child, ctx, flagsToken);
  Attr_setUint32(flags, flag);
  std::string flagSummary;
  for (const auto &bit : flagTable) {
    bool on = bit.first & flag;
    Attr *flagBit = Layer_addAttr(child, ctx, bit.second);
    Attr_setBool(flagBit, on);
    Attr_setRange(flagBit, reader.lastRange);

    if (on) {
      if (!flagSummary.empty())
        flagSummary += ", ";
      flagSummary += std::get<1>(bit);
    }
  }
  Attr_setType(flags, flagsTypeToken);
  Attr_setRange(flags, reader.lastRange);

  uint16_t fgOffset =
      ((flagAndOffset & 0b00011111) << 8) | Reader_getUint8(&reader);
  Attr *fragmentOffset = Layer_addAttr(child, ctx, fOffsetToken);
  Attr_setUint32(fragmentOffset, fgOffset);
  Attr_setRange(fragmentOffset, Range{6, 8});

  Attr *ttl = Layer_addAttr(child, ctx, ttlToken);
  Attr_setUint32(ttl, Reader_getUint8(&reader));
  Attr_setRange(ttl, reader.lastRange);

  uint8_t protocolNumber = Reader_getUint8(&reader);
  Attr *proto = Layer_addAttr(child, ctx, protocolToken);
  Attr_setUint32(proto, protocolNumber);
  Attr_setType(proto, enumToken);
  Attr_setRange(proto, reader.lastRange);
  const auto &it = protoTable.find(protocolNumber);
  if (it != protoTable.end()) {
    Attr *sub = Layer_addAttr(child, ctx, it->second.second);
    Attr_setBool(sub, true);
    Attr_setType(sub, novalueToken);
    Attr_setRange(sub, reader.lastRange);
    Layer_addTag(child, it->second.first);
  }

  Attr *checksum = Layer_addAttr(child, ctx, checksumToken);
  Attr_setUint32(checksum, Reader_getUint16(&reader, false));
  Attr_setRange(checksum, reader.lastRange);

  const auto &srcSlice = Reader_slice(&reader, 0, 4);
  Attr *src = Layer_addAttr(child, ctx, srcToken);
  Attr_setSlice(src, srcSlice);
  Attr_setType(src, ipv4AddrToken);
  Attr_setRange(src, reader.lastRange);

  const auto &dstSlice = Reader_slice(&reader, 0, 4);
  Attr *dst = Layer_addAttr(child, ctx, dstToken);
  Attr_setSlice(dst, dstSlice);
  Attr_setType(dst, ipv4AddrToken);
  Attr_setRange(dst, reader.lastRange);

  Payload *chunk = Layer_addPayload(child, ctx);
  Payload_addSlice(chunk, Reader_sliceAll(&reader, 0));
  Payload_setRange(chunk, Range_offset(reader.lastRange, payloadRange.begin));
}
} // namespace

PLUGKIT_MODULE([]() {
  static Dissector diss;
  diss.layerHints[0] = (Token_get("[ipv4]"));
  diss.analyze = analyze;
  return &diss;
})
