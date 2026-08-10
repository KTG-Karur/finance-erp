import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { subscribeApiError } from '../api/errorBus';

const AUTO_DISMISS_MS = 8000;

// Sits at the app root (mounted once in main.jsx) and reacts to emitApiError() calls
// from api/client.js's response interceptor — the one place every screen's network
// call passes through, so this covers backend crashes / DB errors / dropped
// connections without each screen needing its own error UI for that class of failure.
export default function GlobalErrorBanner() {
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return subscribeApiError((detail) => {
      setError(detail);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setError(null), AUTO_DISMISS_MS);
    });
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!error) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        maxWidth: 340, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14,
        boxShadow: '0 16px 40px -12px rgba(15, 23, 42, 0.25)', padding: '16px 16px 16px 12px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        animation: 'globalErrorSlideIn 0.2s ease-out'
      }}
    >
      <style>{`@keyframes globalErrorSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <img src="/Illustration.svg" alt="" aria-hidden="true" style={{ width: 56, height: 56, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>
          Something went wrong
        </p>
        <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4 }}>
          {error.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setError(null)}
        aria-label="Dismiss"
        style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2, flexShrink: 0 }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
