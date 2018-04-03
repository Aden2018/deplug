#ifndef PLUGKIT_PCAP_HPP
#define PLUGKIT_PCAP_HPP

#include "token.hpp"
#include <functional>
#include <memory>
#include <string>
#include <vector>

namespace plugkit {

struct NetworkInterface {
  std::string id;
  std::string name;
  std::string description;
  int link = 0;
  bool loopback = false;
};

class Frame;
class SessionContext;

class Pcap {
public:
  using Callback = std::function<void(Frame *)>;

public:
  virtual ~Pcap();
  virtual void setCallback(const Callback &callback) = 0;
  virtual void setNetworkInterface(const std::string &id) = 0;
  virtual std::string networkInterface() const = 0;
  virtual void setPromiscuous(bool promisc) = 0;
  virtual bool promiscuous() const = 0;
  virtual void setSnaplen(int len) = 0;
  virtual int snaplen() const = 0;
  virtual bool setBpf(const std::string &filter) = 0;

  virtual std::vector<NetworkInterface> devices() const = 0;
  virtual bool hasPermission() const = 0;
  virtual bool running() const = 0;

  virtual void registerLinkLayer(int link, Token token) = 0;

  virtual bool start() = 0;
  virtual bool stop() = 0;

public:
  static std::unique_ptr<Pcap> create(const SessionContext *sctx);
};
} // namespace plugkit

#endif
