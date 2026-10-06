import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, BookOpen, Link, RefreshCw } from 'lucide-react';

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

  const statusLabel = (status: Status) => status === 'APPROVED' ? 'تأیید شده' : status === 'REJECTED' ? 'رد شده' : 'در انتظار بررسی';

  return (
    <div style={{ backgroundColor: '#0e0e11', border: '1px solid #222228', borderRadius: '20px', padding: '32px', color: '#fff', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} color="#ff3366" /> مدیریت درخواست‌های کلاس‌های آفلاین هنرجویان
        </h2>
        <button onClick={() => void loadRequests()} disabled={loading} style={{ background: 'rgba(255,255,255,.06)', color: '#fff', border: '1px solid rgba(255,255,255,.1)', padding: '8px 12px', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
          <RefreshCw size={13} /> بروزرسانی
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', padding: '12px', borderRadius: '10px', fontSize: '11px', marginBottom: '14px' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 0', fontSize: '12px' }}>در حال دریافت درخواست‌ها...</div>
      ) : requests.length === 0 ? (
        <p style={{ color: '#888', fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>هنوز هیچ درخواستی از طرف هنرجویان ثبت نشده است.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {requests.map(req => (
            <div key={req.id} style={{ backgroundColor: '#141419', border: '1px solid #222228', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>هنرجو: {req.student.fullName}</span>
                  <span style={{ fontSize: '11px', color: '#38bdf8' }}>کد ملی: {req.student.nationalId}</span>
                  <span style={{ fontSize: '12px', color: '#38bdf8' }}>دوره: {req.course.title}</span>
                  <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 700 }}>جلسه {req.session.sessionNumber}: {req.session.title}</span>
                  <span style={{ fontSize: '10px', color: '#888' }}>تاریخ ثبت: {new Date(req.createdAt).toLocaleString('fa-IR')}</span>
                </div>
                <span style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, backgroundColor: req.status === 'APPROVED' ? 'rgba(52,211,153,.1)' : req.status === 'REJECTED' ? 'rgba(239,68,68,.1)' : 'rgba(251,191,36,.1)', color: req.status === 'APPROVED' ? '#34d399' : req.status === 'REJECTED' ? '#f87171' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {req.status === 'APPROVED' ? <CheckCircle size={14} /> : req.status === 'REJECTED' ? <XCircle size={14} /> : <Clock size={14} />}
                  {statusLabel(req.status)}
                </span>
              </div>

              {req.status === 'APPROVED' && req.meetingLink && (
                <a href={req.meetingLink} target="_blank" rel="noreferrer" style={{ color: '#34d399', fontSize: '11px' }}>لینک تأییدشده: {req.meetingLink}</a>
              )}

              {req.status === 'PENDING' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Link size={16} color="#38bdf8" />
                    <input type="url" placeholder="لینک کلاس یا فایل ضبط شده (https://...)" value={links[req.id] || ''} onChange={e => setLinks(current => ({ ...current, [req.id]: e.target.value }))} style={{ flex: 1, backgroundColor: '#1a1a20', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => void review(req.id, 'APPROVED')} disabled={reviewing === req.id} style={{ backgroundColor: 'rgba(52,211,153,.15)', color: '#34d399', border: '1px solid rgba(52,211,153,.3)', padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                      تأیید و ارسال لینک به هنرجو
                    </button>
                    <button onClick={() => void review(req.id, 'REJECTED')} disabled={reviewing === req.id} style={{ backgroundColor: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)', padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                      رد درخواست
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
