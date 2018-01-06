#ifndef PLUGKIT_FILTER_THREAD_POOL_H
#define PLUGKIT_FILTER_THREAD_POOL_H

#include "variant_map.hpp"
#include <functional>
#include <memory>
#include <unordered_map>
#include <vector>

namespace plugkit {

class Logger;
using LoggerPtr = std::shared_ptr<Logger>;

class FrameStore;
using FrameStorePtr = std::shared_ptr<FrameStore>;

class FilterThreadPool final {
public:
  using Callback = std::function<void()>;

public:
  FilterThreadPool(const std::string &body,
                   const VariantMap &options,
                   const FrameStorePtr &store,
                   const Callback &callback);
  ~FilterThreadPool();
  void start();
  void setLogger(const LoggerPtr &logger);

  void sendInspectorMessage(const std::string &id, const std::string &msg);
  std::vector<std::string> inspectors() const;

  std::vector<uint32_t> get(uint32_t offset, uint32_t length) const;
  uint32_t size() const;
  uint32_t maxSeq() const;

private:
  FilterThreadPool(const FilterThreadPool &) = delete;
  FilterThreadPool &operator=(const FilterThreadPool &) = delete;

private:
  class Private;
  std::unique_ptr<Private> d;
};
} // namespace plugkit

#endif
