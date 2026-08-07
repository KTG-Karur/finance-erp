import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Without this, any uncaught render-phase error (a bad state update, a
// missing field on a mock record, etc.) unmounts the entire React tree and
// leaves a blank white page with no way back except a hard refresh. This
// catches that and offers a recoverable screen instead.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#F8FAFC', fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', padding: 24
        }}>
          <div style={{ maxWidth: 440, textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '36px 32px', boxShadow: '0 20px 50px -15px rgba(15, 23, 42, 0.15)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <AlertTriangle style={{ width: 24, height: 24 }} />
            </div>
            <h2 style={{ color: '#0F172A', margin: '0 0 8px 0', fontSize: '1.1rem' }}>Something went wrong</h2>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0 0 22px 0', lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <RotateCcw style={{ width: 15, height: 15 }} />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
