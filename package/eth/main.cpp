#include <plugkit/attr.h>
#include <plugkit/context.h>
#include <plugkit/dissector.h>
#include <plugkit/layer.h>
#include <plugkit/payload.h>
#include <plugkit/reader.h>
#include <plugkit/token.h>
#include <plugkit/variant.h>
#include <unordered_map>

using namespace plugkit;

namespace {

const auto ethToken = Token_get("eth");
const auto srcToken = Token_get("eth.src");
const auto dstToken = Token_get("eth.dst");
const auto lenToken = Token_get("eth.len");
const auto ethTypeToken = Token_get("eth.type");
const auto macToken = Token_get("@eth:mac");
const auto novalueToken = Token_get("@novalue");

static const std::unordered_map<uint16_t, std::pair<Token, Token>> typeTable = {
    {0x0800, std::make_pair(Token_get("[ipv4]"), Token_get("eth.type.ipv4"))},
    {0x86DD, std::make_pair(Token_get("[ipv6]"), Token_get("eth.type.ipv6"))},
};

bool analyze(Context *ctx, const Dissector *diss, Worker worker, Layer *layer) {
  Reader reader;
  Reader_reset(&reader);

  const Payload *parentPayload = Layer_payloads(layer, nullptr)[0];
  Range payloadRange = Payload_range(parentPayload);
  reader.data = Payload_slices(parentPayload, nullptr)[0];

  Layer *child = Layer_addLayer(layer, ctx, ethToken);
  Layer_addTag(child, ethToken);
  Layer_setRange(child, payloadRange);

  const auto &srcSlice = Reader_slice(&reader, 0, 6);
  Attr *src = Layer_addAttr(child, ctx, srcToken);
  Attr_setSlice(src, srcSlice);
  Attr_setType(src, macToken);
  Attr_setRange(src, reader.lastRange);

  const auto &dstSlice = Reader_slice(&reader, 0, 6);
  Attr *dst = Layer_addAttr(child, ctx, dstToken);
  Attr_setSlice(dst, dstSlice);
  Attr_setType(dst, macToken);
  Attr_setRange(dst, reader.lastRange);

  auto protocolType = Reader_getUint16(&reader, false);
  if (protocolType <= 1500) {
    Attr *length = Layer_addAttr(child, ctx, lenToken);
    Attr_setUint32(length, protocolType);
    Attr_setRange(length, reader.lastRange);
  } else {
    Attr *etherType = Layer_addAttr(child, ctx, ethTypeToken);
    Attr_setUint32(etherType, protocolType);
    Attr_setRange(etherType, reader.lastRange);
    const auto &it = typeTable.find(protocolType);
    if (it != typeTable.end()) {
      Attr *type = Layer_addAttr(child, ctx, it->second.second);
      Attr_setBool(type, true);
      Attr_setType(type, novalueToken);
      Attr_setRange(type, reader.lastRange);
      Layer_addTag(child, it->second.first);
    }
  }

  Payload *chunk = Layer_addPayload(child, ctx);
  Payload_addSlice(chunk, Reader_sliceAll(&reader, 0));
  Payload_setRange(chunk, Range_offset(reader.lastRange, payloadRange.begin));
  return true;
}
} // namespace

extern "C" {
PLUGKIT_MODULE_EXPORT bool plugkit_v1_analyze(Context *ctx,
                                              const Dissector *diss,
                                              Worker worker,
                                              Layer *layer) {
  return analyze(ctx, diss, worker, layer);
}

PLUGKIT_MODULE_EXPORT Token plugkit_v1_layer_hints(int index) {
  Token layerHints[2] = {Token_get("[eth]")};
  return layerHints[index];
}
}
