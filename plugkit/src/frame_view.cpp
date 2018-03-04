#include "frame_view.hpp"
#include "frame.hpp"
#include "layer.hpp"
#include "payload.hpp"
#include <algorithm>
#include <functional>
#include <vector>

namespace plugkit {

FrameView::FrameView(Frame *frame) : mFrame(frame), mPrimaryLayer(nullptr) {
  frame->setView(this);

  std::function<void(const Layer *)> findLeafLayers =
      [this, &findLeafLayers](const Layer *layer) {
        if (!layer)
          return;
        mLayers.push_back(layer);
        if (layer->layers().empty()) {
          mLeafLayers.push_back(layer);
        } else {
          for (const Layer *child : layer->layers()) {
            findLeafLayers(child);
          }
        }
      };
  findLeafLayers(mFrame->rootLayer());

  std::sort(mLeafLayers.begin(), mLeafLayers.end(),
            [](const Layer *a, const Layer *b) {
              if (a->confidence() == b->confidence()) {
                return a->id() < b->id();
              }
              return a->confidence() > b->confidence();
            });

  if (!mLeafLayers.empty()) {
    mPrimaryLayer = mLeafLayers.front();
  }
}

FrameView::~FrameView() {}

const Frame *FrameView::frame() const { return mFrame; }

const Layer *FrameView::primaryLayer() const { return mPrimaryLayer; }

const std::vector<const Layer *> &FrameView::leafLayers() const {
  return mLeafLayers;
}

const Attr *FrameView::attr(Token id, const char *name) const {
  for (const Layer *leaf : leafLayers()) {
    for (const Layer *layer = leaf; layer; layer = layer->parent()) {
      if (const Attr *layerProp = layer->attr(id, name)) {
        return layerProp;
      }
    }
  }
  return nullptr;
}

const Layer *FrameView::layer(Token id) const {
  for (const auto &layer : mLayers) {
    if (layer->id() == id) {
      return layer;
    }
  }
  return nullptr;
}

double FrameView::timestamp() const {
  return static_cast<double>(
      std::chrono::duration_cast<std::chrono::nanoseconds>(
          mFrame->timestamp().time_since_epoch())
          .count() /
      1000000.0);
}

Slice FrameView::payload() const {
  if (const Layer *root = mFrame->rootLayer()) {
    const auto &payloads = root->payloads();
    if (!payloads.empty()) {
      const auto &payload = payloads[0];
      if (!payload->slices().empty()) {
        return payload->slices()[0];
      }
    }
  }
  return Slice();
}

void FrameView::query(Token id, const Layer **layer, const Attr **attr, const char *name) const {
  for (const Layer *leaf : leafLayers()) {
    for (const Layer *parent = leaf; parent; parent = parent->parent()) {
      if (parent->id() == id) {
        *layer = parent;
        return;
      }
      if (const Attr *layerAttr = parent->attr(id, name)) {
        *attr = layerAttr;
        return;
      }
    }
  }
}
} // namespace plugkit
