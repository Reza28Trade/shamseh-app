import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, RefreshCw, X, Clock3, CheckCircle2, CircleDot, MessagesSquare, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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
  student: { id: string; fullName: string; nationalId: string };
}

export const ManageManagementContact: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [sendingTicketId, setSendingTicketId] = useState<string | null>(null);\n  const [statusFilter, setStatusFilter] = useState<'ALL' | SupportTicket['status']>('ALL');\n  const [searchTerm, setSearchTerm] = useState('');\n  const [currentPage, setCurrentPage] = useState(1);

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/management-contact/tickets', { credentials: 'include' });
      if (!response.ok) throw new Error('دریافت انتقادات و پیشنهادات انجام نشد.');
      setTickets(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت انتقادات و پیشنهادات انجام نشد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTickets(); }, []);

  const counts = useMemo(() => ({
    all: tickets.length,
    open: tickets.filter(ticket => ticket.status === 'OPEN').length,
    answered: tickets.filter(ticket => ticket.status === 'ANSWERED').length,
    closed: tickets.filter(ticket => ticket.status === 'CLOSED').length,
  }), [tickets]);

  const filteredTickets = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return tickets.filter(ticket => {
      const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
      const matchesSearch = !query || [
        ticket.subject,
        ticket.student.fullName,
        ticket.student.nationalId,
        ticket.id,
      ].some(value => value.toLocaleLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [tickets, statusFilter, searchTerm]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const visibleTickets = filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleReply = async (ticketId: string) => {
    const content = replyText[ticketId]?.trim();
    if (!content || sendingTicketId) return;
    setSendingTicketId(ticketId);
    setError('');
    try {
      const response = await fetch(`/api/admin/management-contact/tickets/${ticketId}/messages`, {
        method: 'POST', credentials: 'include',
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

  const handleStatus = async (ticketId: string, status: SupportTicket['status']) => {
    setError('');
    try {
      const response = await fetch(`/api/admin/management-contact/tickets/${ticketId}/status`, {
        method: 'PATCH', credentials: 'include',
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
    <div className="admin-legacy-page admin-messages-page">
      {error && <div className="messages-error" role="alert">{error}</div>}

      <section className="messages-stats" aria-label="فیلتر وضعیت تیکت‌ها">
        <button type="button" aria-pressed={statusFilter === 'ALL'} className={`messages-stat messages-stat-all ${statusFilter === 'ALL' ? 'is-active' : ''}`} onClick={() => setStatusFilter('ALL')}><span className="messages-stat-icon"><MessagesSquare size={17} /></span><span className="messages-stat-copy"><small>همه تیکت‌ها</small><strong>{counts.all}</strong></span></button>
        <button type="button" aria-pressed={statusFilter === 'OPEN'} className={`messages-stat messages-stat-open ${statusFilter === 'OPEN' ? 'is-active' : ''}`} onClick={() => setStatusFilter('OPEN')}><span className="messages-stat-icon"><Clock3 size={17} /></span><span className="messages-stat-copy"><small>در انتظار پاسخ</small><strong>{counts.open}</strong></span></button>
        <button type="button" aria-pressed={statusFilter === 'ANSWERED'} className={`messages-stat messages-stat-answered ${statusFilter === 'ANSWERED' ? 'is-active' : ''}`} onClick={() => setStatusFilter('ANSWERED')}><span className="messages-stat-icon"><CheckCircle2 size={17} /></span><span className="messages-stat-copy"><small>پاسخ داده شده</small><strong>{counts.answered}</strong></span></button>
        <button type="button" aria-pressed={statusFilter === 'CLOSED'} className={`messages-stat messages-stat-closed ${statusFilter === 'CLOSED' ? 'is-active' : ''}`} onClick={() => setStatusFilter('CLOSED')}><span className="messages-stat-icon"><CircleDot size={17} /></span><span className="messages-stat-copy"><small>بسته شده</small><strong>{counts.closed}</strong></span></button>
      </section>

      <section className="messages-ticket-section">
        <div className="messages-section-head">
          <div><h3>فهرست تیکت‌ها</h3><p>برای مشاهده جزئیات و پاسخ‌گویی، روی ردیف تیکت بزنید.</p></div>
          <div className="messages-table-tools">
            <span className="messages-total">{filteredTickets.length} مورد</span>
            <button className="messages-refresh" onClick={() => void loadTickets()} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'messages-spin' : ''} /> بروزرسانی
            </button>
          </div>
        </div>
        <div className="messages-table-filters">
          <label className="messages-search">
            <Search size={16} />
            <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="جست‌وجو بر اساس موضوع، نام هنرجو، کد ملی یا کد تیکت..." aria-label="جست‌وجوی تیکت‌ها" />
          </label>
          <span className="messages-filter-summary">{statusFilter === 'ALL' ? 'همه وضعیت‌ها' : statusLabel(statusFilter)} · صفحه {currentPage} از {pageCount}</span>
        </div>
        {loading ? (
          <div className="messages-empty"><span className="messages-loading-mark"><RefreshCw size={19} /></span><strong>در حال دریافت تیکت‌ها...</strong></div>
        ) : tickets.length === 0 ? (
          <div className="messages-empty"><span className="messages-empty-mark"><MessageSquare size={20} /></span><strong>هنوز تیکتی ثبت نشده است</strong><p>درخواست‌های هنرجویان پس از ثبت در این قسمت نمایش داده می‌شوند.</p></div>
        ) : filteredTickets.length === 0 ? (
          <div className="messages-empty"><span className="messages-empty-mark"><Search size={20} /></span><strong>تیکتی با این فیلتر پیدا نشد</strong><p>عبارت جست‌وجو را تغییر بده یا یکی از کارت‌های آماری را انتخاب کن.</p></div>
        ) : (
          <>
          <div className="messages-table-wrap">
            <table className="messages-table">
              <thead><tr><th>موضوع تیکت</th><th>هنرجو</th><th>تعداد پیام</th><th>آخرین بروزرسانی</th><th>وضعیت</th><th>جزئیات</th></tr></thead>
              <tbody>
                {visibleTickets.map(ticket => (
                  <tr key={ticket.id} className={`messages-table-row messages-ticket-${ticket.status.toLowerCase()} ${selectedTicketId === ticket.id ? 'is-selected' : ''}`} onClick={() => setSelectedTicketId(current => current === ticket.id ? null : ticket.id)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTicketId(current => current === ticket.id ? null : ticket.id); } }}>
                    <td><strong className="messages-table-subject">{ticket.subject}</strong><small className="messages-table-id">کد: {ticket.id.slice(0, 8)}</small></td>
                    <td><span className="messages-table-student">{ticket.student.fullName}</span><small className="messages-table-id">{ticket.student.nationalId}</small></td>
                    <td><span className="messages-count-pill">{ticket.messages.length} پیام</span></td>
                    <td><span className="messages-table-date">{new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString('fa-IR')}</span></td>
                    <td onClick={e => e.stopPropagation()}><select className="messages-table-status" aria-label={`وضعیت تیکت ${ticket.subject}`} value={ticket.status} onChange={e => void handleStatus(ticket.id, e.target.value as SupportTicket['status'])}><option value="OPEN">{statusLabel('OPEN')}</option><option value="ANSWERED">{statusLabel('ANSWERED')}</option><option value="CLOSED">{statusLabel('CLOSED')}</option></select></td>
                    <td><button type="button" className="messages-open-ticket" aria-label={`مشاهده تیکت ${ticket.subject}`} onClick={e => { e.stopPropagation(); setSelectedTicketId(current => current === ticket.id ? null : ticket.id); }}>{selectedTicketId === ticket.id ? <X size={15}/> : <MessageSquare size={15}/>}<span>{selectedTicketId === ticket.id ? 'بستن' : 'مشاهده'}</span></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="messages-pagination">
            <span>نمایش {(currentPage - 1) * pageSize + 1} تا {Math.min(currentPage * pageSize, filteredTickets.length)} از {filteredTickets.length} تیکت</span>
            <div>
              <button type="button" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage <= 1}><ChevronRight size={15} /> قبلی</button>
              <span>صفحه {currentPage} از {pageCount}</span>
              <button type="button" onClick={() => setCurrentPage(page => Math.min(pageCount, page + 1))} disabled={currentPage >= pageCount}>بعدی <ChevronLeft size={15} /></button>
            </div>
          </div>
          </>
        )}
      </section>

      {selectedTicketId && (() => {
        const ticket = tickets.find(item => item.id === selectedTicketId);
        if (!ticket) return null;
        return <section className="messages-detail-section">
          <div className="messages-detail-head">
            <div><span className="messages-detail-kicker">پرونده انتخاب‌شده</span><h3>{ticket.subject}</h3><p>{ticket.student.fullName} · کد ملی: {ticket.student.nationalId}</p></div>
            <button type="button" className="messages-detail-close" onClick={() => setSelectedTicketId(null)}><X size={15}/> بستن جزئیات</button>
          </div>
          <div className="messages-thread-head"><span>تاریخچه گفت‌وگو</span><span>{ticket.messages.length} پیام</span></div>
          <div className="messages-thread">
            {ticket.messages.map(message => {
              const fromStudent = message.senderUserId === ticket.studentId;
              return <div key={message.id} className={`messages-bubble ${fromStudent ? 'messages-bubble-student' : 'messages-bubble-support'}`}>
                <div className="messages-bubble-meta"><strong>{fromStudent ? 'هنرجو' : 'پاسخ شمسه'}</strong><time>{new Date(message.createdAt).toLocaleString('fa-IR')}</time></div>
                <p>{message.content}</p>
              </div>;
            })}
          </div>
          <form className="messages-reply-form" onSubmit={e => { e.preventDefault(); void handleReply(ticket.id); }}>
            <label htmlFor={`reply-${ticket.id}`}>پاسخ</label>
            <textarea id={`reply-${ticket.id}`} value={replyText[ticket.id] || ''} onChange={e => setReplyText(current => ({ ...current, [ticket.id]: e.target.value }))} placeholder="پاسخ خود را اینجا بنویسید..." rows={3} />
            <div className="messages-reply-actions">
              <button type="submit" className="messages-send" disabled={sendingTicketId === ticket.id || !replyText[ticket.id]?.trim()}><Send size={14} />{sendingTicketId === ticket.id ? 'در حال ارسال...' : 'ارسال پاسخ'}</button>
              <button type="button" className="messages-cancel" onClick={() => setSelectedTicketId(null)}><X size={14} /> انصراف</button>
            </div>
          </form>
        </section>;
      })()}
    </div>
  );
};
