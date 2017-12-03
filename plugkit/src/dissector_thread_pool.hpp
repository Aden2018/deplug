#ifndef PLUGKIT_DISSECTOR_THREAD_POOL_H
#define PLUGKIT_DISSECTOR_THREAD_POOL_H

#include "queue.hpp"
#include <functional>
#include <memory>
#include <unordered_map>

namespace plugkit {

class Logger;
using LoggerPtr = std::shared_ptr<Logger>;

class Frame;

struct Dissector;

struct Variant;
using OptionMap = std::unordered_map<std::string, Variant>;

class DissectorThreadPool final {
public:
  using Callback = std::function<void(Frame **, size_t)>;

public:
  DissectorThreadPool(const OptionMap &options, const Callback &callback);
  ~DissectorThreadPool();
  DissectorThreadPool(const DissectorThreadPool &) = delete;
  DissectorThreadPool &operator=(const DissectorThreadPool &) = delete;
  void start();
  void registerDissector(const Dissector &diss);
  void setLogger(const LoggerPtr &logger);
  void push(Frame **begin, size_t length);

private:
  class Private;
  std::unique_ptr<Private> d;
};
} // namespace plugkit

#endif
