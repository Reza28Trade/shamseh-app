import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, MessageSquareText, Send } from 'lucide-react';

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

  const card = isDark ? '#222526' : '#ffffff';
  const inner = isDark ? '#282c2d' : '#f8faf9';
  const text = isDark ? '#f1f5f4' : '#172022';
  const sub = isDark ? '#aab5b4' : '#697675';
  const border = isDark ? '#343a3b' : '#e2e8e7';
  const accent = isDark ? '#70b9b5' : '#3f8f8a';

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
    <header style={{ background: isDark ? 'linear-gradient(135deg,#253536,#202829)' : 'linear-gradient(135deg,#fff,#edf7f5)', border: `1px solid ${border}`, borderRadius: 18, padding: '22px 24px', boxShadow: '0 12px 28px rgba(35,90,90,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: accent, fontSize: 11, fontWeight: 900, marginBottom: 8 }}><MessageSquareText size={17} /> ارتباط مستقل با مدیریت مؤسسه</div>
      <h2 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 900 }}>انتقادات و پیشنهادات - ارتباط مستقیم با مدیریت</h2>
      <p style={{ margin: 0, color: sub, fontSize: 12, lineHeight: 1.9 }}>برای طرح پیشنهاد، انتقاد یا درخواست خود یک تیکت ثبت کنید. پاسخ مدیریت و تاریخچه هر درخواست در همین بخش نمایش داده می‌شود.</p>
    </header>

    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 18, padding: 22, boxShadow: '0 12px 30px rgba(0,0,0,.06)' }}>
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
        <button type="submit" disabled={submitting || !subject.trim() || !content.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, border: 0, borderRadius: 11, color: '#fff', background: 'linear-gradient(135deg,#398a90,#286f75)', fontSize: 12, fontWeight: 900, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? .7 : 1 }}>
          <Send size={15} /> {submitting ? 'در حال ثبت...' : 'ثبت و ارسال برای مدیریت'}
        </button>
      </form>
    </div>

    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 18, padding: 22, boxShadow: '0 12px 30px rgba(0,0,0,.06)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 900 }}>تاریخچه درخواست‌ها</h3>
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
