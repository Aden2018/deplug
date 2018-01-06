#include "../src/session.hpp"
#include "plugkit_module.hpp"
#include "session.hpp"

#include "wrapper/frame.hpp"

namespace plugkit {

void SessionWrapper::init(v8::Isolate *isolate) {
  v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  tpl->SetClassName(Nan::New("Session").ToLocalChecked());
  SetPrototypeMethod(tpl, "startPcap", startPcap);
  SetPrototypeMethod(tpl, "stopPcap", stopPcap);
  SetPrototypeMethod(tpl, "destroy", destroy);
  SetPrototypeMethod(tpl, "getFilteredFrames", getFilteredFrames);
  SetPrototypeMethod(tpl, "getFrames", getFrames);
  SetPrototypeMethod(tpl, "importFile", importFile);
  SetPrototypeMethod(tpl, "exportFile", exportFile);
  SetPrototypeMethod(tpl, "sendInspectorMessage", sendInspectorMessage);
  SetPrototypeMethod(tpl, "setDisplayFilter", setDisplayFilter);
  SetPrototypeMethod(tpl, "setStatusCallback", setStatusCallback);
  SetPrototypeMethod(tpl, "setFilterCallback", setFilterCallback);
  SetPrototypeMethod(tpl, "setFrameCallback", setFrameCallback);
  SetPrototypeMethod(tpl, "setLoggerCallback", setLoggerCallback);
  SetPrototypeMethod(tpl, "setInspectorCallback", setInspectorCallback);

  PlugkitModule *module = PlugkitModule::get(isolate);
  module->session.ctor.Reset(isolate, Nan::GetFunction(tpl).ToLocalChecked());

  v8::Local<v8::ObjectTemplate> otl = tpl->InstanceTemplate();
  Nan::SetAccessor(otl, Nan::New("networkInterface").ToLocalChecked(),
                   networkInterface);
  Nan::SetAccessor(otl, Nan::New("promiscuous").ToLocalChecked(), promiscuous);
  Nan::SetAccessor(otl, Nan::New("snaplen").ToLocalChecked(), snaplen);
  Nan::SetAccessor(otl, Nan::New("id").ToLocalChecked(), id);
}

SessionWrapper::SessionWrapper(const std::shared_ptr<Session> &session)
    : session(session) {}

SessionWrapper::~SessionWrapper() {}

NAN_METHOD(SessionWrapper::New) { info.GetReturnValue().Set(info.This()); }

NAN_GETTER(SessionWrapper::networkInterface) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    info.GetReturnValue().Set(
        Nan::New(session->networkInterface()).ToLocalChecked());
  }
}

NAN_GETTER(SessionWrapper::promiscuous) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    info.GetReturnValue().Set(session->promiscuous());
  }
}

NAN_GETTER(SessionWrapper::snaplen) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    info.GetReturnValue().Set(session->snaplen());
  }
}

NAN_METHOD(SessionWrapper::startPcap) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    info.GetReturnValue().Set(session->startPcap());
  }
}

NAN_METHOD(SessionWrapper::stopPcap) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    info.GetReturnValue().Set(session->stopPcap());
  }
}

NAN_GETTER(SessionWrapper::id) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    info.GetReturnValue().Set(session->id());
  }
}

NAN_METHOD(SessionWrapper::destroy) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  wrapper->session.reset();
  wrapper->statusCallback.Reset();
  wrapper->filterCallback.Reset();
  wrapper->frameCallback.Reset();
  wrapper->loggerCallback.Reset();
}

NAN_METHOD(SessionWrapper::getFilteredFrames) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    const std::string &name = *Nan::Utf8String(info[0]);
    uint32_t offset = info[1]->Uint32Value();
    uint32_t length = info[2]->Uint32Value();
    const auto &frames = session->getFilteredFrames(name, offset, length);
    auto array = Nan::New<v8::Array>(frames.size());
    for (size_t i = 0; i < frames.size(); ++i) {
      array->Set(i, Nan::New(frames[i]));
    }
    info.GetReturnValue().Set(array);
  }
}

NAN_METHOD(SessionWrapper::getFrames) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    uint32_t offset = info[0]->Uint32Value();
    uint32_t length = info[1]->Uint32Value();
    const auto &frames = session->getFrames(offset, length);
    auto array = Nan::New<v8::Array>(frames.size());
    for (size_t i = 0; i < frames.size(); ++i) {
      array->Set(i, FrameWrapper::wrap(frames[i]));
    }
    info.GetReturnValue().Set(array);
  }
}

NAN_METHOD(SessionWrapper::importFile) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    const std::string &file = *Nan::Utf8String(info[0]);
    session->importFile(file);
  }
}

NAN_METHOD(SessionWrapper::exportFile) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    const std::string &file = *Nan::Utf8String(info[0]);
    const std::string &filter = *Nan::Utf8String(info[1]);
    session->exportFile(file, filter);
  }
}

NAN_METHOD(SessionWrapper::setDisplayFilter) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    const std::string &name = *Nan::Utf8String(info[0]);
    const std::string &body = *Nan::Utf8String(info[1]);
    session->setDisplayFilter(name, body);
  }
}

NAN_METHOD(SessionWrapper::sendInspectorMessage)
{
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    const std::string &id = *Nan::Utf8String(info[0]);
    const std::string &msg = *Nan::Utf8String(info[1]);
    session->sendInspectorMessage(id, msg);
  }
}

