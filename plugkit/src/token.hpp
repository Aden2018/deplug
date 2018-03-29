#ifndef PLUGKIT_TOKEN_H
#define PLUGKIT_TOKEN_H

#include <stdint.h>
#include <string.h>

namespace v8 {
class Isolate;
}

namespace plugkit {

typedef uint32_t Token;

class TokenPool;
struct Context;

Token Token_literal_(const char *str, size_t length);

constexpr Token Token_null() { return static_cast<Token>(0); }

#ifdef PLUGKIT_OS_WIN
#pragma intrinsic(strlen)
#endif

/// Return a token corresponded with the given string.
inline Token Token_get(const char *str) {
  if (str == NULL || str[0] == '\0') {
    return Token_null();
  }
  return Token_literal_(str, strlen(str));
}

Token Token_const(const char *str);

Token Token_get_ctx(TokenPool *pool, const char *str);
Token Token_get_ctx(Context *ctx, const char *str);
Token Token_get_ctx(v8::Isolate *isolate, const char *str);

#ifdef PLUGKIT_OS_WIN
#pragma function(strlen)
#endif

/// Return a string corresponded with the given token.
const char *Token_string(Token token);

const char *Token_string_ctx(TokenPool *pool, Token token);
const char *Token_string_ctx(Context *ctx, Token token);
const char *Token_string_ctx(v8::Isolate *isolate, Token token);

} // namespace plugkit

#endif
