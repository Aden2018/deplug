#ifndef PLUGKIT_LAYER_HPP
#define PLUGKIT_LAYER_HPP

#include "range.hpp"
#include "token.hpp"
#include "types.hpp"
#include <memory>
#include <string>
#include <vector>

#define LAYER_MAX_WORKER 16

namespace plugkit {

struct Context;
struct Error;

enum LayerConfidence {
  LAYER_CONF_ERROR = 0,
  LAYER_CONF_POSSIBLE = 1,
  LAYER_CONF_PROBABLE = 2,
  LAYER_CONF_EXACT = 3
};

struct Layer final {
public:
  Layer(Token id);
  ~Layer();

  Token id() const;

  Range range() const;
  void setRange(const Range &range);

  const std::vector<Layer *> &layers() const;
  void addLayer(Layer *child);

  const std::vector<Attr *> &attrs() const;
  const Attr *attr(Token token) const;
  void addAttr(Attr *attr);

  uint8_t worker() const;
  void setWorker(uint8_t id);

  const std::vector<Payload *> &payloads() const;
  void addPayload(Payload *payload);

  const std::vector<Token> &tags() const;
  void addTag(Token token);

  Layer *parent() const;
  void setParent(Layer *layer);

  const Frame *frame() const;
  void setFrame(const Frame *frame);

private:
  bool isRoot() const;
  void setIsRoot(bool root);

private:
  Layer(const Layer &layer) = delete;
  Layer &operator=(const Layer &layer) = delete;

private:
  Token mId = Token_null();
  uint32_t mData = 0;
  union {
    Layer *layer;
    const Frame *frame;
  } mParent;
  Range mRange = {0, 0};
  std::vector<Payload *> mPayloads;
  std::vector<Token> mTags;
  std::vector<Layer *> mLayers;
  std::vector<Attr *> mAttrs;
};

extern "C" {
/// Allocate a new `Layer` and adds it as a child layer.
Layer *Layer_addLayer(Layer *layer, Context *ctx, Token id);

/// Allocate a new `Attr` and adds it as a layer attribute.
Attr *Layer_addAttr(Layer *layer, Context *ctx, Token id);

void Layer_addAttrAlias(Layer *layer, Context *ctx, Token alias, Token target);

/// Find the first layer attribute with the given id and returns it.
///
/// If no attribute is found, returns nullptr.
const Attr *Layer_attr(const Layer *layer, Token id);

/// Allocate a new Payload and adds it as a layer payload.
Payload *Layer_addPayload(Layer *layer, Context *ctx);

/// Return the first address of payloads
/// and assigns the number of the layer payloads to size.
/// Returns the address of an empty payload if the layer has no payloads.
const Payload *const *Layer_payloads(const Layer *layer, size_t *size);

void Layer_addError(
    Layer *layer, Context *ctx, Token id, const char *msg, size_t length);

/// Add a layer tag
void Layer_addTag(Layer *layer, Context *ctx, Token tag);
}

} // namespace plugkit

#endif
