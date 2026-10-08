import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Clock, BookOpen, Link, RefreshCw, Users, Activity } from 'lucide-react';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

interface OfflineRequest {
  id: string;
  status: Status;
  meetingLink: string | null;
  createdAt: string;
  student: { id: string; fullName: string; nationalId: string };
  course: { id: string; title: string };
  session: { id: string; title: string; sessionNumber: number; sessionDate: string; status: string };
}

export const ManageOfflineRequests: React.FC = () => {
  const [requests, setRequests] = useState<OfflineRequest[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL');

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/offline-requests', { credentials: 'include' });
      if (!response.ok) throw new Error('دریافت درخواست‌های آفلاین انجام نشد.');
      setRequests(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت درخواست‌های آفلاین انجام نشد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRequests(); }, []);

  const review = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const meetingLink = links[id]?.trim();
    if (status === 'APPROVED' && !meetingLink) {
      setError('برای تأیید درخواست، لینک کلاس یا فایل ضبط‌شده را وارد کنید.');
      return;
    }
    setReviewing(id);
    setError('');
    try {
      const response = await fetch(`/api/admin/offline-requests/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(status === 'APPROVED' ? { meetingLink } : {}) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'بررسی درخواست انجام نشد.');
      }
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بررسی درخواست انجام نشد.');
    } finally {
      setReviewing(null);
    }
  };

  const statusLabel = (status: Status) =>
    status === 'APPROVED' ? 'تأیید شده' : status === 'REJECTED' ? 'رد شده' : 'در انتظار بررسی';

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(item => item.status === 'PENDING').length,
    approved: requests.filter(item => item.status === 'APPROVED').length,
    rejected: requests.filter(item => item.status === 'REJECTED').length,
  }), [requests]);

  const filteredRequests = useMemo(
    () => statusFilter === 'ALL' ? requests : requests.filter(item => item.status === statusFilter),
    [requests, statusFilter],
  );

  const statCards = [
    { key: 'ALL' as const, label: 'کل درخواست‌ها', value: stats.total, icon: Activity },
    { key: 'PENDING' as const, label: 'در انتظار بررسی', value: stats.pending, icon: Clock },
    { key: 'APPROVED' as const, label: 'تأیید شده', value: stats.approved, icon: CheckCircle },
    { key: 'REJECTED' as const, label: 'رد شده', value: stats.rejected, icon: XCircle },
  ];

  return (
    <div className="admin-legacy-page admin-offline-page">
      <div className="offline-page-head">
        <div>
          <div className="offline-eyebrow"><BookOpen size={15} /> درخواست‌های آفلاین</div>
          <h2>مدیریت درخواست‌های کلاس آفلاین</h2>
          <p>درخواست‌های دسترسی هنرجویان را بررسی و وضعیت آن‌ها را مدیریت کنید.</p>
        </div>
        <button className="offline-refresh" onClick={() => void loadRequests()} disabled={loading}>
          <RefreshCw size={14} /> بروزرسانی
        </button>
      </div>

      {error && <div className="offline-error">{error}</div>}

      <section className="offline-stats">
        {statCards.map(card => {
          const Icon = card.icon;
          const active = statusFilter === card.key;
          const percent = stats.total ? Math.round((card.value / stats.total) * 100) : 0;
          return (
            <button
              key={card.key}
              type="button"
              className={`offline-stat-card${active ? ' is-active' : ''}`}
              onClick={() => setStatusFilter(card.key)}
            >
              <span className="offline-stat-icon"><Icon size={17} /></span>
              <span className="offline-stat-copy">
                <strong>{card.value}</strong>
                <small>{card.label}</small>
              </span>
              <span className="offline-stat-meter"><span style={{ width: `${percent}%` }} /></span>
              <span className="offline-stat-percent">{percent}%</span>
            </button>
          );
        })}
      </section>

      <section className="offline-list-card">
        <div className="offline-list-head">
          <div>
            <h3><Users size={16} /> فهرست درخواست‌ها</h3>
            <span>{filteredRequests.length} درخواست</span>
          </div>
          <div className="offline-filter-group">
            <button type="button" className={statusFilter === 'ALL' ? 'active' : ''} onClick={() => setStatusFilter('ALL')}>همه</button>
            <button type="button" className={statusFilter === 'PENDING' ? 'active' : ''} onClick={() => setStatusFilter('PENDING')}>در انتظار</button>
            <button type="button" className={statusFilter === 'APPROVED' ? 'active' : ''} onClick={() => setStatusFilter('APPROVED')}>تأیید شده</button>
            <button type="button" className={statusFilter === 'REJECTED' ? 'active' : ''} onClick={() => setStatusFilter('REJECTED')}>رد شده</button>
          </div>
        </div>

        {loading ? (
          <div className="offline-empty">در حال دریافت درخواست‌ها...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="offline-empty">درخواستی در این وضعیت وجود ندارد.</div>
        ) : (
          <div className="offline-request-list">
            {filteredRequests.map(req => (
              <article key={req.id} className="offline-request-row">
                <div className="offline-request-main">
                  <div className="offline-student">
                    <strong>{req.student.fullName}</strong>
                    <span>کد ملی: {req.student.nationalId}</span>
                  </div>
                  <div className="offline-course">
                    <strong>{req.course.title}</strong>
                    <span>جلسه {req.session.sessionNumber}: {req.session.title}</span>
                  </div>
                  <div className="offline-date">
                    <span>تاریخ ثبت</span>
                    <strong>{new Date(req.createdAt).toLocaleDateString('fa-IR')}</strong>
                  </div>
                  <span className={`offline-status status-${req.status.toLowerCase()}`}>
                    {req.status === 'APPROVED' ? <CheckCircle size={14} /> : req.status === 'REJECTED' ? <XCircle size={14} /> : <Clock size={14} />}
                    {statusLabel(req.status)}
                  </span>
                </div>

                {req.status === 'APPROVED' && req.meetingLink && (
                  <a className="offline-approved-link" href={req.meetingLink} target="_blank" rel="noreferrer">
                    لینک تأییدشده <span>{req.meetingLink}</span>
                  </a>
                )}

                {req.status === 'PENDING' && (
                  <div className="offline-review">
                    <div className="offline-link-field">
                      <Link size={15} />
                      <input
                        type="url"
                        placeholder="لینک کلاس یا فایل ضبط‌شده (https://...)"
                        value={links[req.id] || ''}
                        onChange={e => setLinks(current => ({ ...current, [req.id]: e.target.value }))}
                      />
                    </div>
                    <div className="offline-review-actions">
                      <button type="button" className="approve" onClick={() => void review(req.id, 'APPROVED')} disabled={reviewing === req.id}>
                        <CheckCircle size={14} /> تأیید و ارسال لینک
                      </button>
                      <button type="button" className="reject" onClick={() => void review(req.id, 'REJECTED')} disabled={reviewing === req.id}>
                        <XCircle size={14} /> رد درخواست
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
