import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    <div className="admin-legacy-page admin-logs-page admin-extracted-auditlogs-1">
      {error && (
        <section role="alert" className="admin-extracted-auditlogs-6">
          <AlertCircle size={20} />
          <div>
            <strong>گزارش‌ها دریافت نشدند</strong>
            <p className="admin-extracted-auditlogs-7">{error}</p>
          </div>
        </section>
      )}

      <section className="admin-extracted-auditlogs-8 admin-panel-card admin-recent-activity admin-master-panel">
        <div className="admin-dashboard-tools">
          <span className="admin-dashboard-updated">
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
          <button type="button" onClick={() => void loadLogs(true)} disabled={loading || refreshing} className="admin-refresh-button admin-action-button">
            <RefreshCw size={15} className={refreshing ? 'admin-spinning' : ''} />
            به‌روزرسانی
          </button>
        </div>

        {loading ? (
          <p role="status" className="admin-extracted-auditlogs-13">در حال دریافت گزارش‌های سیستمی…</p>
        ) : !error && logs.length === 0 ? (
          <div className="admin-extracted-auditlogs-14">
            <ShieldAlert size={28} className="admin-extracted-auditlogs-15" />
            <strong className="admin-extracted-auditlogs-16">هنوز گزارشی ثبت نشده است.</strong>
            <span className="admin-extracted-auditlogs-17">پس از انجام عملیات مدیریتی، گزارش‌ها در این بخش نمایش داده می‌شوند.</span>
          </div>
        ) : !error && filteredLogs.length === 0 ? (
          <div className="admin-extracted-auditlogs-18">موردی با این عبارت یا فیلتر پیدا نشد.</div>
        ) : (
          <div className="admin-activity-list admin-activity-list--scroll">
            {filteredLogs.map((log) => (
              <React.Fragment key={log.id}>
                <div className="admin-activity-row">
                  <span className="admin-activity-mark"><Activity size={14} /></span>
                  <span className="admin-activity-copy">
                    <strong>{formatAction(log.action)}</strong>
                    <small>{log.entityType || 'رویداد سامانه'} · {log.performedBy || 'کاربر سامانه'}</small>
                    {log.entityId && <small>{log.entityId}</small>}
                  </span>
                  <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
                  {log.details != null && (
                    <button
                      type="button"
                      aria-expanded={detailsOpen === log.id}
                      onClick={() => setDetailsOpen((current) => current === log.id ? null : log.id)}
                      className="admin-action-button"
                    >
                      {detailsOpen === log.id ? 'بستن' : 'مشاهده'}
                    </button>
                  )}
                </div>
                {detailsOpen === log.id && (
                  <div className="admin-activity-row">
                    <span className="admin-activity-mark"><ShieldAlert size={14} /></span>
                    <span className="admin-activity-copy">
                      <strong>جزئیات رویداد</strong>
                      <small><span dir="auto">{formatDetails(log.details)}</span></small>
                    </span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
        {!loading && !error && filteredLogs.length > 0 && (
          <p className="admin-extracted-auditlogs-34 admin-logs-table-note">
            حداکثر ۲۰۰ رویداد اخیر نمایش داده می‌شود؛ فهرست پس از نمایش حداکثر ۱۰ ردیف اسکرول می‌شود.
          </p>
        )}
      </section>
    </div>
  );
};
