#include "worker_thread.hpp"
#include "extended_slot.hpp"
#include "plugkit_module.hpp"
#include "wrapper/logger.hpp"
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <map>
#include <mutex>
#include <nan.h>
#include <sstream>
#include <string>
#include <thread>
#include <uv.h>
#include <v8-inspector.h>

namespace plugkit {

class WorkerThread::ArrayBufferAllocator final
    : public v8::ArrayBuffer::Allocator {
public:
  ArrayBufferAllocator() {}
  ~ArrayBufferAllocator() override {}
  void *Allocate(size_t size) override { return calloc(1, size); }
  void *AllocateUninitialized(size_t size) override { return malloc(size); }
  void Free(void *data, size_t) override { free(data); }
};

class WorkerThread::InspectorClient : public v8_inspector::V8InspectorClient {};

class WorkerThread::InspectorChannel
    : public v8_inspector::V8Inspector::Channel {
public:
  InspectorChannel(const InspectorCallback &callback) : callback(callback) {}
  void
  sendResponse(int callId,
               std::unique_ptr<v8_inspector::StringBuffer> message) override {
    const auto &view = message->string();
    const std::string &str = std::string(
        reinterpret_cast<const char *>(view.characters8()), view.length());
    callback(str);
  }
  void sendNotification(
      std::unique_ptr<v8_inspector::StringBuffer> message) override {
    const auto &view = message->string();
    const std::string &str = std::string(
        reinterpret_cast<const char *>(view.characters8()), view.length());
    callback(str);
  }
  void flushProtocolNotifications() override {}

private:
  const InspectorCallback &callback;
};

WorkerThread::WorkerThread() {}

WorkerThread::~WorkerThread() {}

void WorkerThread::join() {
  if (thread.joinable())
    thread.join();
}

void WorkerThread::start() {
  if (thread.joinable())
    return;

  thread = std::thread([this]() {
    logger->log(Logger::LEVEL_DEBUG, "start", "worker_thread");

    v8::Isolate::CreateParams create_params;
    create_params.array_buffer_allocator = new ArrayBufferAllocator();
    v8::Isolate *isolate = v8::Isolate::New(create_params);

    {
      std::unique_ptr<v8::Locker> locker;
      v8::Isolate::Scope isolate_scope(isolate);
      if (v8::Locker::IsActive()) {
        locker.reset(new v8::Locker(isolate));
      }
      v8::HandleScope handle_scope(isolate);

      v8::Local<v8::Context> context = v8::Context::New(isolate);
      v8::Context::Scope context_scope(context);

      std::unique_ptr<v8_inspector::V8InspectorClient> inspectorClient;
      std::unique_ptr<v8_inspector::V8Inspector> inspector;
      std::unique_ptr<v8_inspector::V8Inspector::Channel> channel;
      std::unique_ptr<v8_inspector::V8InspectorSession> session;

      if (!inspectorId.empty()) {
        inspectorClient.reset(new InspectorClient());
        inspector =
            v8_inspector::V8Inspector::create(isolate, inspectorClient.get());
        channel.reset(new InspectorChannel(inspectorCallback));
        session =
            inspector->connect(1, channel.get(), v8_inspector::StringView());
        inspector->contextCreated(v8_inspector::V8ContextInfo(
            context, 1,
            v8_inspector::StringView(
                reinterpret_cast<const uint8_t *>(inspectorId.c_str()),
                inspectorId.size())));
      }

      uv_loop_s uvloop;
      uv_loop_init(&uvloop);

      ExtendedSlot::init(isolate);
      {
        v8::Local<v8::Object> exports = Nan::New<v8::Object>();
        std::unique_ptr<PlugkitModule> mod(
            new PlugkitModule(isolate, exports, false));
        auto global = context->Global();
        global->Set(Nan::New("_plugkit").ToLocalChecked(), exports);
        global->Set(Nan::New("console").ToLocalChecked(),
                    LoggerWrapper::wrap(logger));
        global->Set(
            Nan::New("require").ToLocalChecked(),
            v8::FunctionTemplate::New(
                isolate,
                [](v8::FunctionCallbackInfo<v8::Value> const &info) {
                  if (info[0]->IsString() &&
                      std::strcmp("plugkit", *Nan::Utf8String(info[0])) == 0) {
                    info.GetReturnValue().Set(info.Data());
                  }
                },
                exports)
                ->GetFunction());
        enter();
        while (loop()) {
          uv_run(&uvloop, UV_RUN_NOWAIT);
        }
      }
      exit();
      ExtendedSlot::destroy(isolate);
    }
    isolate->Dispose();
    delete create_params.array_buffer_allocator;
    logger->log(Logger::LEVEL_DEBUG, "exit", "worker_thread");
  });
}

void WorkerThread::setLogger(const LoggerPtr &logger) { this->logger = logger; }

void WorkerThread::setInspector(const std::string &id,
                                const InspectorCallback &callback) {
  inspectorId = id;
  inspectorCallback = callback;
}
} // namespace plugkit
