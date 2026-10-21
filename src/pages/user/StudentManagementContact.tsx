import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Send } from 'lucide-react';

type TicketStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';
type TicketMessage = { id: string; content: string; createdAt: string; senderUserId: string };
type Ticket = { id: string; studentId: string; subject: string; status: TicketStatus; createdAt: string; updatedAt: string; messages: TicketMessage[] };

interface Props { isDark: boolean }

export const StudentManagementContact: React.FC<Props> = ({ isDark }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const card = isDark ? '#1D1B1B' : '#F7F1E8';
  const inner = isDark ? '#302D2D' : '#E5D9CB';
  const text = isDark ? '#EEE5DA' : '#262424';
  const sub = isDark ? '#B9B0A6' : '#655D55';
  const border = isDark ? 'rgba(238,229,218,.12)' : 'rgba(38,36,36,.12)';
  const accent = isDark ? '#48D1CC' : '#008080';

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/management-contact/tickets', { credentials: 'include' });
      if (!response.ok) throw new Error('دریافت درخواست‌های ارتباط با مدیریت انجام نشد.');
      setTickets(await response.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در دریافت تیکت‌ها.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTickets(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !content.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    setSuccess(false);
    try {
      const response = await fetch('/api/management-contact/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), content: content.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'ثبت درخواست انجام نشد.');
      setTickets(current => [data, ...current]);
      setSubject('');
      setContent('');
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت درخواست انجام نشد.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (status: TicketStatus) => status === 'ANSWERED' ? 'پاسخ داده شده' : status === 'CLOSED' ? 'بسته شده' : 'در انتظار پاسخ';

  return <section style={{ display: 'flex', flexDirection: 'column', gap: 18, color: text }}>
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 15, padding: 18, boxShadow: 'none' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 18px', fontSize: 15, fontWeight: 900 }}><Send size={17} color={accent} /> ثبت تیکت جدید</h3>
      {success && <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 11, marginBottom: 14, background: 'rgba(16,185,129,.10)', color: '#10b981', fontSize: 12, fontWeight: 800 }}><CheckCircle2 size={16} /> درخواست شما برای مدیریت ثبت شد.</div>}
      {error && <div role="alert" style={{ padding: 12, borderRadius: 11, marginBottom: 14, background: 'rgba(239,68,68,.10)', color: '#f87171', fontSize: 12 }}>{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, color: sub, fontWeight: 800 }}>موضوع
          <input value={subject} onChange={e => setSubject(e.target.value)} required maxLength={180} placeholder="موضوع انتقاد، پیشنهاد یا درخواست" style={{ width: '100%', boxSizing: 'border-box', background: inner, border: `1px solid ${border}`, color: text, padding: '12px 14px', borderRadius: 11, font: 'inherit', outlineColor: accent }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, color: sub, fontWeight: 800 }}>متن پیام
          <textarea value={content} onChange={e => setContent(e.target.value)} required rows={4} maxLength={10000} placeholder="متن درخواست خود را بنویسید..." style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: inner, border: `1px solid ${border}`, color: text, padding: '12px 14px', borderRadius: 11, font: 'inherit', outlineColor: accent, lineHeight: 1.9 }} />
        </label>
        <button type="submit" disabled={submitting || !subject.trim() || !content.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, border: 0, borderRadius: 11, color: '#fff', background: accent, fontSize: 12, fontWeight: 900, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? .7 : 1 }}>
          <Send size={15} /> {submitting ? 'در حال ثبت...' : 'ثبت و ارسال برای مدیریت'}
        </button>
      </form>
    </div>

    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 15, padding: 18, boxShadow: 'none' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 850 }}>تاریخچه درخواست‌ها</h3>
      {loading ? <p style={{ color: sub, fontSize: 12 }}>در حال دریافت تیکت‌ها...</p>
        : tickets.length === 0 ? <p style={{ color: sub, fontSize: 12 }}>هنوز درخواستی برای مدیریت ثبت نکرده‌اید.</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tickets.map(ticket => <article key={ticket.id} style={{ border: `1px solid ${border}`, borderRadius: 13, padding: 15, background: inner, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div><strong style={{ fontSize: 12 }}>موضوع: {ticket.subject}</strong><div style={{ color: sub, fontSize: 10, marginTop: 5 }}>ثبت: {new Date(ticket.createdAt).toLocaleString('fa-IR')}</div></div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, padding: '5px 9px', fontSize: 10, fontWeight: 900, color: ticket.status === 'ANSWERED' ? '#10b981' : ticket.status === 'CLOSED' ? sub : '#d97706', background: ticket.status === 'ANSWERED' ? 'rgba(16,185,129,.10)' : ticket.status === 'CLOSED' ? 'rgba(120,120,120,.12)' : 'rgba(217,119,6,.10)' }}><Clock3 size={12} /> {statusLabel(ticket.status)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ticket.messages.map(message => <div key={message.id} style={{ background: card, border: `1px solid ${border}`, padding: 12, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6, fontSize: 10, color: accent, fontWeight: 900 }}>{message.id === ticket.messages[0]?.id ? 'پیام شما' : 'پاسخ مدیریت'}<time style={{ color: sub, fontWeight: 500 }}>{new Date(message.createdAt).toLocaleString('fa-IR')}</time></div>
                <p style={{ margin: 0, color: text, fontSize: 12, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{message.content}</p>
              </div>)}
            </div>
          </article>)}
        </div>}
    </div>
  </section>;
};
