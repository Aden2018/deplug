#ifndef PLUGKIT_SESSION_FACTORY_WRAPPER_H
#define PLUGKIT_SESSION_FACTORY_WRAPPER_H

#include <memory>
#include <nan.h>

namespace plugkit {

class SessionFactory;
using SessionFactoryPtr = std::shared_ptr<SessionFactory>;

class SessionFactoryWrapper final : public Nan::ObjectWrap {
public:
  static void init(v8::Isolate *isolate, v8::Local<v8::Object> exports);
  static v8::Local<v8::Object> wrap(const SessionFactoryPtr &factory);
  static SessionFactoryPtr unwrap(v8::Local<v8::Value> value);
  static NAN_METHOD(New);
  static NAN_GETTER(networkInterface);
  static NAN_SETTER(setNetworkInterface);
  static NAN_GETTER(promiscuous);
  static NAN_SETTER(setPromiscuous);
  static NAN_GETTER(snaplen);
  static NAN_SETTER(setSnaplen);
  static NAN_GETTER(bpf);
  static NAN_SETTER(setBpf);
  static NAN_METHOD(setOptions);
  static NAN_METHOD(registerLinkLayer);
  static NAN_METHOD(registerScriptDissector);
  static NAN_METHOD(registerDissector);
  static NAN_METHOD(registerImporter);
  static NAN_METHOD(registerExporter);
  static NAN_METHOD(create);

private:
  SessionFactoryWrapper(const SessionFactoryPtr &factory);
  SessionFactoryWrapper(const SessionFactoryWrapper &) = delete;
  SessionFactoryWrapper &operator=(const SessionFactoryWrapper &) = delete;

private:
  SessionFactoryPtr factory;
};
} // namespace plugkit

#endif
