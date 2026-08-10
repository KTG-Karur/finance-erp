// Tiny pub/sub so the axios interceptor (client.js, a plain module — not a React
// component) can hand unexpected API failures to a UI component (GlobalErrorBanner)
// without needing React context threaded down to it. Deliberately not used for
// ordinary 4xx validation errors (wrong password, duplicate name, etc.) — those
// already have per-form messaging; this is only for the failures nothing currently
// shows the user anything about: network drops, backend crashes, DB errors.
const listeners = new Set();

export function emitApiError(detail) {
  listeners.forEach(fn => fn(detail));
}

export function subscribeApiError(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
