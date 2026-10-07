import React, { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle, Clock, Plus, RefreshCw, Trash2, User, XCircle } from 'lucide-react';

type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'DISABLED';
type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

interface Slot {
  id: string;
  startAt: string;
  status: SlotStatus;
  request?: {
    id: string;
    status: RequestStatus;
    student: { id: string; fullName: string; nationalId: string };
  } | null;
}

interface Request {
  id: string;
  status: RequestStatus;
  createdAt: string;
  student: { id: string; fullName: string; nationalId: string; phone: string };
  slot: { id: string; startAt: string; status: SlotStatus };
}

const statusLabel: Record<SlotStatus, string> = {
  AVAILABLE: 'آزاد',
  BOOKED: 'رزرو شده',
  DISABLED: 'غیرفعال',
};

const requestLabel: Record<RequestStatus, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  COMPLETED: 'انجام شده',
  CANCELLED: 'لغو شده',
};

const slotStyle: Record<SlotStatus, { color: string; bg: string }> = {
  AVAILABLE: { color: '#34d399', bg: 'rgba(52,211,153,.1)' },
  BOOKED: { color: '#38bdf8', bg: 'rgba(56,189,248,.1)' },
  DISABLED: { color: '#f87171', bg: 'rgba(248,113,113,.1)' },
};

