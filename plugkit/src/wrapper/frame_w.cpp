#include "../frame.hpp"
#include "../layer.hpp"
#include "frame.hpp"
#include "frame_view.hpp"
#include "layer.hpp"
#include "plugkit_module.hpp"
#include "wrapper/attr.hpp"
#include <vector>

namespace plugkit {

namespace {

const auto frameToken = Token_get("_");
const auto tsToken = Token_get("_.timestamp");
const auto payloadToken = Token_get("_.payload");
const auto actLenToken = Token_get("_.actualLength");
const auto indexToken = Token_get("_.index");
const auto errorToken = Token_get("_.error");
const auto dateToken = Token_get("@date:unix");

bool virtualAttr(Token id,
                 const FrameView *view,
                 const FrameWrapper *wrapper,
                 Nan::ReturnValue<v8::Value> ret) {
  if (id == frameToken) {
    ret.Set(FrameWrapper::wrap(view));
  } else if (id == tsToken) {
    ret.Set(AttrWrapper::wrap(&wrapper->tsAttr));
  } else if (id == payloadToken) {
    ret.Set(AttrWrapper::wrap(&wrapper->payloadAttr));
  } else if (id == actLenToken) {
    ret.Set(AttrWrapper::wrap(&wrapper->actLenAttr));
  } else if (id == indexToken) {
    ret.Set(AttrWrapper::wrap(&wrapper->indexAttr));
  } else if (id == errorToken) {
    if (const Layer *layer = view->primaryLayer()) {
      ret.Set(Nan::New(Token_string(layer->error())).ToLocalChecked());
    }
  } else {
    return false;
  }
  return true;
}

} // namespace

void FrameWrapper::init(v8::Isolate *isolate) {
  v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  tpl->SetClassName(Nan::New("Frame").ToLocalChecked());
  SetPrototypeMethod(tpl, "query", query);

  v8::Local<v8::ObjectTemplate> otl = tpl->InstanceTemplate();
  Nan::SetAccessor(otl, Nan::New("rootLayer").ToLocalChecked(), rootLayer);
  Nan::SetAccessor(otl, Nan::New("primaryLayer").ToLocalChecked(),
                   primaryLayer);
  Nan::SetAccessor(otl, Nan::New("leafLayers").ToLocalChecked(), leafLayers);
  Nan::SetAccessor(otl, Nan::New("sourceId").ToLocalChecked(), sourceId);

  PlugkitModule *module = PlugkitModule::get(isolate);
  module->frame.ctor.Reset(isolate, Nan::GetFunction(tpl).ToLocalChecked());
}

FrameWrapper::FrameWrapper(const FrameView *view)
    : view(view)
    , tsAttr(tsToken, view->timestamp(), dateToken)
    , payloadAttr(payloadToken, view->payload())
    , actLenAttr(actLenToken, static_cast<uint32_t>(view->frame()->length()))
    , indexAttr(indexToken, view->frame()->index()) {}

NAN_METHOD(FrameWrapper::New) { info.GetReturnValue().Set(info.This()); }

NAN_GETTER(FrameWrapper::rootLayer) {
  FrameWrapper *wrapper = ObjectWrap::Unwrap<FrameWrapper>(info.Holder());
  if (const auto &view = wrapper->view) {
    if (const auto &layer = view->frame()->rootLayer()) {
      info.GetReturnValue().Set(LayerWrapper::wrap(layer));
    } else {
      info.GetReturnValue().Set(Nan::Null());
    }
  }
}

NAN_GETTER(FrameWrapper::primaryLayer) {
  FrameWrapper *wrapper = ObjectWrap::Unwrap<FrameWrapper>(info.Holder());
  if (const auto &view = wrapper->view) {
    if (const auto &layer = view->primaryLayer()) {
      info.GetReturnValue().Set(LayerWrapper::wrap(layer));
    } else {
      info.GetReturnValue().Set(Nan::Null());
    }
  }
}

NAN_GETTER(FrameWrapper::leafLayers) {
  FrameWrapper *wrapper = ObjectWrap::Unwrap<FrameWrapper>(info.Holder());
  if (const auto &view = wrapper->view) {
    v8::Isolate *isolate = v8::Isolate::GetCurrent();
    const auto &layers = view->leafLayers();
    auto array = v8::Array::New(isolate, layers.size());
    for (size_t i = 0; i < layers.size(); ++i) {
      array->Set(i, LayerWrapper::wrap(layers[i]));
    }
    info.GetReturnValue().Set(array);
  }
}

NAN_GETTER(FrameWrapper::sourceId) {
  FrameWrapper *wrapper = ObjectWrap::Unwrap<FrameWrapper>(info.Holder());
  if (const auto &view = wrapper->view) {
    info.GetReturnValue().Set(view->frame()->sourceId());
  }
}

NAN_METHOD(FrameWrapper::query) {
  FrameWrapper *wrapper = ObjectWrap::Unwrap<FrameWrapper>(info.Holder());
  if (const auto &view = wrapper->view) {
    Token token = info[0]->IsUint32() ? info[0]->Uint32Value()
                                      : Token_get(*Nan::Utf8String(info[0]));

    if (virtualAttr(token, view, wrapper, info.GetReturnValue()))
      return;

    const Layer *layer = nullptr;
    const Attr *attr = nullptr;
    view->query(token, &layer, &attr);
    if (layer) {
      info.GetReturnValue().Set(LayerWrapper::wrap(layer));
    } else if (attr) {
      info.GetReturnValue().Set(AttrWrapper::wrap(attr));
    } else {
      info.GetReturnValue().Set(Nan::Null());
    }
  }
}

v8::Local<v8::Object> FrameWrapper::wrap(const FrameView *view) {
  v8::Isolate *isolate = v8::Isolate::GetCurrent();
  PlugkitModule *module = PlugkitModule::get(isolate);
  auto cons = v8::Local<v8::Function>::New(isolate, module->frame.ctor);
  v8::Local<v8::Object> obj =
      cons->NewInstance(v8::Isolate::GetCurrent()->GetCurrentContext(), 0,
                        nullptr)
          .ToLocalChecked();
  FrameWrapper *wrapper = new FrameWrapper(view);
  wrapper->Wrap(obj);
  return obj;
}

const FrameView *FrameWrapper::unwrap(v8::Local<v8::Value> value) {
  if (value.IsEmpty() || !value->IsObject())
    return nullptr;
  if (auto wrapper = ObjectWrap::Unwrap<FrameWrapper>(value.As<v8::Object>())) {
    return wrapper->view;
  }
  return nullptr;
}
} // namespace plugkit
