import React, { useState, useMemo } from 'react';
import {
  History, Search, ChevronRight, Plus, Pencil, Trash2,
  Banknote, CheckCircle2, XCircle, Users2, ListChecks, X
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const ACTION_STYLE = {
  CREATE: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: Plus },
  UPDATE: { color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', icon: Pencil },
  DELETE: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: Trash2 },
  PAYMENT_RECORDED: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: Banknote },
  CLOSURE_APPROVED: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: CheckCircle2 },
  CLOSURE_REJECTED: { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', icon: XCircle }
};

const ACTION_LABEL_KEY = {
  CREATE: 'audit.action_created',
  UPDATE: 'audit.action_updated',
  DELETE: 'audit.action_deleted',
  PAYMENT_RECORDED: 'audit.action_payment',
  CLOSURE_APPROVED: 'audit.action_approved',
  CLOSURE_REJECTED: 'audit.action_rejected'
};

const ACTION_VERB_KEY = {
  CREATE: 'audit.verb_created',
  UPDATE: 'audit.verb_updated',
  DELETE: 'audit.verb_deleted',
  PAYMENT_RECORDED: 'audit.verb_payment',
  CLOSURE_APPROVED: 'audit.verb_approved_closure',
  CLOSURE_REJECTED: 'audit.verb_rejected_closure'
};

const ENTITY_LABEL_KEY = {
  EMPLOYEE: 'audit.entity_employee',
  LOAN_SCHEME: 'audit.entity_loan_scheme',
  LOAN: 'audit.entity_loan',
  COLLECTION: 'audit.entity_collection'
};

const DATE_RANGES = ['ALL', 'TODAY', '7D', '30D'];
const DATE_RANGE_KEY = { ALL: 'audit.date_all', TODAY: 'audit.date_today', '7D': 'audit.date_7d', '30D': 'audit.date_30d' };

function style(action) {
  return ACTION_STYLE[action] || { color: '#334155', bg: '#F1F5F9', border: '#E2E8F0', icon: ListChecks };
}

function actionLabel(t, action) {
  const key = ACTION_LABEL_KEY[action];
  return key ? t(key) : action.replace(/_/g, ' ');
}

function actionVerb(t, action) {
  const key = ACTION_VERB_KEY[action];
  return key ? t(key) : action.toLowerCase().replace(/_/g, ' ');
}

function entityLabel(t, entityType) {
  const key = ENTITY_LABEL_KEY[entityType];
  return key ? t(key) : entityType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function dayGroupLabel(iso, t) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return t('audit.today');
  if (sameDay(d, yesterday)) return t('audit.yesterday');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function fmtFull(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

function withinRange(iso, range) {
  if (range === 'ALL') return true;
  const now = Date.now();
  const t = new Date(iso).getTime();
  if (range === 'TODAY') return new Date(iso).toDateString() === new Date().toDateString();
  if (range === '7D') return now - t <= 7 * 24 * 60 * 60 * 1000;
  if (range === '30D') return now - t <= 30 * 24 * 60 * 60 * 1000;
  return true;
}

function DetailField({ label, value }) {
  return (
    <div className="audit-details__field">
      <span className="audit-details__label">{label}</span>
      <span className="audit-details__value">{value}</span>
    </div>
  );
}

function DiffGrid({ before, after, t }) {
  const keys = Array.from(new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ])).filter(k => typeof (before?.[k] ?? after?.[k]) !== 'object');

  if (keys.length === 0) {
    return <p className="audit-diff__empty">{t('audit.no_field_changes')}</p>;
  }

  return (
    <div className="audit-diff__grid">
      {keys.map(k => {
        const b = before?.[k];
        const a = after?.[k];
        const changed = JSON.stringify(b) !== JSON.stringify(a);
        return (
          <div className={`audit-diff__row${changed ? ' audit-diff__row--changed' : ''}`} key={k}>
            <span className="audit-diff__field">{k.replace(/_/g, ' ')}</span>
            <span className="audit-diff__before">{b === null || b === undefined || b === '' ? '—' : String(b)}</span>
            <span className="audit-diff__after">{a === null || a === undefined || a === '' ? '—' : String(a)}</span>
          </div>
        );
      })}
    </div>
  );
}