export const ManageCounseling: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [startAt, setStartAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [slotsRes, requestsRes] = await Promise.all([
        fetch('/api/counseling/slots', { credentials: 'include' }),
        fetch('/api/admin/counseling/requests', { credentials: 'include' }),
      ]);
      if (!slotsRes.ok || !requestsRes.ok) throw new Error('دریافت اطلاعات مشاوره انجام نشد.');
      setSlots(await slotsRes.json());
      setRequests(await requestsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت اطلاعات مشاوره انجام نشد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createSlot = async () => {
    if (!startAt) {
      setError('تاریخ و ساعت را انتخاب کنید.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/counseling/slots', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: new Date(startAt).toISOString() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'ساخت زمان مشاوره انجام نشد.');
      }
      setStartAt('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ساخت زمان مشاوره انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const updateSlot = async (slotId: string, status: SlotStatus) => {
    setError('');
    try {
      const response = await fetch(`/api/admin/counseling/slots/${slotId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'تغییر وضعیت زمان انجام نشد.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت زمان انجام نشد.');
    }
  };

  const removeSlot = async (slotId: string) => {
    if (!window.confirm('این زمان مشاوره حذف شود؟')) return;
    setError('');
    try {
      const response = await fetch(`/api/admin/counseling/slots/${slotId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'حذف زمان انجام نشد.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف زمان انجام نشد.');
    }
  };

  const updateRequest = async (requestId: string, status: RequestStatus) => {
    setError('');
    try {
      const response = await fetch(`/api/admin/counseling/requests/${requestId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'تغییر وضعیت درخواست انجام نشد.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت درخواست انجام نشد.');
    }
  };

  const formatDate = (value: string) => new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div style={{ backgroundColor: '#0e0e11', border: '1px solid #222228', borderRadius: '20px', padding: '32px', color: '#fff', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '9px' }}>
            <CalendarClock size={20} color="#38bdf8" /> مدیریت مشاوره
          </h2>
          <p style={{ color: '#888', fontSize: '11px', margin: '7px 0 0' }}>ساخت زمان‌های مشاوره و مدیریت درخواست هنرجویان</p>
        </div>
        <button onClick={() => void load()} disabled={loading} style={{ background: 'rgba(255,255,255,.06)', color: '#fff', border: '1px solid rgba(255,255,255,.1)', padding: '9px 13px', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <RefreshCw size={14} /> بروزرسانی
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', padding: '12px', borderRadius: '10px', fontSize: '11px', marginBottom: '16px' }}>{error}</div>}

      <section style={{ background: '#141419', border: '1px solid #222228', borderRadius: '16px', padding: '18px', marginBottom: '22px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Plus size={16} color="#34d399" /> ایجاد زمان جدید
        </h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} style={{ flex: 1, minWidth: '220px', background: '#1a1a20', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '9px', fontSize: '12px', direction: 'ltr' }} />
          <button onClick={() => void createSlot()} disabled={saving} style={{ background: 'rgba(52,211,153,.15)', color: '#34d399', border: '1px solid rgba(52,211,153,.3)', padding: '10px 18px', borderRadius: '9px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
            {saving ? 'در حال ثبت...' : 'ثبت زمان مشاوره'}
          </button>
        </div>
      </section>

      <section style={{ marginBottom: '26px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 900, margin: '0 0 12px' }}>زمان‌های مشاوره</h3>
        {loading ? <div style={{ color: '#888', padding: '30px', textAlign: 'center', fontSize: '12px' }}>در حال دریافت...</div> : slots.length === 0 ? <div style={{ color: '#888', padding: '30px', textAlign: 'center', fontSize: '12px', background: '#141419', borderRadius: '14px' }}>هنوز زمانی ایجاد نشده است.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {slots.map(slot => {
              const style = slotStyle[slot.status];
              return <div key={slot.id} style={{ background: '#141419', border: '1px solid #222228', borderRadius: '14px', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <strong style={{ fontSize: '13px' }}>{formatDate(slot.startAt)}</strong>
                  {slot.request?.student && <span style={{ color: '#38bdf8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}><User size={13} /> {slot.request.student.fullName} — {slot.request.student.nationalId}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                  <span style={{ background: style.bg, color: style.color, padding: '6px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 800 }}>{statusLabel[slot.status]}</span>
                  {slot.status === 'AVAILABLE' && <button onClick={() => void updateSlot(slot.id, 'DISABLED')} style={{ background: 'rgba(248,113,113,.1)', color: '#f87171', border: '1px solid rgba(248,113,113,.2)', padding: '6px 9px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px' }}>غیرفعال</button>}
                  {slot.status === 'DISABLED' && <button onClick={() => void updateSlot(slot.id, 'AVAILABLE')} style={{ background: 'rgba(52,211,153,.1)', color: '#34d399', border: '1px solid rgba(52,211,153,.2)', padding: '6px 9px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px' }}>فعال</button>}
                  {slot.status !== 'BOOKED' && <button onClick={() => void removeSlot(slot.id)} style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)', padding: '6px 9px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={13} /></button>}
                </div>
              </div>;
            })}
          </div>
        )}
      </section>

      <section>
        <h3 style={{ fontSize: '14px', fontWeight: 900, margin: '0 0 12px' }}>درخواست‌های مشاوره</h3>
        {requests.length === 0 ? <div style={{ color: '#888', padding: '30px', textAlign: 'center', fontSize: '12px', background: '#141419', borderRadius: '14px' }}>هنوز درخواستی ثبت نشده است.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {requests.map(req => <div key={req.id} style={{ background: '#141419', border: '1px solid #222228', borderRadius: '14px', padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <strong style={{ fontSize: '13px' }}>{req.student.fullName}</strong>
                  <span style={{ color: '#888', fontSize: '10px' }}>کد ملی: {req.student.nationalId} · موبایل: {req.student.phone}</span>
                  <span style={{ color: '#fbbf24', fontSize: '11px' }}>زمان: {formatDate(req.slot.startAt)}</span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,.06)', color: '#ddd' }}>{requestLabel[req.status]}</span>
              </div>
              {req.status === 'PENDING' && <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => void updateRequest(req.id, 'APPROVED')} style={{ background: 'rgba(52,211,153,.15)', color: '#34d399', border: '1px solid rgba(52,211,153,.3)', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }}><CheckCircle size={13} style={{ verticalAlign: 'middle' }} /> تأیید</button>
                <button onClick={() => void updateRequest(req.id, 'REJECTED')} style={{ background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.25)', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }}><XCircle size={13} style={{ verticalAlign: 'middle' }} /> رد</button>
              </div>}
              {req.status === 'APPROVED' && <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => void updateRequest(req.id, 'COMPLETED')} style={{ background: 'rgba(52,211,153,.15)', color: '#34d399', border: '1px solid rgba(52,211,153,.3)', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }}>ثبت انجام جلسه</button>
                <button onClick={() => void updateRequest(req.id, 'CANCELLED')} style={{ background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.25)', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px' }}>لغو</button>
              </div>}
            </div>)}
          </div>
        )}
      </section>
    </div>
  );
};
