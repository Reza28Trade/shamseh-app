import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, RefreshCw, X } from 'lucide-react';

interface SupportMessage {
  id: string;
  content: string;
  createdAt: string;
  senderUserId: string;
}

interface SupportTicket {
  id: string;
  studentId: string;
  subject: string;
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  student: {
    id: string;
    fullName: string;
    nationalId: string;
  };
}

export const ManageMessages: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [sendingTicketId, setSendingTicketId] = useState<string | null>(null);

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/support/tickets', { credentials: 'include' });
      if (!response.ok) throw new Error('دریافت تیکت‌های پشتیبانی انجام نشد.');
      setTickets(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت تیکت‌های پشتیبانی انجام نشد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const handleReply = async (ticketId: string) => {
    const content = replyText[ticketId]?.trim();
    if (!content || sendingTicketId) return;

    setSendingTicketId(ticketId);
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'ارسال پاسخ انجام نشد.');
      }

      setReplyText(current => ({ ...current, [ticketId]: '' }));
      setSelectedTicketId(null);
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال پاسخ انجام نشد.');
    } finally {
      setSendingTicketId(null);
    }
  };

  const handleStatus = async (ticketId: string, status: 'OPEN' | 'ANSWERED' | 'CLOSED') => {
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('تغییر وضعیت تیکت انجام نشد.');
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت تیکت انجام نشد.');
    }
  };

  const statusLabel = (status: SupportTicket['status']) =>
    status === 'ANSWERED' ? 'پاسخ داده شده' : status === 'CLOSED' ? 'بسته شده' : 'در انتظار پاسخ';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(109, 0, 26, 0.2) 0%, rgba(10, 10, 10, 0.8) 100%)', border: '1px solid rgba(109, 0, 26, 0.4)', padding: '24px 32px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={20} color="#ff3366" /> صندوق پیام‌ها و تیکت‌های دانشجویان
          </h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>مشاهده، پاسخ و مدیریت مستقیم تیکت‌های ثبت‌شده در سامانه</p>
        </div>
        <button onClick={() => void loadTickets()} disabled={loading} style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 14px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 700 }}>
          <RefreshCw size={14} /> بروزرسانی
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '12px 16px', borderRadius: '12px', fontSize: '12px' }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: 'rgba(14,14,17,0.75)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 32px', borderRadius: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '50px 0', fontSize: '12px' }}>در حال دریافت تیکت‌ها...</div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '50px 0', fontSize: '12px' }}>هیچ تیکتی از طرف هنرجویان ثبت نشده است.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tickets.map(ticket => (
              <div key={ticket.id} style={{ backgroundColor: 'rgba(20,20,25,0.9)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 900 }}>{ticket.subject}</div>
                    <div style={{ color: '#38bdf8', fontSize: '11px', marginTop: '5px' }}>{ticket.student.fullName} — کد ملی: {ticket.student.nationalId}</div>
                  </div>
                  <select value={ticket.status} onChange={e => void handleStatus(ticket.id, e.target.value as SupportTicket['status'])} style={{ backgroundColor: '#0e0e11', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '7px 10px', borderRadius: '8px', fontSize: '10px' }}>
                    <option value="OPEN">{statusLabel('OPEN')}</option>
                    <option value="ANSWERED">{statusLabel('ANSWERED')}</option>
                    <option value="CLOSED">{statusLabel('CLOSED')}</option>
                  </select>
                </div>

                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ticket.messages.map(message => (
                    <div key={message.id} style={{ backgroundColor: message.senderUserId === ticket.studentId ? 'rgba(109,0,26,0.12)' : 'rgba(52,211,153,0.06)', border: '1px solid rgba(255,255,255,0.06)', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ color: message.senderUserId === ticket.studentId ? '#ff6688' : '#34d399', fontSize: '10px', fontWeight: 800, marginBottom: '5px' }}>
                        {message.senderUserId === ticket.studentId ? 'هنرجو' : 'پشتیبانی'}
                      </div>
                      <p style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: 1.7, margin: 0 }}>{message.content}</p>
                      <span style={{ color: '#64748b', fontSize: '9px' }}>{new Date(message.createdAt).toLocaleString('fa-IR')}</span>
                    </div>
                  ))}
                </div>

                {selectedTicketId === ticket.id ? (
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea value={replyText[ticket.id] || ''} onChange={e => setReplyText(current => ({ ...current, [ticket.id]: e.target.value }))} placeholder="متن پاسخ پشتیبانی را بنویسید..." rows={3} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#0e0e11', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', fontSize: '12px', resize: 'vertical', outline: 'none' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => void handleReply(ticket.id)} disabled={sendingTicketId === ticket.id} style={{ backgroundColor: '#6D001A', color: '#fff', border: 'none', padding: '9px 15px', borderRadius: '9px', cursor: 'pointer', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Send size={13} /> {sendingTicketId === ticket.id ? 'در حال ارسال...' : 'ارسال پاسخ'}
                      </button>
                      <button onClick={() => setSelectedTicketId(null)} style={{ backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 15px', borderRadius: '9px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <X size={13} /> انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setSelectedTicketId(ticket.id)} style={{ marginTop: '14px', backgroundColor: '#6D001A', color: '#fff', border: 'none', padding: '9px 15px', borderRadius: '9px', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}>
                    پاسخ به تیکت
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
