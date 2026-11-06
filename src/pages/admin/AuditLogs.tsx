import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';

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

function renderActionLabel(action: string): React.ReactNode {
  if (actionLabels[action]) return actionLabels[action];
  const match = action.match(/^(POST|PUT|PATCH|DELETE)\s+(.+)$/);
  if (!match) return <bdi dir="auto">{action}</bdi>;
  const verb: Record<string, string> = {
    POST: 'ثبت عملیات',
    PUT: 'ویرایش اطلاعات',
    PATCH: 'تغییر اطلاعات',
    DELETE: 'حذف اطلاعات',
  };
  return (
    <>
      <span>{verb[match[1]] || match[1]} · </span>
      <bdi dir="ltr">{match[2]}</bdi>
    </>
  );
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



export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

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

  const openLogDetails = useCallback((log: AuditLogEntry) => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setSelectedLog(log);
  }, []);

  useEffect(() => {
    if (!selectedLog) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () => Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    ).filter((element) => element.getAttribute('aria-hidden') !== 'true');

    closeButtonRef.current?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedLog(null);
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        drawerRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !drawerRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !drawerRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [selectedLog]);

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
    <div className="admin-legacy-page admin-logs-page">
      {error && (
        <section role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>گزارش‌ها دریافت نشدند</strong>
            <p>{error}</p>
          </div>
        </section>
      )}

      <section className="admin-recent-activity admin-master-panel">
        <div className="admin-dashboard-tools">
          <span className="admin-dashboard-updated admin-audit-toolbar-count">
            <ShieldAlert size={17} />
            <span>{loading ? 'در حال دریافت…' : `${filteredLogs.length.toLocaleString('fa-IR')} مورد از ${logs.length.toLocaleString('fa-IR')} رویداد`}</span>
          </span>
          <input
            type="search"
            size={32}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجوی رویداد، کاربر، شناسه…"
            aria-label="جست‌وجو در گزارش‌های سیستمی"
          />
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} aria-label="فیلتر نوع رویداد">
            <option value="all">همهٔ نوع رویدادها</option>
            {actions.map((action) => <option key={action} value={action}>{formatAction(action)}</option>)}
          </select>
          <button type="button" onClick={() => void loadLogs(true)} disabled={loading || refreshing} className="admin-refresh-button admin-action-button admin-audit-toolbar-refresh">
            <RefreshCw size={15} className={refreshing ? 'admin-spinning' : ''} />
            به‌روزرسانی
          </button>
        </div>

        {loading ? (
          <p role="status" >در حال دریافت گزارش‌های سیستمی…</p>
        ) : error && logs.length === 0 ? (
          null
        ) : !error && logs.length === 0 ? (
          <div>
            <ShieldAlert size={28} />
            <strong>هنوز گزارشی ثبت نشده است.</strong>
            <span>پس از انجام عملیات مدیریتی، گزارش‌ها در این بخش نمایش داده می‌شوند.</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div>موردی با این عبارت یا فیلتر پیدا نشد.</div>
        ) : (
          <div className="admin-activity-list admin-activity-list--scroll">
            {filteredLogs.map((log) => (
                <article className="admin-activity-row admin-audit-log-row" key={log.id}>
                  <span className="admin-activity-mark admin-audit-log-mark" aria-hidden="true"><Activity size={14} /></span>
                  <div className="admin-activity-copy admin-audit-log-copy">
                    <strong className="admin-audit-log-title">{renderActionLabel(log.action)}</strong>
                    <div className="admin-audit-log-meta">
                      <span>{log.entityType || 'رویداد سامانه'}</span>
                      <span className="admin-audit-log-separator" aria-hidden="true">·</span>
                      <span>{log.performedBy || 'کاربر سامانه'}</span>
                      <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
                    </div>
                    {log.entityId && <small className="admin-audit-log-id" dir="auto" title={log.entityId}>{log.entityId}</small>}
                  </div>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`مشاهده جزئیات ${formatAction(log.action)}`}
                    onClick={() => openLogDetails(log)}
                    className="admin-action-button admin-audit-log-action"
                  >
                    مشاهده
                  </button>
                </article>
            ))}
          </div>
        )}
      </section>
      {selectedLog && (
        <div
          className="admin-audit-detail-backdrop"
          role="presentation"
          onClick={(event) => { if (event.target === event.currentTarget) setSelectedLog(null); }}
        >
          <aside
            ref={drawerRef}
            className="admin-audit-detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
            tabIndex={-1}
            dir="rtl"
          >
            <header className="admin-audit-detail-header">
              <div>
                <span className="admin-audit-detail-eyebrow">گزارش‌های سیستمی</span>
                <h2 id="audit-detail-title">جزئیات رویداد</h2>
              </div>
              <button ref={closeButtonRef} type="button" className="admin-action-button" onClick={() => setSelectedLog(null)}>بستن</button>
            </header>
            <div className="admin-audit-detail-content">
              <section className="admin-audit-detail-section">
                <h3>{formatAction(selectedLog.action)}</h3>
                <div className="admin-audit-detail-grid">
                  <div><span>نوع عملیات</span><strong>{selectedLog.action}</strong></div>
                  <div><span>بخش مرتبط</span><strong>{selectedLog.entityType || '—'}</strong></div>
                  <div><span>شناسه رکورد</span><strong dir="auto">{selectedLog.entityId || '—'}</strong></div>
                  <div><span>انجام‌دهنده</span><strong>{selectedLog.performedBy || 'کاربر سامانه'}</strong></div>
                  <div><span>نشانی IP</span><strong dir="ltr">{selectedLog.ipAddress || '—'}</strong></div>
                  <div><span>زمان ثبت</span><strong>{formatTimestamp(selectedLog.timestamp)}</strong></div>
                </div>
              </section>
              <section className="admin-audit-detail-section">
                <h3>جزئیات و داده‌های رویداد</h3>
                <pre className="admin-audit-detail-json" dir="auto">{formatDetails(selectedLog.details)}</pre>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
