#include "file_importer_task.hpp"
#include "context.hpp"
#include "file.hpp"
#include "frame.hpp"
#include "layer.hpp"
#include "payload.hpp"
#include "sandbox.hpp"
#include <chrono>
#include <thread>
#include <vector>

namespace plugkit {

namespace {

struct CallbackData {
  int id;
  FileImporterTask::Callback callback;
  std::unordered_map<int, Token> linkLayers;
  std::vector<RawFrame> frames;
};

Frame *createFrame(Context *ctx, Token tag, const RawFrame &raw) {
  auto layer = Context_allocLayer(ctx, tag);
  layer->addTag(tag);

  auto payload = Context_allocPayload(ctx);
  payload->addSlice(Slice{raw.payload, raw.length});
  payload->setRange(Range{0, static_cast<uint32_t>(raw.length)});
  layer->addPayload(payload);

  using namespace std::chrono;
  const Timestamp &ts =
      system_clock::from_time_t(raw.tsSec) + nanoseconds(raw.tsNsec);

  auto frame = Context_allocFrame(ctx);
  frame->setTimestamp(ts);
  frame->setRootLayer(layer);
  frame->setLength(raw.actualLength);
  layer->setFrame(frame);
  return frame;
}

bool apiCallback(Context *ctx, size_t length, double progress) {
  std::vector<Frame *> frames;
  frames.reserve(length);

  const CallbackData *data = static_cast<const CallbackData *>(ctx->data);

  for (size_t i = 0; i < length; ++i) {
    const RawFrame &raw = data->frames[i];
    const auto &linkLayer = data->linkLayers.find(raw.link);
    Token tag;
    if (linkLayer != data->linkLayers.end()) {
      tag = linkLayer->second;
    } else {
      char linkName[32] = "link_";
      snprintf(linkName + 5, sizeof(linkName) - 5, "%u",
               static_cast<unsigned int>(raw.link));
      tag = Token_get_ctx(ctx, linkName);
    }
    frames.push_back(createFrame(ctx, tag, raw));
  }

  data->callback(data->id, frames.data(), frames.size(), progress);
  return true;
}

} // namespace

class FileImporterTask::Private {
public:
  std::string file;
  ConfigMap options;
  LoggerPtr logger = std::make_shared<StreamLogger>();
  Callback callback;
  std::unordered_map<int, Token> linkLayers;
  std::vector<FileImporter> importers;
  std::thread thread;
  RootAllocator *allocator = nullptr;
};

FileImporterTask::FileImporterTask(const std::string &file) : d(new Private()) {
  d->file = file;
}

FileImporterTask::~FileImporterTask() {}

void FileImporterTask::setConfig(const ConfigMap &options) {
  d->options = options;
}

void FileImporterTask::setLogger(const LoggerPtr &logger) {
  d->logger = logger;
}

void FileImporterTask::setAllocator(RootAllocator *allocator) {
  d->allocator = allocator;
}

void FileImporterTask::setCallback(const Callback &callback) {
  d->callback = callback;
}

void FileImporterTask::registerLinkLayer(int link, Token token) {
  d->linkLayers[link] = token;
}

void FileImporterTask::addImporter(const FileImporter &importer) {
  d->importers.push_back(importer);
}

void FileImporterTask::run(int id) {
  Context ctx;
  CallbackData data;
  data.id = id;
  data.callback = d->callback;
  data.linkLayers = d->linkLayers;
  data.frames.resize(10240);
  ctx.logger = d->logger;
  ctx.options = d->options;
  ctx.rootAllocator = d->allocator;
  ctx.data = &data;

  Sandbox::activate(Sandbox::PROFILE_FILE);
  for (const FileImporter &importer : d->importers) {
    if (importer.isSupported && importer.start) {
      if (importer.isSupported(&ctx, d->file.c_str())) {
        importer.start(&ctx, d->file.c_str(), data.frames.data(),
                       data.frames.size(), apiCallback);
        return;
      }
    }
  }
}

} // namespace plugkit
