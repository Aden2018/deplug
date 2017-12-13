#include "file_exporter_thread.hpp"
#include "context.hpp"
#include "file.h"
#include "filter.hpp"
#include "frame.hpp"
#include "frame_store.hpp"
#include "frame_view.hpp"
#include "layer.hpp"
#include "worker_thread.hpp"
#include <chrono>
#include <thread>
#include <vector>

namespace plugkit {

namespace {
struct ContextData {
  FrameStorePtr store;
  FileExporterThread::Callback callback;
  std::unordered_map<Token, int> linkLayers;
  std::vector<FileExporter> exporters;
  std::vector<RawFrame> frames;
  std::string file;
  std::string filterBody;
  Filter *filter = nullptr;
  size_t length = 0;
  size_t offset = 0;
};

RawFrame createRawFrame(const ContextData *data, const Frame *frame) {
  RawFrame raw;
  raw.data = nullptr;
  raw.length = 0;

  const Layer *root = frame->rootLayer();
  const auto &payloads = root->payloads();
  if (!payloads.empty()) {
    const auto &slices = payloads[0]->slices();
    if (!slices.empty()) {
      const auto &slice = slices[0];
      raw.data = slice.begin;
      raw.length = slice.end - slice.begin;
    }
  }

  raw.link = 0;
  auto it = data->linkLayers.find(root->id());
  if (it != data->linkLayers.end()) {
    raw.link = it->second;
  }

  auto nano = std::chrono::duration_cast<std::chrono::nanoseconds>(
                  frame->timestamp().time_since_epoch())
                  .count();

  raw.actualLength = frame->length();
  raw.tsSec = nano / 1000000000;
  raw.tsNsec = nano % 1000000000;
  raw.root = frame->rootLayer();
  return raw;
}

const RawFrame *apiCallback(Context *ctx, size_t *length) {
  ContextData *data = static_cast<ContextData *>(ctx->data);
  size_t size = 1024;
  if (data->offset + size >= data->length) {
    size = data->length - data->offset;
  }
  *length = size;
  data->callback(1.0 * data->offset / data->length);
  if (size == 0) {
    return nullptr;
  }
  const std::vector<const FrameView *> views =
      data->store->get(data->offset, size);
  data->frames.resize(size);

  std::vector<char> results;
  if (data->filter) {
    results.resize(views.size());
    data->filter->test(results.data(), views.data(), views.size());
  }
  for (size_t i = 0; i < size; ++i) {
    if (!data->filter || results[i]) {
      data->frames[i] = createRawFrame(data, views[i]->frame());
    }
  }
  data->offset += size;
  return data->frames.data();
}

class FileExporterWorkerThread : public WorkerThread {
public:
  FileExporterWorkerThread(const ContextData &data) : data(data) {}

  ~FileExporterWorkerThread() {}

  void enter() override {
    if (!data.filterBody.empty()) {
      filter.reset(new Filter(data.filterBody));
    }
  }
  bool loop() override {
    Context ctx;
    data.filter = filter.get();
    ctx.data = &data;

    for (const FileExporter &exporter : data.exporters) {
      if (!exporter.func)
        continue;
      FileStatus status = exporter.func(&ctx, data.file.c_str(), apiCallback);
      if (status != FILE_STATUS_UNSUPPORTED) {
        break;
      }
    }
    return false;
  }
  void exit() override { filter.reset(); }

private:
  ContextData data;
  std::unique_ptr<Filter> filter;
};

} // namespace

class FileExporterThread::Private {
public:
  Callback callback;
  LoggerPtr logger = std::make_shared<StreamLogger>();
  std::unordered_map<Token, int> linkLayers;
  std::unique_ptr<FileExporterWorkerThread> worker;
  std::vector<FileExporter> exporters;
  std::thread thread;
  FrameStorePtr store;
};

FileExporterThread::FileExporterThread(const FrameStorePtr &store)
    : d(new Private()) {
  d->store = store;
}

FileExporterThread::~FileExporterThread() {
  if (d->worker) {
    d->worker->join();
  }
}

void FileExporterThread::setLogger(const LoggerPtr &logger) {
  d->logger = logger;
}

void FileExporterThread::registerLinkLayer(Token token, int link) {
  d->linkLayers[token] = link;
}

void FileExporterThread::setCallback(const Callback &callback) {
  d->callback = callback;
}

void FileExporterThread::addExporter(const FileExporter &exporters) {
  d->exporters.push_back(exporters);
}

bool FileExporterThread::start(const std::string &file,
                               const std::string &filter) {
  d->callback(0.0);

  if (d->store->dissectedSize() == 0) {
    d->callback(1.0);
    return true;
  }

  if (d->worker) {
    d->worker->join();
  }

  ContextData data;
  data.callback = d->callback;
  data.store = d->store;
  data.length = d->store->dissectedSize();
  data.linkLayers = d->linkLayers;
  data.exporters = d->exporters;
  data.file = file;
  data.filterBody = filter;

  d->worker.reset(new FileExporterWorkerThread(data));
  d->worker->setLogger(d->logger);
  d->worker->start();
  return true;
}

} // namespace plugkit
