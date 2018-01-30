#ifndef PLUGKIT_FILE_IMPORTEER_THREAD_H
#define PLUGKIT_FILE_IMPORTEER_THREAD_H

#include "token.hpp"
#include "variant_map.hpp"
#include <functional>
#include <memory>
#include <string>

namespace plugkit {

class Frame;
struct FileImporter;

class RootAllocator;

class FileImporterThread final {
public:
  using Callback = std::function<void(int, Frame **, size_t, double)>;

public:
  FileImporterThread();
  ~FileImporterThread();
  void setOptions(const VariantMap &options);
  void setCallback(const Callback &callback);
  void setAllocator(RootAllocator *allocator);
  void registerLinkLayer(int link, Token token);
  void addImporter(const FileImporter &importer);
  int start(const std::string &file);

private:
  class Private;
  std::unique_ptr<Private> d;
};

} // namespace plugkit

#endif
