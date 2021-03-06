#ifndef PLUGKIT_FILE_EXPORTER_THREAD_H
#define PLUGKIT_FILE_EXPORTER_THREAD_H

#include "task.hpp"
#include "token.hpp"
#include <functional>
#include <memory>
#include <string>

namespace plugkit {

class Frame;
struct FileExporter;

class FrameStore;
using FrameStorePtr = std::shared_ptr<FrameStore>;

class SessionContext;

class FileExporterTask final : public Task {
public:
  using Callback = std::function<void(int, double)>;

public:
  FileExporterTask(const SessionContext *sctx,
                   const std::string &file,
                   const std::string &filter,
                   const FrameStorePtr &store);
  ~FileExporterTask();
  void run(int id) override;
  void setCallback(const Callback &callback);
  void addExporter(const FileExporter &exporter);
  void registerLinkLayer(Token token, int link);

private:
  class Private;
  std::unique_ptr<Private> d;
};

} // namespace plugkit

#endif
