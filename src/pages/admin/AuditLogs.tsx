import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileText, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import '../../styles/admin/pages/AuditLogs.css';

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
      <section className="admin-extracted-auditlogs-2">
        <div className="admin-extracted-auditlogs-3">
          <div>
            <h2 className="admin-extracted-auditlogs-4">
              <FileText size={21} /> گزارش‌های سیستمی
            </h2>
            <p className="admin-extracted-auditlogs-5">
              مشاهده و جست‌وجوی ۲۰۰ رویداد اخیر؛ برای دیدن جزئیات هر رویداد، ردیف آن را باز کنید.
            </p>
          </div>
          <button type="button" onClick={() => void loadLogs(true)} disabled={loading || refreshing} className="admin-audit-refresh">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            به‌روزرسانی
          </button>
        </div>
      </section>

      {error && (
        <section role="alert" className="admin-extracted-auditlogs-6">
          <AlertCircle size={20} />
          <div>
            <strong>گزارش‌ها دریافت نشدند</strong>
            <p className="admin-extracted-auditlogs-7">{error}</p>
          </div>
        </section>
      )}

      <section className="admin-extracted-auditlogs-8">
        <div className="admin-extracted-auditlogs-9">
          <div className="admin-extracted-auditlogs-10">
            <ShieldAlert size={17} />
            <span>{loading ? 'در حال دریافت…' : `${filteredLogs.length.toLocaleString('fa-IR')} مورد از ${logs.length.toLocaleString('fa-IR')} رویداد`}</span>
          </div>
          <div className="admin-extracted-auditlogs-11">
            <label className="audit-search-field">
              <Search size={16} className="admin-extracted-auditlogs-12" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جست‌وجوی رویداد، کاربر، شناسه…"
                aria-label="جست‌وجو در گزارش‌های سیستمی"
                className="audit-search-input admin-audit-filter admin-audit-filter--search"
              />
            </label>
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} aria-label="فیلتر نوع رویداد" className="admin-audit-filter admin-audit-filter--select">
              <option value="all">همهٔ نوع رویدادها</option>
              {actions.map((action) => <option key={action} value={action}>{formatAction(action)}</option>)}
            </select>
          </div>
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
          <div className="admin-extracted-auditlogs-19">
            <table className="admin-extracted-auditlogs-20">
              <thead className="admin-extracted-auditlogs-21">
                <tr className="admin-extracted-auditlogs-22">
                  {['زمان', 'نوع عملیات', 'بخش / شناسه', 'انجام‌دهنده', 'جزئیات'].map((heading) => (
                    <th key={heading} scope="col" className="admin-extracted-auditlogs-23">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className={`admin-audit-row${detailsOpen === log.id ? ' is-expanded' : ''}`}>
                      <td className="admin-extracted-auditlogs-24">
                        <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
                      </td>
                      <td className="admin-extracted-auditlogs-25">{formatAction(log.action)}</td>
                      <td className="admin-extracted-auditlogs-26">
                        <span>{log.entityType}</span>
                        {log.entityId && <span className="admin-extracted-auditlogs-27">{log.entityId}</span>}
                      </td>
                      <td className="admin-extracted-auditlogs-28">{log.performedBy}</td>
                      <td className="admin-extracted-auditlogs-29">
                        {log.details == null ? <span className="admin-extracted-auditlogs-30">—</span> : (
                          <button type="button" aria-expanded={detailsOpen === log.id} onClick={() => setDetailsOpen((current) => current === log.id ? null : log.id)} className="admin-extracted-auditlogs-31">
                            {detailsOpen === log.id ? 'بستن جزئیات' : 'مشاهده'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {detailsOpen === log.id && (
                      <tr>
                        <td colSpan={5} className="admin-extracted-auditlogs-32">
                          <pre dir="auto" className="admin-extracted-auditlogs-33">{formatDetails(log.details)}</pre>
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
          <p className="admin-extracted-auditlogs-34">
            حداکثر ۲۰۰ رویداد اخیر نمایش داده می‌شود؛ جدول پس از نمایش حداکثر ۱۰ ردیف اسکرول می‌شود.
          </p>
        )}
      </section>
    </div>
  );
};
