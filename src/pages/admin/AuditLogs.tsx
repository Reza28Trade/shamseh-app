import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileText, RefreshCw, Search, ShieldAlert } from 'lucide-react';

type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  performedBy: string;
  details: unknown;
  timestamp: string;
  ipAddress: string | null;
};

const actionLabels: Record<string, string> = {
  REGISTRATION_APPROVED: 'تأیید ثبت‌نام',
  REGISTRATION_NEEDS_CORRECTION: 'درخواست اصلاح ثبت‌نام',
  REGISTRATION_REJECTED: 'رد ثبت‌نام',
  REGISTRATION_DEBT_SETTLED: 'تسویه بدهی ثبت‌نام',
  COUNSELOR_CREATED: 'ایجاد مشاور',
  COUNSELOR_UPDATED: 'ویرایش مشاور',
};

function formatAction(action: string): string {
  if (actionLabels[action]) return actionLabels[action];
  const match = action.match(/^(POST|PUT|PATCH|DELETE)\s+(.+)$/);
  if (!match) return action;
  const verb: Record<string, string> = {
    POST: 'ثبت عملیات',
    PUT: 'ویرایش اطلاعات',
    PATCH: 'تغییر اطلاعات',
    DELETE: 'حذف اطلاعات',
  };
  return `${verb[match[1]] || match[1]} · ${match[2]}`;
}