NAN_METHOD(SessionWrapper::setStatusCallback) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    if (info[0]->IsFunction()) {
      wrapper->statusCallback.Reset(v8::Isolate::GetCurrent(),
                                    info[0].As<v8::Function>());

      session->setStatusCallback([wrapper](const Session::Status &status) {
        v8::Isolate *isolate = v8::Isolate::GetCurrent();
        auto func =
            v8::Local<v8::Function>::New(isolate, wrapper->statusCallback);
        if (!func.IsEmpty()) {
          auto obj = Nan::New<v8::Object>();
          obj->Set(Nan::New("capture").ToLocalChecked(),
                   Nan::New(status.capture));
          obj->Set(Nan::New("importerProgress").ToLocalChecked(),
                   Nan::New(status.importerProgress));
          obj->Set(Nan::New("exporterProgress").ToLocalChecked(),
                   Nan::New(status.exporterProgress));
          v8::Local<v8::Value> args[1] = {obj};
          func->Call(obj, 1, args);
        }
      });
    }
  }
}

NAN_METHOD(SessionWrapper::setFilterCallback) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    if (info[0]->IsFunction()) {
      wrapper->filterCallback.Reset(v8::Isolate::GetCurrent(),
                                    info[0].As<v8::Function>());
      session->setFilterCallback(
          [wrapper](const Session::FilterStatusMap &status) {
            v8::Isolate *isolate = v8::Isolate::GetCurrent();
            auto func =
                v8::Local<v8::Function>::New(isolate, wrapper->filterCallback);
            if (!func.IsEmpty()) {
              auto obj = Nan::New<v8::Object>();

              for (const auto &pair : status) {
                auto filter = Nan::New<v8::Object>();
                filter->Set(Nan::New("frames").ToLocalChecked(),
                            Nan::New(pair.second.frames));
                obj->Set(Nan::New(pair.first).ToLocalChecked(), filter);
              }

              v8::Local<v8::Value> args[1] = {obj};
              func->Call(obj, 1, args);
            }
          });
    }
  }
}

NAN_METHOD(SessionWrapper::setFrameCallback) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    if (info[0]->IsFunction()) {
      wrapper->frameCallback.Reset(v8::Isolate::GetCurrent(),
                                   info[0].As<v8::Function>());
      session->setFrameCallback([wrapper](const Session::FrameStatus &status) {
        v8::Isolate *isolate = v8::Isolate::GetCurrent();
        auto func =
            v8::Local<v8::Function>::New(isolate, wrapper->frameCallback);
        if (!func.IsEmpty()) {
          auto obj = Nan::New<v8::Object>();
          obj->Set(Nan::New("frames").ToLocalChecked(),
                   Nan::New(status.frames));
          v8::Local<v8::Value> args[1] = {obj};
          func->Call(obj, 1, args);
        }
      });
    }
  }
}

NAN_METHOD(SessionWrapper::setLoggerCallback) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    if (info[0]->IsFunction()) {
      wrapper->loggerCallback.Reset(v8::Isolate::GetCurrent(),
                                    info[0].As<v8::Function>());
      session->setLoggerCallback([wrapper](Logger::MessagePtr &&msg) {
        v8::Isolate *isolate = v8::Isolate::GetCurrent();
        auto func =
            v8::Local<v8::Function>::New(isolate, wrapper->loggerCallback);
        if (!func.IsEmpty()) {
          auto obj = Nan::New<v8::Object>();
          obj->Set(Nan::New("message").ToLocalChecked(),
                   Nan::New(msg->toString()).ToLocalChecked());
          v8::Local<v8::Value> args[1] = {obj};
          func->Call(obj, 1, args);
        }
      });
    }
  }
}

NAN_METHOD(SessionWrapper::setInspectorCallback) {
  SessionWrapper *wrapper = ObjectWrap::Unwrap<SessionWrapper>(info.Holder());
  if (const auto &session = wrapper->session) {
    if (info[0]->IsFunction()) {
      wrapper->inspectorCallback.Reset(v8::Isolate::GetCurrent(),
                                    info[0].As<v8::Function>());
      session->setInspectorCallback([wrapper](std::string id, std::string msg) {
        v8::Isolate *isolate = v8::Isolate::GetCurrent();
        auto func =
            v8::Local<v8::Function>::New(isolate, wrapper->loggerCallback);
        if (!func.IsEmpty()) {
          auto obj = Nan::New<v8::Object>();
          obj->Set(Nan::New("id").ToLocalChecked(),
                   Nan::New(id).ToLocalChecked());
         obj->Set(Nan::New("msg").ToLocalChecked(),
                  Nan::New(msg).ToLocalChecked());
          v8::Local<v8::Value> args[1] = {obj};
          func->Call(obj, 1, args);
        }
      });
    }
  }
}

v8::Local<v8::Object>
SessionWrapper::wrap(const std::shared_ptr<Session> &session) {
  v8::Isolate *isolate = v8::Isolate::GetCurrent();
  PlugkitModule *module = PlugkitModule::get(isolate);
  auto cons = v8::Local<v8::Function>::New(isolate, module->session.ctor);
  v8::Local<v8::Object> obj =
      cons->NewInstance(v8::Isolate::GetCurrent()->GetCurrentContext(), 0,
                        nullptr)
          .ToLocalChecked();
  SessionWrapper *wrapper = new SessionWrapper(session);
  wrapper->Wrap(obj);
  return obj;
}

std::shared_ptr<const Session>
SessionWrapper::unwrap(v8::Local<v8::Value> value) {
  if (value.IsEmpty() || !value->IsObject())
    return nullptr;
  if (auto wrapper =
          ObjectWrap::Unwrap<SessionWrapper>(value.As<v8::Object>())) {
    return wrapper->session;
  }
  return std::shared_ptr<Session>();
}
} // namespace plugkit
