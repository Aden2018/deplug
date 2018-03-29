#include "token.hpp"
#include "context.hpp"
#include "extended_slot.hpp"
#include <cassert>
#include <cstring>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace std {
template <>
struct hash<std::pair<plugkit::Token, std::string>> {
  inline size_t operator()(const pair<plugkit::Token, std::string> &v) const {
    return v.first ^ std::hash<std::string>()(v.second);
  }
};
} // namespace std

namespace plugkit {

namespace {

#define register
#include "token_hash.h"
#undef register

thread_local std::unordered_map<std::string, Token> localMap;
thread_local std::unordered_map<Token, const char *> localReverseMap;
std::unordered_map<std::string, Token> map;
std::unordered_map<Token, const char *> reverseMap;
std::mutex mutex;
} // namespace

Token Token_literal_(const char *str, size_t length) {
  if (str == nullptr || str[0] == '\0') {
    return Token_null();
  }

  if (length <= MAX_WORD_LENGTH && length >= MIN_WORD_LENGTH) {
    unsigned int key = hash(str, length);
    if (key <= MAX_HASH_VALUE) {
      const char *s = wordlist[key];
      if (strncmp(str, s, length) == 0) {
        return key + 1;
      }
    }
  }

  // suppress warnings
  if (false) {
    in_word_set(nullptr, 0);
  }

  const std::string key(str, length);
  auto it = localMap.find(key);
  if (it != localMap.end()) {
    return it->second;
  }

  Token id;
  char *data = new char[length + 1]();
  {
    std::lock_guard<std::mutex> lock(mutex);
    auto it = map.find(key);
    if (it != map.end()) {
      localMap.insert(*it);
      return it->second;
    }
    id = map.size() + 1 + MAX_HASH_VALUE + 1;
    map.emplace(key, id);
    key.copy(data, length);
    reverseMap.emplace(id, data);
  }
  localMap.emplace(data, id);
  localReverseMap.emplace(id, data);
  return id;
}

Token Token_const(const char *str) {
  if (str == nullptr || str[0] == '\0') {
    return Token_null();
  }

  size_t length = strlen(str);
  if (length <= MAX_WORD_LENGTH && length >= MIN_WORD_LENGTH) {
    unsigned int key = hash(str, length);
    if (key <= MAX_HASH_VALUE) {
      const char *s = wordlist[key];
      if (strncmp(str, s, length) == 0) {
        return key + 1;
      }
    }
  }

  assert(false);
  return 0;
}

const char *Token_string(Token token) {
  if (token == Token_null()) {
    return "";
  }
  if (token <= MAX_HASH_VALUE + 1) {
    return wordlist[token - 1];
  }
  {
    auto it = localReverseMap.find(token);
    if (it != localReverseMap.end()) {
      return it->second;
    }
  }
  std::lock_guard<std::mutex> lock(mutex);
  auto it = reverseMap.find(token);
  if (it != reverseMap.end()) {
    localReverseMap.insert(*it);
    return it->second;
  }
  return "";
}

Token Token_get_ctx(TokenPool *pool, const char *str) { return Token_get(str); }

Token Token_get_ctx(Context *ctx, const char *str) {
  return Token_get_ctx(ctx->tokenPool, str);
}

Token Token_get_ctx(v8::Isolate *isolate, const char *str) {
  TokenPool *pool =
      ExtendedSlot::get<TokenPool>(isolate, ExtendedSlot::SLOT_PLUGKIT_TOKEN);
  return Token_get_ctx(pool, str);
}

const char *Token_string_ctx(TokenPool *pool, Token token) {
  return Token_string(token);
}

const char *Token_string_ctx(Context *ctx, Token token) {
  return Token_string_ctx(ctx->tokenPool, token);
}

const char *Token_string_ctx(v8::Isolate *isolate, Token token) {
  TokenPool *pool =
      ExtendedSlot::get<TokenPool>(isolate, ExtendedSlot::SLOT_PLUGKIT_TOKEN);
  return Token_string_ctx(pool, token);
}

} // namespace plugkit
