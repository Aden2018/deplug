#ifndef PLUGKIT_PCAP_DUMMY_HPP
#define PLUGKIT_PCAP_DUMMY_HPP

#include "pcap.hpp"

namespace plugkit {

class PcapDummy final : public Pcap {
public:
  PcapDummy(const SessionContext *sctx, int link = 1);
  ~PcapDummy();
  PcapDummy(const PcapDummy &) = delete;
  PcapDummy &operator=(const PcapDummy &) = delete;

  void setCallback(const Callback &callback) override;

  void setNetworkInterface(const std::string &id) override;
  std::string networkInterface() const override;
  void setPromiscuous(bool promisc) override;
  bool promiscuous() const override;
  void setSnaplen(int len) override;
  int snaplen() const override;
  bool setBpf(const std::string &filter) override;

  std::vector<NetworkInterface> devices() const override;
  bool hasPermission() const override;
  bool running() const override;

  void registerLinkLayer(int link, Token token) override;

  bool start() override;
  bool stop() override;

private:
  class Private;
  std::unique_ptr<Private> d;
};
} // namespace plugkit

#endif
