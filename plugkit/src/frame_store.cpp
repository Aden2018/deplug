#include "frame_store.hpp"
#include "allocator.hpp"
#include "frame.hpp"
#include "frame_view.hpp"
#include <condition_variable>
#include <map>
#include <mutex>
#include <unordered_set>
#include <vector>

namespace plugkit {

class FrameStore::Private {
public:
  Private();
  ~Private();

public:
  std::map<uint32_t, Frame *> sequence;
  std::vector<Frame *> frames;
  std::vector<const FrameView *> views;
  uint32_t maxSeq = 0;
  std::mutex mutex;
  std::condition_variable cond;
  std::unordered_set<std::thread::id> closedThreads;
  std::unique_ptr<BlockAllocator<FrameView>> frameViewAllocator;
  bool closed = false;
  Callback callback;
};

FrameStore::Private::Private() {}

FrameStore::Private::~Private() {}

FrameStore::FrameStore() : d(new Private()) {}

FrameStore::~FrameStore() { close(); }

void FrameStore::insert(Frame **begin, size_t size) {
  std::lock_guard<std::mutex> lock(d->mutex);
  for (size_t i = 0; i < size; ++i) {
    d->sequence[begin[i]->index()] = begin[i];
  }
  uint32_t maxSeq = d->maxSeq;
  auto end = d->sequence.begin();
  for (auto it = d->sequence.find(maxSeq + 1); it != d->sequence.end();
       end = it, it = d->sequence.find(++maxSeq + 1)) {
    d->frames.push_back(it->second);
  }
  if (d->maxSeq < maxSeq) {
    d->callback();
    d->maxSeq = maxSeq;
    d->sequence.erase(d->sequence.begin(), end);
    d->cond.notify_all();
  }
}

size_t FrameStore::dequeue(size_t offset, size_t max, const Frame **dst) const {
  std::unique_lock<std::mutex> lock(d->mutex);
  size_t read = 0;
  uint32_t size = d->frames.size();
  if (size <= offset) {
    d->cond.wait(lock, [this, offset, &size]() -> bool {
      return d->closed || ((size = d->frames.size()) > offset);
    });
  }
  if (d->closed)
    return 0;
  for (size_t i = 0; i + offset < size && i < max; ++i, ++read) {
    dst[i] = d->frames[i + offset];
  }
  return read;
}

bool FrameStore::dequeue(size_t offset,
                         size_t *size,
                         const FrameView **dst,
                         std::thread::id id,
                         int waitFor) const {
  std::unique_lock<std::mutex> lock(d->mutex);
  size_t read = 0;
  uint32_t frameSize = d->views.size();
  if (frameSize <= offset) {
    d->cond.wait_for(lock, std::chrono::milliseconds(waitFor),
                     [this, offset, id, &frameSize]() -> bool {
                       bool closed = ((id != std::thread::id()) &&
                                      d->closedThreads.count(id) > 0);
                       return d->closed || closed ||
                              ((frameSize = d->views.size()) > offset);
                     });
  }
  if (id != std::thread::id() && d->closedThreads.count(id) > 0) {
    d->closedThreads.erase(id);
    return false;
  }
  if (d->closed)
    return false;
  for (size_t i = 0; i + offset < frameSize && i < *size; ++i, ++read) {
    dst[i] = d->views[i + offset];
  }
  *size = read;
  return true;
}

std::vector<const FrameView *> FrameStore::get(uint32_t offset,
                                               uint32_t length) const {
  std::vector<const FrameView *> views;
  std::unique_lock<std::mutex> lock(d->mutex);
  for (size_t i = offset; i < offset + length && i < d->views.size(); ++i) {
    views.push_back(d->views[i]);
  }
  return views;
}

size_t FrameStore::dissectedSize() const {
  std::unique_lock<std::mutex> lock(d->mutex);
  return d->views.size();
}

void FrameStore::update(uint32_t index) {
  {
    std::unique_lock<std::mutex> lock(d->mutex);
    size_t size = d->views.size();
    d->views.resize(index);
    for (size_t i = size; i < index; ++i) {
      d->views[i] = d->frameViewAllocator->alloc(d->frames[i]);
    }
  }
  d->callback();
  d->cond.notify_all();
}

void FrameStore::close(std::thread::id id) {
  std::lock_guard<std::mutex> lock(d->mutex);
  if (id == std::thread::id()) {
    d->closed = true;
  } else {
    d->closedThreads.insert(id);
  }
  d->cond.notify_all();
}

void FrameStore::setCallback(const Callback &callback) {
  d->callback = callback;
}

void FrameStore::setAllocator(RootAllocator *allocator) {
  d->frameViewAllocator.reset(new BlockAllocator<FrameView>(allocator));
}
} // namespace plugkit
