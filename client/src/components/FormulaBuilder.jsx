import React, { useState } from 'react';
import { Delete, RotateCcw, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  FORMULA_VARIABLES, FORMULA_OPERATORS, FORMULA_FUNCTIONS,
  tokensToDisplayString, evaluateFormula
} from '../utils/formulaEngine';

const chipBase = {
  border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A',
  borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem', fontWeight: 500,
  cursor: 'pointer', transition: 'all 0.12s ease'
};

// A representative sample loan used purely to show a live "does this look right"
// number as staff build the formula — has nothing to do with any real loan.
const SAMPLE_VARS = { principal: 100000, outstanding: 100000, rate: 0.02, days: 30, tenure_days: 120, period: 1, periods: 12 };

function Chip({ label, onClick, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...chipBase, ...(accent ? { background: accent.bg, color: accent.fg, borderColor: accent.border } : {}) }}
    >
      {label}
    </button>
  );
}

// A formula built entirely by tapping chips — every word, number, and operator is
// tappable at any time (nothing is ever greyed out); validity is shown as live
// feedback below the tape instead of by restricting what can be tapped next.
export default function FormulaBuilder({ value, onChange, availableVariables }) {
  const tokens = value || [];
  const [numpad, setNumpad] = useState(null); // { draft: string } while composing a number
  const [showAdvanced, setShowAdvanced] = useState(false);

  const variables = FORMULA_VARIABLES.filter(v => !availableVariables || availableVariables.includes(v.token));

  const push = (...toks) => onChange([...tokens, ...toks]);
  const backspace = () => onChange(tokens.slice(0, -1));
  const clear = () => onChange([]);

  const openNumpad = () => setNumpad({ draft: '' });
  const numpadPress = (d) => setNumpad(n => {
    if (d === '.' && n.draft.includes('.')) return n;
    if (d === '.' && n.draft === '') return { draft: '0.' };
    return { draft: n.draft + d };
  });
  const numpadBackspace = () => setNumpad(n => ({ draft: n.draft.slice(0, -1) }));
  const confirmNumpad = () => {
    if (numpad.draft !== '' && numpad.draft !== '-' && numpad.draft !== '.') {
      push(Number(numpad.draft));
    }
    setNumpad(null);
  };

  const preview = tokens.length ? evaluateFormula(tokens, SAMPLE_VARS) : null;
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* The formula tape — plain-language, read-only render of the token array */}
      <div style={{
        minHeight: 44, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8,
        padding: '10px 12px', fontSize: '0.85rem', color: tokens.length ? '#0F172A' : '#94A3B8',
        fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'
      }}>
        {tokens.length ? tokensToDisplayString(tokens) : 'Tap words below to build the formula…'}
      </div>

      {numpad ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', padding: '4px 2px' }}>
            {numpad.draft || '0'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {['7','8','9','4','5','6','1','2','3','0','.','⌫'].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => d === '⌫' ? numpadBackspace() : numpadPress(d)}
                style={{ ...chipBase, textAlign: 'center' }}
              >
                {d}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setNumpad(null)} style={{ ...chipBase, flex: 1, color: '#64748B' }}>Cancel</button>
            <button type="button" onClick={confirmNumpad} style={{ ...chipBase, flex: 1, background: '#0F172A', color: '#FFFFFF' }}>Insert Number</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {variables.map(v => (
              <Chip key={v.token} label={v.label} onClick={() => push(v.token)} accent={{ bg: 'var(--color-info-light, #EFF6FF)', fg: '#1D4ED8', border: 'var(--color-info-border, #BFDBFE)' }} />
            ))}
            <Chip label="A Number" onClick={openNumpad} accent={{ bg: 'var(--color-info-light, #EFF6FF)', fg: '#1D4ED8', border: 'var(--color-info-border, #BFDBFE)' }} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {FORMULA_OPERATORS.map(op => (
              <Chip key={op.token} label={op.label} onClick={() => push(op.token)} />
            ))}
            <Chip label="(" onClick={() => push('(')} />
            <Chip label=")" onClick={() => push(')')} />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(a => !a)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, fontSize: '0.72rem', fontWeight: 500, color: '#64748B', cursor: 'pointer' }}
          >
            {showAdvanced ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
            More options
          </button>

          {showAdvanced && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FORMULA_FUNCTIONS.map(fn => (
                <Chip key={fn.token} label={fn.label} onClick={() => push(fn.token, '(')} accent={{ bg: '#F5F3FF', fg: '#6D28D9', border: '#DDD6FE' }} />
              ))}
              <Chip label="," onClick={() => push(',')} />
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #E2E8F0', paddingTop: 10, alignItems: 'center' }}>
        <button type="button" onClick={backspace} disabled={!tokens.length} style={{ ...chipBase, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: tokens.length ? 1 : 0.4 }}>
          <Delete style={{ width: 13, height: 13 }} /> Undo Last
        </button>
        <button type="button" onClick={clear} disabled={!tokens.length} style={{ ...chipBase, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: tokens.length ? 1 : 0.4 }}>
          <RotateCcw style={{ width: 13, height: 13 }} /> Clear
        </button>
      </div>

      {/* Live, non-blocking feedback — tells staff whether the formula built so far
          makes sense, without ever preventing them from tapping anything. */}
      {preview && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.76rem', fontWeight: 500,
          color: preview.error ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)'
        }}>
          {preview.error
            ? <AlertTriangle style={{ width: 13, height: 13, marginTop: 1, flexShrink: 0 }} />
            : <Check style={{ width: 13, height: 13, marginTop: 1, flexShrink: 0 }} />}
          <span>
            {preview.error
              ? preview.error
              : `Looks good — produces ₹${fmt(preview.value)} for a sample loan.`}
          </span>
        </div>
      )}
    </div>
  );
}