function AuditEntry({ log, isLast, expanded, onToggle, t }) {
  const s = style(log.action);
  const Icon = s.icon;
  return (
    <div className="audit-entry">
      <div className="audit-entry__rail">
        <div className="audit-entry__dot" style={{ borderColor: s.border, color: s.color }}>
          <Icon style={{ width: 14, height: 14 }} />
        </div>
        {!isLast && <div className="audit-entry__line" />}
      </div>
      <div className="audit-entry__body">
        <div className="audit-card" onClick={onToggle}>
          <div className="audit-card__top">
            <div style={{ minWidth: 0 }}>
              <p className="audit-card__sentence">
                <b>{log.actor_name}</b> {actionVerb(t, log.action)} <b>{entityLabel(t, log.entity_type)} #{log.entity_id}</b>
              </p>
              <div className="audit-card__meta">
                <span>{log.actor_role || t('audit.role_default')}</span>
                <span className="dot-sep">{fmtTime(log.created_at)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
              <span className="audit-card__badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                {actionLabel(t, log.action)}
              </span>
              <ChevronRight
                className="audit-card__chevron"
                style={{ width: 15, height: 15, transform: expanded ? 'rotate(90deg)' : 'none' }}
              />
            </div>
          </div>

          {expanded && (
            <div className="audit-diff" onClick={(e) => e.stopPropagation()}>
              <div className="audit-details__grid">
                <DetailField label={t('audit.field_actor')} value={log.actor_name} />
                <DetailField label={t('audit.field_role')} value={log.actor_role || t('audit.role_default')} />
                <DetailField label={t('audit.field_entity_type')} value={entityLabel(t, log.entity_type)} />
                <DetailField label={t('audit.field_entity_id')} value={`#${log.entity_id}`} />
                <DetailField label={t('audit.field_action')} value={actionLabel(t, log.action)} />
                <DetailField label={t('audit.field_timestamp')} value={fmtFull(log.created_at)} />
              </div>

              <div className="audit-diff__heading">{t('audit.changes_heading')}</div>
              <DiffGrid before={log.before} after={log.after} t={t} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditLogView({ auditLogs = [] }) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  const entityTypes = useMemo(() => Array.from(new Set(auditLogs.map(l => l.entity_type))), [auditLogs]);
  const actionTypes = useMemo(() => Array.from(new Set(auditLogs.map(l => l.action))), [auditLogs]);
  const actors = useMemo(() => Array.from(new Set(auditLogs.map(l => l.actor_name))), [auditLogs]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return auditLogs.filter(l => new Date(l.created_at).toDateString() === today).length;
  }, [auditLogs]);

  const uniqueActors = useMemo(() => new Set(auditLogs.map(l => l.actor_name)).size, [auditLogs]);

  const hasActiveFilters = actionFilter !== 'ALL' || entityFilter !== 'ALL' || actorFilter !== 'ALL' || dateRange !== 'ALL' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setActionFilter('ALL');
    setEntityFilter('ALL');
    setActorFilter('ALL');
    setDateRange('ALL');
    setSearchQuery('');
  };

  const filtered = auditLogs.filter(log => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (entityFilter !== 'ALL' && log.entity_type !== entityFilter) return false;
    if (actorFilter !== 'ALL' && log.actor_name !== actorFilter) return false;
    if (!withinRange(log.created_at, dateRange)) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      String(log.entity_id).toLowerCase().includes(q) ||
      (log.actor_name || '').toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q)
    );
  });

  // Group into ordered day-buckets, preserving reverse-chronological order.
  const groups = [];
  filtered.forEach(log => {
    const label = dayGroupLabel(log.created_at, t);
    let bucket = groups.find(g => g.label === label);
    if (!bucket) {
      bucket = { label, items: [] };
      groups.push(bucket);
    }
    bucket.items.push(log);
  });

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div className="audit-header__left">
          <div className="audit-header__icon">
            <History style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <h1 className="audit-header__title">{t('audit.title')}</h1>
            <p className="audit-header__subtitle">{t('audit.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="audit-stats">
        <div className="audit-stat">
          <span className="audit-stat__label">{t('audit.stat_total')}</span>
          <span className="audit-stat__value">{auditLogs.length}</span>
        </div>
        <div className="audit-stat">
          <span className="audit-stat__label">{t('audit.stat_today')}</span>
          <span className="audit-stat__value">{todayCount}</span>
        </div>
        <div className="audit-stat">
          <span className="audit-stat__label">{t('audit.stat_staff')}</span>
          <span className="audit-stat__value">{uniqueActors}</span>
        </div>
      </div>

      <div className="audit-toolbar">
        <div className="audit-search">
          <Search />
          <input
            type="text"
            placeholder={t('audit.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="audit-filterfield">
          <label>{t('audit.filter_action_label')}</label>
          <select className="audit-select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="ALL">{t('audit.filter_all')}</option>
            {actionTypes.map(a => <option key={a} value={a}>{actionLabel(t, a)}</option>)}
          </select>
        </div>

        <div className="audit-filterfield">
          <label>{t('audit.filter_entity_label')}</label>
          <select className="audit-select" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
            <option value="ALL">{t('audit.entity_all')}</option>
            {entityTypes.map(et => <option key={et} value={et}>{entityLabel(t, et)}</option>)}
          </select>
        </div>

        <div className="audit-filterfield">
          <label>{t('audit.filter_actor_label')}</label>
          <select className="audit-select" value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}>
            <option value="ALL">{t('audit.all_actors')}</option>
            {actors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="audit-filterfield">
          <label>{t('audit.filter_date_label')}</label>
          <select className="audit-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            {DATE_RANGES.map(r => <option key={r} value={r}>{t(DATE_RANGE_KEY[r])}</option>)}
          </select>
        </div>

        {hasActiveFilters && (
          <button type="button" className="audit-clear-btn" onClick={clearFilters}>
            <X style={{ width: 13, height: 13 }} />
            <span>{t('audit.clear_filters')}</span>
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="audit-results-count">{filtered.length} {t('audit.results_count')}</div>
      )}

      {groups.length === 0 ? (
        <div className="audit-empty-state">
          <Users2 style={{ width: 30, height: 30 }} />
          <strong>{auditLogs.length === 0 ? t('audit.empty_title_none') : t('audit.empty_title_no_match')}</strong>
          <span>{auditLogs.length === 0 ? t('audit.empty_desc_none') : t('audit.empty_desc_no_match')}</span>
        </div>
      ) : (
        <div className="audit-timeline">
          {groups.map(group => (
            <div className="audit-daygroup" key={group.label}>
              <div className="audit-daygroup__label">{group.label}</div>
              {group.items.map((log, idx) => (
                <AuditEntry
                  key={log.id}
                  log={log}
                  isLast={idx === group.items.length - 1}
                  expanded={expandedId === log.id}
                  onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  t={t}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
