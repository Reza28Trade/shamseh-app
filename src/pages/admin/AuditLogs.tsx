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
    <div className="admin-legacy-page admin-logs-page" import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    <div className="admin-legacy-page admin-logs-page adm-inline-canhot" import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    <div className="admin-legacy-page admin-logs-page" import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    <div className="admin-legacy-page admin-logs-page adm-inline-canhot" >
      <section 
      <section className="adm-inline-1fbk3wy" 
      <section 
      <section className="adm-inline-1fbk3wy" >
        <div 
        <div className="adm-inline-1x3j4ho" 
        <div 
        <div className="adm-inline-1x3j4ho" >
          <div>
            <h2 
          <div>
            <h2 className="adm-inline-13pgbqo" 
          <div>
            <h2 
          <div>
            <h2 className="adm-inline-13pgbqo" >
              <FileText size={21} /> گزارش‌های سیستمی
            </h2>
            <p 
              <FileText size={21} /> گزارش‌های سیستمی
            </h2>
            <p className="adm-inline-g4luag" 
              <FileText size={21} /> گزارش‌های سیستمی
            </h2>
            <p 
              <FileText size={21} /> گزارش‌های سیستمی
            </h2>
            <p className="adm-inline-g4luag" >
              مشاهده و جست‌وجوی ۲۰۰ رویداد اخیر؛ برای دیدن جزئیات هر رویداد، ردیف آن را باز کنید.
            </p>
          </div>
          <button type="button" onClick={() => void loadLogs(true)} disabled={loading || refreshing} 
              مشاهده و جست‌وجوی ۲۰۰ رویداد اخیر؛ برای دیدن جزئیات هر رویداد، ردیف آن را باز کنید.
            </p>
          </div>
          <button type="button" onClick={() => void loadLogs(true)} disabled={loading || refreshing} >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            به‌روزرسانی
          </button>
        </div>
      </section>

      {error && (
        <section role="alert" }>
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            به‌روزرسانی
          </button>
        </div>
      </section>

      {error && (
        <section className="adm-inline-u40966" role="alert" 
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            به‌روزرسانی
          </button>
        </div>
      </section>

      {error && (
        <section role="alert" }>
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            به‌روزرسانی
          </button>
        </div>
      </section>

      {error && (
        <section className="adm-inline-u40966" role="alert" >
          <AlertCircle size={20} />
          <div>
            <strong>گزارش‌ها دریافت نشدند</strong>
            <p 
          <AlertCircle size={20} />
          <div>
            <strong>گزارش‌ها دریافت نشدند</strong>
            <p className="adm-inline-p1bnu4" 
          <AlertCircle size={20} />
          <div>
            <strong>گزارش‌ها دریافت نشدند</strong>
            <p 
          <AlertCircle size={20} />
          <div>
            <strong>گزارش‌ها دریافت نشدند</strong>
            <p className="adm-inline-p1bnu4" >{error}</p>
          </div>
        </section>
      )}

      <section {error}</p>
          </div>
        </section>
      )}

      <section className="adm-inline-1r6dlsn" {error}</p>
          </div>
        </section>
      )}

      <section {error}</p>
          </div>
        </section>
      )}

      <section className="adm-inline-1r6dlsn" >
        <div 
        <div className="adm-inline-1xurexy" 
        <div 
        <div className="adm-inline-1xurexy" >
          <div 
          <div className="adm-inline-859uxg" 
          <div 
          <div className="adm-inline-859uxg" >
            <ShieldAlert size={17} />
            <span>{loading ? 'در حال دریافت…' : `${filteredLogs.length.toLocaleString('fa-IR')} مورد از ${logs.length.toLocaleString('fa-IR')} رویداد`}</span>
          </div>
          <div 
            <ShieldAlert size={17} />
            <span>{loading ? 'در حال دریافت…' : `${filteredLogs.length.toLocaleString('fa-IR')} مورد از ${logs.length.toLocaleString('fa-IR')} رویداد`}</span>
          </div>
          <div className="adm-inline-ldpljm" 
            <ShieldAlert size={17} />
            <span>{loading ? 'در حال دریافت…' : `${filteredLogs.length.toLocaleString('fa-IR')} مورد از ${logs.length.toLocaleString('fa-IR')} رویداد`}</span>
          </div>
          <div 
            <ShieldAlert size={17} />
            <span>{loading ? 'در حال دریافت…' : `${filteredLogs.length.toLocaleString('fa-IR')} مورد از ${logs.length.toLocaleString('fa-IR')} رویداد`}</span>
          </div>
          <div className="adm-inline-ldpljm" >
            <label className="audit-search-field">
              <Search size={16} 
            <label className="audit-search-field">
              <Search className="adm-inline-1ljqdx6" size={16} 
            <label className="audit-search-field">
              <Search size={16} 
            <label className="audit-search-field">
              <Search className="adm-inline-1ljqdx6" size={16}  />
              <input
                className="audit-search-input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جست‌وجوی رویداد، کاربر، شناسه…"
                aria-label="جست‌وجو در گزارش‌های سیستمی"
                
              <input
                className="audit-search-input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جست‌وجوی رویداد، کاربر، شناسه…"
                aria-label="جست‌وجو در گزارش‌های سیستمی"
                
              />
            </label>
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} aria-label="فیلتر نوع رویداد" 
            </label>
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} aria-label="فیلتر نوع رویداد" >
              <option value="all">همهٔ نوع رویدادها</option>
              {actions.map((action) => <option key={action} value={action}>{formatAction(action)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p role="status" }>
              <option value="all">همهٔ نوع رویدادها</option>
              {actions.map((action) => <option key={action} value={action}>{formatAction(action)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="adm-inline-1bv13tf" role="status" 
              <option value="all">همهٔ نوع رویدادها</option>
              {actions.map((action) => <option key={action} value={action}>{formatAction(action)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p role="status" }>
              <option value="all">همهٔ نوع رویدادها</option>
              {actions.map((action) => <option key={action} value={action}>{formatAction(action)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="adm-inline-1bv13tf" role="status" >در حال دریافت گزارش‌های سیستمی…</p>
        ) : !error && logs.length === 0 ? (
          <div در حال دریافت گزارش‌های سیستمی…</p>
        ) : !error && logs.length === 0 ? (
          <div className="adm-inline-6yj42w" در حال دریافت گزارش‌های سیستمی…</p>
        ) : !error && logs.length === 0 ? (
          <div در حال دریافت گزارش‌های سیستمی…</p>
        ) : !error && logs.length === 0 ? (
          <div className="adm-inline-6yj42w" >
            <ShieldAlert size={28} 
            <ShieldAlert className="adm-inline-16w3o36" size={28} 
            <ShieldAlert size={28} 
            <ShieldAlert className="adm-inline-16w3o36" size={28}  />
            <strong 
            <strong className="adm-inline-l3ntl0" 
            <strong 
            <strong className="adm-inline-l3ntl0" >هنوز گزارشی ثبت نشده است.</strong>
            <span هنوز گزارشی ثبت نشده است.</strong>
            <span className="adm-inline-ejkaud" هنوز گزارشی ثبت نشده است.</strong>
            <span هنوز گزارشی ثبت نشده است.</strong>
            <span className="adm-inline-ejkaud" >پس از انجام عملیات مدیریتی، گزارش‌ها در این بخش نمایش داده می‌شوند.</span>
          </div>
        ) : !error && filteredLogs.length === 0 ? (
          <div پس از انجام عملیات مدیریتی، گزارش‌ها در این بخش نمایش داده می‌شوند.</span>
          </div>
        ) : !error && filteredLogs.length === 0 ? (
          <div className="adm-inline-1bv13tf" پس از انجام عملیات مدیریتی، گزارش‌ها در این بخش نمایش داده می‌شوند.</span>
          </div>
        ) : !error && filteredLogs.length === 0 ? (
          <div پس از انجام عملیات مدیریتی، گزارش‌ها در این بخش نمایش داده می‌شوند.</span>
          </div>
        ) : !error && filteredLogs.length === 0 ? (
          <div className="adm-inline-1bv13tf" >موردی با این عبارت یا فیلتر پیدا نشد.</div>
        ) : (
          <div موردی با این عبارت یا فیلتر پیدا نشد.</div>
        ) : (
          <div className="adm-inline-12vlmbx" موردی با این عبارت یا فیلتر پیدا نشد.</div>
        ) : (
          <div موردی با این عبارت یا فیلتر پیدا نشد.</div>
        ) : (
          <div className="adm-inline-12vlmbx" >
            <table 
            <table className="adm-inline-w5d7i8" 
            <table 
            <table className="adm-inline-w5d7i8" >
              <thead 
              <thead className="adm-inline-15mmcnm" 
              <thead 
              <thead className="adm-inline-15mmcnm" >
                <tr 
                <tr className="adm-inline-1to5yvv" 
                <tr 
                <tr className="adm-inline-1to5yvv" >
                  {['زمان', 'نوع عملیات', 'بخش / شناسه', 'انجام‌دهنده', 'جزئیات'].map((heading) => (
                    <th key={heading} scope="col" 
                  {['زمان', 'نوع عملیات', 'بخش / شناسه', 'انجام‌دهنده', 'جزئیات'].map((heading) => (
                    <th className="adm-inline-1vsa9wu" key={heading} scope="col" 
                  {['زمان', 'نوع عملیات', 'بخش / شناسه', 'انجام‌دهنده', 'جزئیات'].map((heading) => (
                    <th key={heading} scope="col" 
                  {['زمان', 'نوع عملیات', 'بخش / شناسه', 'انجام‌دهنده', 'جزئیات'].map((heading) => (
                    <th className="adm-inline-1vsa9wu" key={heading} scope="col" >{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr {heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr >
                      <td }>
                      <td className="adm-inline-meyt9p" 
                      <td }>
                      <td className="adm-inline-meyt9p" >
                        <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
                      </td>
                      <td 
                        <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
                      </td>
                      <td className="adm-inline-1kb1nk7" 
                        <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
                      </td>
                      <td 
                        <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
                      </td>
                      <td className="adm-inline-1kb1nk7" >{formatAction(log.action)}</td>
                      <td {formatAction(log.action)}</td>
                      <td className="adm-inline-1nf4j6i" {formatAction(log.action)}</td>
                      <td {formatAction(log.action)}</td>
                      <td className="adm-inline-1nf4j6i" >
                        <span>{log.entityType}</span>
                        {log.entityId && <span 
                        <span>{log.entityType}</span>
                        {log.entityId && <span className="adm-inline-1wt5x33" 
                        <span>{log.entityType}</span>
                        {log.entityId && <span 
                        <span>{log.entityType}</span>
                        {log.entityId && <span className="adm-inline-1wt5x33" >{log.entityId}</span>}
                      </td>
                      <td {log.entityId}</span>}
                      </td>
                      <td className="adm-inline-jlsf5l" {log.entityId}</span>}
                      </td>
                      <td {log.entityId}</span>}
                      </td>
                      <td className="adm-inline-jlsf5l" >{log.performedBy}</td>
                      <td {log.performedBy}</td>
                      <td className="adm-inline-1j5jdjz" {log.performedBy}</td>
                      <td {log.performedBy}</td>
                      <td className="adm-inline-1j5jdjz" >
                        {log.details == null ? <span 
                        {log.details == null ? <span className="adm-inline-1oda3oj" 
                        {log.details == null ? <span 
                        {log.details == null ? <span className="adm-inline-1oda3oj" >—</span> : (
                          <button type="button" aria-expanded={detailsOpen === log.id} onClick={() => setDetailsOpen((current) => current === log.id ? null : log.id)} —</span> : (
                          <button className="adm-inline-1gr6yjk" type="button" aria-expanded={detailsOpen === log.id} onClick={() => setDetailsOpen((current) => current === log.id ? null : log.id)} —</span> : (
                          <button type="button" aria-expanded={detailsOpen === log.id} onClick={() => setDetailsOpen((current) => current === log.id ? null : log.id)} —</span> : (
                          <button className="adm-inline-1gr6yjk" type="button" aria-expanded={detailsOpen === log.id} onClick={() => setDetailsOpen((current) => current === log.id ? null : log.id)} >
                            {detailsOpen === log.id ? 'بستن جزئیات' : 'مشاهده'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {detailsOpen === log.id && (
                      <tr>
                        <td colSpan={5} 
                            {detailsOpen === log.id ? 'بستن جزئیات' : 'مشاهده'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {detailsOpen === log.id && (
                      <tr>
                        <td className="adm-inline-1mzkgmg" colSpan={5} 
                            {detailsOpen === log.id ? 'بستن جزئیات' : 'مشاهده'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {detailsOpen === log.id && (
                      <tr>
                        <td colSpan={5} 
                            {detailsOpen === log.id ? 'بستن جزئیات' : 'مشاهده'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {detailsOpen === log.id && (
                      <tr>
                        <td className="adm-inline-1mzkgmg" colSpan={5} >
                          <pre dir="auto" 
                          <pre className="adm-inline-zns90g" dir="auto" 
                          <pre dir="auto" 
                          <pre className="adm-inline-zns90g" dir="auto" >{formatDetails(log.details)}</pre>
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
          <p {formatDetails(log.details)}</pre>
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
          <p className="adm-inline-1iygd4k" {formatDetails(log.details)}</pre>
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
          <p {formatDetails(log.details)}</pre>
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
          <p className="adm-inline-1iygd4k" >
            حداکثر ۲۰۰ رویداد اخیر نمایش داده می‌شود؛ جدول پس از نمایش حداکثر ۱۰ ردیف اسکرول می‌شود.
          </p>
        )}
      </section>
    </div>
  );
};