function formatDetails(value: unknown): string {
  if (value == null) return 'جزئیاتی برای این رویداد ثبت نشده است.';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

const controlStyle: React.CSSProperties = {
  minWidth: 170,
  maxWidth: '100%',
  padding: '9px 11px',
  border: '1px solid var(--admin-border, #d8e3e0)',
  borderRadius: 9,
  background: 'var(--admin-control, #fbfdfc)',
  color: 'var(--admin-text, #202a2a)',
  font: 'inherit',
  fontSize: 13,
  outlineOffset: 2,
  boxSizing: 'border-box',
};

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null);

  const loadLogs = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/audit-logs', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('نشست شما معتبر نیست؛ دوباره وارد پنل شوید.');
        if (response.status === 403) throw new Error('حساب شما مجوز مشاهده گزارش‌های سیستمی را ندارد.');
        throw new Error(`دریافت گزارش‌ها با خطای سرور مواجه شد (HTTP ${response.status}).`);
      }

      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) throw new Error('پاسخ سرور برای گزارش‌های سیستمی معتبر نیست.');
      setLogs(payload as AuditLogEntry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارتباط با سرور برقرار نشد.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const actions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort((a, b) => formatAction(a).localeCompare(formatAction(b), 'fa')),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (!query) return true;
      const searchable = [
        formatAction(log.action),
        log.action,
        log.entityType,
        log.entityId ?? '',
        log.performedBy,
        log.ipAddress ?? '',
        formatDetails(log.details),
      ].join(' ').toLocaleLowerCase();
      return searchable.includes(query);
    });
  }, [logs, search, actionFilter]);

  return (
    <div className="admin-legacy-page admin-logs-page" style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <section style={{ background: 'var(--admin-card, #fff)', color: 'var(--admin-text, #202a2a)', border: '1px solid var(--admin-border, #d8e3e0)', padding: '20px 24px', borderRadius: 18, boxShadow: 'var(--admin-shadow, 0 8px 24px rgba(0,0,0,.05))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={21} /> گزارش‌های سیستمی
            </h2>
            <p style={{ fontSize: 13, color: 'var(--admin-sub, #667675)', margin: 0, lineHeight: 1.8 }}>
              مشاهده و جست‌وجوی ۲۰۰ رویداد اخیر؛ برای دیدن جزئیات هر رویداد، ردیف آن را باز کنید.
            </p>
          </div>
          <button type="button" onClick={() => void loadLogs(true)} disabled={loading || refreshing} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid var(--admin-border, #d8e3e0)', background: 'var(--admin-control, #fbfdfc)', color: 'var(--admin-text, #202a2a)', padding: '9px 13px', borderRadius: 9, cursor: loading || refreshing ? 'wait' : 'pointer', font: 'inherit', fontSize: 13 }}>
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            به‌روزرسانی
          </button>
        </div>
      </section>

      {error && (
        <section role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, border: '1px solid #e8b4b4', background: '#fff1f1', color: '#8b2525' }}>
          <AlertCircle size={20} />
          <div>
            <strong>گزارش‌ها دریافت نشدند</strong>
            <p style={{ margin: '6px 0 0', lineHeight: 1.8 }}>{error}</p>
          </div>
        </section>
      )}

      <section style={{ background: 'var(--admin-card, #fff)', color: 'var(--admin-text, #202a2a)', border: '1px solid var(--admin-border, #d8e3e0)', padding: 16, borderRadius: 18, boxShadow: 'var(--admin-shadow, 0 8px 24px rgba(0,0,0,.05))', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--admin-sub, #667675)', fontSize: 13 }}>
            <ShieldAlert size={17} />
            <span>{loading ? 'در حال دریافت…' : `${filteredLogs.length.toLocaleString('fa-IR')} مورد از ${logs.length.toLocaleString('fa-IR')} رویداد`}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: '1 1 420px', justifyContent: 'flex-end' }}>
            <label className="audit-search-field">
              <Search size={16} style={{ position: 'absolute', right: 10, color: 'var(--admin-sub, #667675)', pointerEvents: 'none' }} />
              <input
                className="audit-search-input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جست‌وجوی رویداد، کاربر، شناسه…"
                aria-label="جست‌وجو در گزارش‌های سیستمی"
                style={{ ...controlStyle, width: '100%', paddingRight: 34 }}
              />
            </label>
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} aria-label="فیلتر نوع رویداد" style={{ ...controlStyle, minWidth: 190 }}>
              <option value="all">همهٔ نوع رویدادها</option>
              {actions.map((action) => <option key={action} value={action}>{formatAction(action)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p role="status" style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--admin-sub, #667675)' }}>در حال دریافت گزارش‌های سیستمی…</p>
        ) : !error && logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--admin-sub, #667675)' }}>
            <ShieldAlert size={28} style={{ margin: '0 auto 12px' }} />
            <strong style={{ display: 'block', marginBottom: 8 }}>هنوز گزارشی ثبت نشده است.</strong>
            <span style={{ fontSize: 13 }}>پس از انجام عملیات مدیریتی، گزارش‌ها در این بخش نمایش داده می‌شوند.</span>
          </div>
        ) : !error && filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--admin-sub, #667675)' }}>موردی با این عبارت یا فیلتر پیدا نشد.</div>
        ) : (
          <div style={{ maxWidth: '100%', overflowX: 'auto', overflowY: 'auto', maxHeight: 760, border: '1px solid var(--admin-border, #d8e3e0)', borderRadius: 10 }}>
            <table style={{ width: '100%', minWidth: 760, borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, textAlign: 'right' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: 'var(--admin-inner, #e7efed)' }}>
                  {['زمان', 'نوع عملیات', 'بخش / شناسه', 'انجام‌دهنده', 'جزئیات'].map((heading) => (
                    <th key={heading} scope="col" style={{ padding: '11px 12px', fontWeight: 800, whiteSpace: 'nowrap', borderBottom: '1px solid var(--admin-border, #d8e3e0)' }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr style={{ background: detailsOpen === log.id ? 'var(--admin-inner, #e7efed)' : 'var(--admin-card, #fff)' }}>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--admin-border, #e4ebe9)', whiteSpace: 'nowrap', color: 'var(--admin-sub, #667675)' }}>
                        <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--admin-border, #e4ebe9)', fontWeight: 750, minWidth: 180 }}>{formatAction(log.action)}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--admin-border, #e4ebe9)', minWidth: 150, overflowWrap: 'anywhere' }}>
                        <span>{log.entityType}</span>
                        {log.entityId && <span style={{ display: 'block', marginTop: 3, color: 'var(--admin-sub, #667675)', fontSize: 11, direction: 'ltr', textAlign: 'right' }}>{log.entityId}</span>}
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--admin-border, #e4ebe9)', whiteSpace: 'nowrap' }}>{log.performedBy}</td>
                      <td style={{ padding: '7px 12px', borderBottom: '1px solid var(--admin-border, #e4ebe9)', whiteSpace: 'nowrap' }}>
                        {log.details == null ? <span style={{ color: 'var(--admin-sub, #667675)' }}>—</span> : (
                          <button type="button" aria-expanded={detailsOpen === log.id} onClick={() => setDetailsOpen((current) => current === log.id ? null : log.id)} style={{ border: '1px solid var(--admin-border, #d8e3e0)', background: 'var(--admin-control, #fbfdfc)', color: 'var(--admin-text, #202a2a)', borderRadius: 7, padding: '5px 9px', font: 'inherit', cursor: 'pointer' }}>
                            {detailsOpen === log.id ? 'بستن جزئیات' : 'مشاهده'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {detailsOpen === log.id && (
                      <tr>
                        <td colSpan={5} style={{ padding: 12, background: 'var(--admin-control, #fbfdfc)', borderBottom: '1px solid var(--admin-border, #e4ebe9)' }}>
                          <pre dir="auto" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12, lineHeight: 1.8, padding: 12, borderRadius: 8, background: 'var(--admin-inner, #e7efed)', margin: 0 }}>{formatDetails(log.details)}</pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filteredLogs.length > 0 && (
          <p style={{ margin: '10px 2px 0', fontSize: 11.5, color: 'var(--admin-sub, #667675)' }}>
            حداکثر ۲۰۰ رویداد اخیر نمایش داده می‌شود؛ جدول پس از حدود ۲۰ ردیف اسکرول می‌شود.
          </p>
        )}
      </section>
    </div>
  );
};
