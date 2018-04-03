#include "context.hpp"
#include "attr.hpp"
#include "session_context.hpp"
#include <cstdarg>
#include <cstdio>

namespace plugkit {

namespace {
const auto nextToken = Token_get("--next");
const auto prevToken = Token_get("--prev");
} // namespace

Context::Context(const SessionContext *sctx) : sctx(sctx) {}

Frame *Context_allocFrame(Context *ctx) {
  if (!ctx->frameAllocator) {
    ctx->frameAllocator.reset(
        new BlockAllocator<Frame>(ctx->sctx->allocator()));
  }
  return ctx->frameAllocator->alloc();
}

void Context_deallocFrame(Context *ctx, Frame *frame) {
  ctx->frameAllocator->dealloc(frame);
}

Layer *Context_allocLayer(Context *ctx, Token id) {
  if (!ctx->layerAllocator) {
    ctx->layerAllocator.reset(
        new BlockAllocator<Layer>(ctx->sctx->allocator()));
  }
  return ctx->layerAllocator->alloc(id);
}

void Context_deallocLayer(Context *ctx, Layer *layer) {
  ctx->layerAllocator->dealloc(layer);
}

Attr *Context_allocAttr(Context *ctx, Token id) {
  if (!ctx->attrAllocator) {
    ctx->attrAllocator.reset(new BlockAllocator<Attr>(ctx->sctx->allocator()));
  }
  return ctx->attrAllocator->alloc(id);
}

void Context_deallocAttr(Context *ctx, Attr *attr) {
  ctx->attrAllocator->dealloc(attr);
}

Payload *Context_allocPayload(Context *ctx) {
  if (!ctx->payloadAllocator) {
    ctx->payloadAllocator.reset(
        new BlockAllocator<Payload>(ctx->sctx->allocator()));
  }
  return ctx->payloadAllocator->alloc();
}

void Context_deallocPayload(Context *ctx, Payload *payload) {
  ctx->payloadAllocator->dealloc(payload);
}

const char *Context_getConfig(Context *ctx, const char *key, size_t length) {
  const auto &value = ctx->sctx->config()[std::string(key, length)];
  return value.c_str();
}

void Context_closeStream(Context *ctx) { ctx->closeStream = true; }

void Context_addLayerLinkage(Context *ctx,
                             Token token,
                             uint64_t id,
                             Layer *layer) {
  const auto &pair = std::make_pair(token, id);
  auto it = ctx->linkedLayers.find(pair);
  if (it != ctx->linkedLayers.end()) {
    Context::PrevLayer prev = it->second;
    Attr *attr = Context_allocAttr(ctx, prevToken);
    attr->setType(prevToken);
    attr->value() = Variant::fromAddress(prev.layer);
    layer->addAttr(attr);
    prev.attr->value().storeAddress(layer);
  }
  Attr *attr = Context_allocAttr(ctx, nextToken);
  attr->setType(nextToken);
  attr->value() = Variant::fromAddress(nullptr);
  layer->addAttr(attr);
  ctx->linkedLayers[pair] = Context::PrevLayer{layer, attr};
}

namespace {
void Log(Context *ctx,
         const char *file,
         int line,
         Logger::Level level,
         const char *message) {
  Logger::MessagePtr msg(new Logger::Message());
  msg->level = level;
  msg->domain = "core:dissector";
  msg->message = message;
  msg->resourceName = file;
  msg->lineNumber = line;
  msg->trivial = level != Logger::LEVEL_ERROR;
  if (auto logger = ctx->sctx->logger()) {
    logger->log(std::move(msg));
  }
}
} // namespace

void Log_debug_(
    Context *ctx, const char *file, int line, const char *format, ...) {
  char buffer[2048];
  va_list args;
  va_start(args, format);
  vsnprintf(buffer, sizeof(buffer), format, args);
  va_end(args);
  Log(ctx, file, line, Logger::LEVEL_DEBUG, buffer);
}
void Log_warn_(
    Context *ctx, const char *file, int line, const char *format, ...) {
  char buffer[2048];
  va_list args;
  va_start(args, format);
  vsnprintf(buffer, sizeof(buffer), format, args);
  va_end(args);
  Log(ctx, file, line, Logger::LEVEL_WARN, buffer);
}
void Log_info_(
    Context *ctx, const char *file, int line, const char *format, ...) {
  char buffer[2048];
  va_list args;
  va_start(args, format);
  vsnprintf(buffer, sizeof(buffer), format, args);
  va_end(args);
  Log(ctx, file, line, Logger::LEVEL_INFO, buffer);
}
void Log_error_(
    Context *ctx, const char *file, int line, const char *format, ...) {
  char buffer[2048];
  va_list args;
  va_start(args, format);
  vsnprintf(buffer, sizeof(buffer), format, args);
  va_end(args);
  Log(ctx, file, line, Logger::LEVEL_ERROR, buffer);
}
} // namespace plugkit
