import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, FileText, RefreshCw, ShieldAlert } from 'lucide-react';

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
};

function formatAction(action: string): string {
  if (actionLabels[action]) return actionLabels[action];
  const match = action.match(/^(POST|PUT|PATCH|DELETE)\\s+(.+)$/);
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
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="admin-legacy-page admin-logs-page" style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', boxSizing: 'border-box' }}>
      <section style={{ background: 'var(--admin-card, #fff)', color: 'var(--admin-text, #202a2a)', border: '1px solid var(--admin-border, #d8e3e0)', padding: '24px 28px', borderRadius: 20, boxShadow: 'var(--admin-shadow, 0 8px 24px rgba(0,0,0,.05))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={21} /> لاگ تغییرات و فعالیت مدیران
            </h2>
            <p style={{ fontSize: 13, color: 'var(--admin-sub, #667675)', margin: 0, lineHeight: 1.9 }}>
              گزارش‌های ذخیره‌شده در پایگاه داده؛ حداکثر ۲۰۰ رویداد اخیر
            </p>
          </div>
          <button type="button" onClick={() => void loadLogs(true)} disabled={loading || refreshing} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid var(--admin-border, #d8e3e0)', background: 'var(--admin-control, #fbfdfc)', color: 'var(--admin-text, #202a2a)', padding: '10px 14px', borderRadius: 10, cursor: loading || refreshing ? 'wait' : 'pointer' }}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            به‌روزرسانی گزارش‌ها
          </button>
        </div>
      </section>

      {error && (
        <section role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 18, borderRadius: 14, border: '1px solid #e8b4b4', background: '#fff1f1', color: '#8b2525' }}>
          <AlertCircle size={20} />
          <div>
            <strong>گزارش‌ها دریافت نشدند</strong>
            <p style={{ margin: '6px 0 0', lineHeight: 1.8 }}>{error}</p>
          </div>
        </section>
      )}

      <section style={{ background: 'var(--admin-card, #fff)', color: 'var(--admin-text, #202a2a)', border: '1px solid var(--admin-border, #d8e3e0)', padding: 20, borderRadius: 20, boxShadow: 'var(--admin-shadow, 0 8px 24px rgba(0,0,0,.05))' }}>
        {loading ? (
          <p role="status" style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--admin-sub, #667675)' }}>در حال دریافت گزارش‌های سیستمی…</p>
        ) : !error && logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--admin-sub, #667675)' }}>
            <ShieldAlert size={28} style={{ margin: '0 auto 12px' }} />
            <strong style={{ display: 'block', marginBottom: 8 }}>هنوز گزارشی در پایگاه داده ثبت نشده است.</strong>
            <span style={{ fontSize: 13 }}>این پیام فقط پس از دریافت موفق پاسخ خالی از سرور نمایش داده می‌شود.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {logs.map((log) => (
              <article key={log.id} style={{ border: '1px solid var(--admin-border, #d8e3e0)', borderRadius: 14, padding: '16px 18px', background: 'var(--admin-control, #fbfdfc)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <ShieldAlert size={17} />
                      <strong>{formatAction(log.action)}</strong>
                      <span style={{ fontSize: 12, color: 'var(--admin-sub, #667675)' }}>({log.entityType}{log.entityId ? ` · ${log.entityId}` : ''})</span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                      <strong>انجام‌دهنده:</strong> {log.performedBy}
                    </div>
                  </div>
                  <time dateTime={log.timestamp} style={{ fontSize: 12, color: 'var(--admin-sub, #667675)', whiteSpace: 'nowrap' }}>{formatTimestamp(log.timestamp)}</time>
                </div>
                {log.details != null && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 13 }}>مشاهده جزئیات رویداد</summary>
                    <pre dir="auto" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12, lineHeight: 1.8, padding: 12, borderRadius: 8, background: 'var(--admin-inner, #e7efed)', marginTop: 10 }}>{formatDetails(log.details)}</pre>
                  </details>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
