#ifndef PLUGKIT_SESSION_CONTEXT_H
#define PLUGKIT_SESSION_CONTEXT_H

#include <memory>

namespace plugkit {
struct SharedContextWrapper;
class ConfigMap;
class Logger;
using LoggerPtr = std::shared_ptr<Logger>;

class SessionContext {
public:
  SessionContext();
  ~SessionContext();
  SharedContextWrapper *context() const;
  const LoggerPtr &logger() const;
  void setLogger(const LoggerPtr &logger);
  const ConfigMap &config() const;
  void setConfig(const ConfigMap &config);

private:
  class Private;
  std::unique_ptr<Private> d;
};
} // namespace plugkit

#endif