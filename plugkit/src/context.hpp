#include "allocator.hpp"
#include "attr.hpp"
#include "frame.hpp"
#include "layer.hpp"
#include "payload.hpp"
#include "stream_logger.hpp"
#include "variant_map.hpp"
#include <unordered_map>

namespace std {
template <>
struct hash<std::pair<plugkit::Token, uint64_t>> {
  inline size_t operator()(const pair<plugkit::Token, uint64_t> &v) const {
    return v.first + v.second;
  }
};
} // namespace std

namespace plugkit {

struct Context final {
public:
  bool closeStream = false;

  VariantMap options;
  std::unordered_map<std::pair<Token, uint64_t>, Layer *> linkedLayers;

  LoggerPtr logger = std::make_shared<StreamLogger>();

  RootAllocator *rootAllocator = nullptr;
  std::unique_ptr<BlockAllocator<Frame>> frameAllocator;
  std::unique_ptr<BlockAllocator<Layer>> layerAllocator;
  std::unique_ptr<BlockAllocator<Attr>> attrAllocator;
  std::unique_ptr<BlockAllocator<Payload>> payloadAllocator;

  void *data = nullptr;
};

Frame *Context_allocFrame(Context *ctx);
void Context_deallocFrame(Context *ctx, Frame *frame);
Layer *Context_allocLayer(Context *ctx, Token id);
void Context_deallocLayer(Context *ctx, Layer *layer);
Attr *Context_allocAttr(Context *ctx, Token id);
void Context_deallocAttr(Context *ctx, Attr *attr);
Payload *Context_allocPayload(Context *ctx);
void Context_deallocPayload(Context *ctx, Payload *payload);

extern "C" {
/// Allocate a memory block in the current context.
/// @remark Currently, this function is just a wrapper for `malloc()`.
void *Context_alloc(Context *ctx, size_t size);

/// Reallocate a memory block in the current context.
/// @remark Currently, this function is just a wrapper for `realloc()`.
void *Context_realloc(Context *ctx, void *ptr, size_t size);

/// Deallocate a memory block in the current context.
/// @remark Currently, this function is just a wrapper for `free()`.
void Context_dealloc(Context *ctx, void *ptr);

/// Return the value of the option in the current context.
const Variant *Context_getOption(Context *ctx, const char *key);

void Context_closeStream(Context *ctx);

void Context_addLayerLinkage(Context *ctx,
                             Token token,
                             uint64_t id,
                             Layer *layer);
}

} // namespace plugkit
