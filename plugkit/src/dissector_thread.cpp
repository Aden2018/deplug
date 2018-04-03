#include "dissector_thread.hpp"
#include "context.hpp"
#include "dissector.hpp"
#include "frame.hpp"
#include "layer.hpp"
#include "sandbox.hpp"
#include "session_context.hpp"
#include "tag_filter.hpp"
#include <algorithm>
#include <array>
#include <cstring>
#include <unordered_map>
#include <unordered_set>

namespace plugkit {

namespace {

struct DissectorContext {
  const Dissector *dissector = nullptr;
  TagFilter filter;
  Worker worker;
};
} // namespace

class DissectorThread::Private {
public:
  Private(const SessionContext *sctx,
          const FrameQueuePtr &queue,
          const Callback &callback);
  ~Private();

public:
  std::vector<Dissector> dissectors;
  std::vector<DissectorContext> dissectorContexts;

  Context ctx;
  const ConfigMap options;
  const FrameQueuePtr queue;
  const Callback callback;
};

DissectorThread::Private::Private(const SessionContext *sctx,
                                  const FrameQueuePtr &queue,
                                  const Callback &callback)
    : ctx(sctx), queue(queue), callback(callback) {}

DissectorThread::Private::~Private() {}

DissectorThread::DissectorThread(const SessionContext *sctx,
                                 const FrameQueuePtr &queue,
                                 const Callback &callback)
    : WorkerThread(sctx), d(new Private(sctx, queue, callback)) {
  d->ctx.confidenceThreshold = static_cast<LayerConfidence>(
      std::stoi(sctx->config()["_.dissector.confidenceThreshold"]));
}

DissectorThread::~DissectorThread() {}

void DissectorThread::pushDissector(const Dissector &diss) {
  d->dissectors.push_back(diss);
}

void DissectorThread::enter() {
  for (auto &diss : d->dissectors) {
    if (diss.initialize) {
      diss.initialize(&d->ctx, &diss);
    }
  }

  for (const auto &diss : d->dissectors) {
    DissectorContext data;
    data.dissector = &diss;

    std::vector<Token> tags;
    for (Token tag : data.dissector->layerHints) {
      if (tag != Token_null()) {
        tags.push_back(tag);
      }
    }
    if (tags.empty()) {
      continue;
    }
    data.worker.data = nullptr;
    data.filter = TagFilter(tags);
    d->dissectorContexts.push_back(data);
  }

  Sandbox::activate(Sandbox::PROFILE_DISSECTOR);
}

bool DissectorThread::loop() {
  std::array<Frame *, 128> frames;
  size_t size = frames.size();

  const int waitFor = inspectorActivated() ? 0 : 3000;
  if (!d->queue->dequeue(std::begin(frames), &size, waitFor)) {
    return false;
  }

  for (size_t i = 0; i < size; ++i) {
    std::unordered_set<Token> dissectedIds;

    Frame *frame = frames[i];
    const auto &rootLayer = frame->rootLayer();
    if (!rootLayer)
      continue;

    std::vector<Layer *> leafLayers = {rootLayer};
    while (!leafLayers.empty()) {
      std::vector<Layer *> nextlayers;
      for (const auto &layer : leafLayers) {
        std::unordered_set<const DissectorContext *> usedDissectors;
        dissectedIds.insert(layer->id());

        while (true) {
          std::vector<DissectorContext *> dissectorContexts;
          for (DissectorContext &data : d->dissectorContexts) {
            if (usedDissectors.find(&data) == usedDissectors.end() &&
                data.filter.match(layer->tags())) {
              dissectorContexts.push_back(&data);
              usedDissectors.insert(&data);
            }
          }

          if (dissectorContexts.empty())
            break;

          for (DissectorContext *data : dissectorContexts) {
            const Dissector *diss = data->dissector;
            if (diss->createWorker && !data->worker.data) {
              data->worker = diss->createWorker(&d->ctx, diss);
            }
            if (diss->examine(&d->ctx, diss, data->worker, layer) <
                d->ctx.confidenceThreshold) {
              continue;
            }
            diss->analyze(&d->ctx, diss, data->worker, layer);
            for (Layer *childLayer : layer->layers()) {
              auto it = dissectedIds.find(childLayer->id());
              if (it == dissectedIds.end()) {
                nextlayers.push_back(childLayer);
              }
            }
          }
        }
      }
      leafLayers.swap(nextlayers);
    }
  }

  if (size > 0 && d->callback) {
    d->callback(&frames.front(), size);
  }

  return true;
}

void DissectorThread::exit() {
  for (auto &diss : d->dissectors) {
    if (diss.terminate) {
      diss.terminate(&d->ctx, &diss);
    }
  }
  d->dissectorContexts.clear();
}
} // namespace plugkit
