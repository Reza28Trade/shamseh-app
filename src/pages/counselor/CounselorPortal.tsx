import { useEffect, useState, type FormEvent } from 'react';
type Conversation = { id: string; student: { id: string; fullName: string }; counselor: { id: string; displayName: string }; messages: { id: string; content: string; senderUserId: string; createdAt: string }[]; _count: { messages: number } };
type Message = { id: string; content: string; senderUserId: string; createdAt: string; readAt: string | null };
export function CounselorPortal({ onLogout }: { onLogout: () => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  async function loadConversations() {
    const r = await fetch('/api/counseling/conversations', { credentials: 'include' });
    if (!r.ok) throw new Error('دریافت گفت‌وگوها ناموفق بود.');
    const data = await r.json(); setConversations(data); setSelected(v => v || data[0]?.id || '');
  }
  async function loadMessages(id: string) {
    const r = await fetch(`/api/counseling/conversations/${id}/messages`, { credentials: 'include' });
    if (!r.ok) throw new Error('دریافت پیام‌ها ناموفق بود.');
    setMessages(await r.json());
  }
  useEffect(() => { void fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()).then(d => setCurrentUserId(d.user?.id || '')).catch(() => undefined); }, []);
  useEffect(() => { void loadConversations().catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setError('');
    if (selected) {
      void (async () => {
        try {
          const r = await fetch(`/api/counseling/conversations/${selected}/messages`, { credentials: 'include' });
          if (!r.ok) throw new Error('دریافت پیام‌ها ناموفق بود.');
          const data = await r.json();
          if (!cancelled) setMessages(data);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : 'دریافت پیام‌ها ناموفق بود.');
        }
      })();
    }
    return () => { cancelled = true; };
  }, [selected]);
  useEffect(() => {
    let cancelled = false;
    async function refreshConversations() {
      try {
        const r = await fetch('/api/counseling/conversations', { credentials: 'include' });
        if (!r.ok) return;
        const data: Conversation[] = await r.json();
        if (cancelled) return;
        setConversations(data);
        setSelected(current => current && data.some(c => c.id === current) ? current : data[0]?.id || '');
      } catch {
        // Keep the last successfully loaded conversation list during temporary network errors.
      }
    }
    const timer = window.setInterval(() => void refreshConversations(), 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    async function refreshMessages() {
      try {
        const r = await fetch(`/api/counseling/conversations/${selected}/messages`, { credentials: 'include' });
        if (r.ok && !cancelled) setMessages(await r.json());
      } catch {
        // A later polling cycle will retry without interrupting the chat.
      }
    }
    const timer = window.setInterval(() => void refreshMessages(), 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [selected]);
  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !selected || sending) return;
    setSending(true);
    setError('');
    try {
      const r = await fetch(`/api/counseling/conversations/${selected}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!r.ok) throw new Error('ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید.');
      setDraft('');
      await loadMessages(selected);
      await loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ارتباط با سرور.');
    } finally {
      setSending(false);
    }
  }
  const active = conversations.find(c => c.id === selected);
  return <main style={{ minHeight: '100vh', background: '#f4f5f7', color: '#20232a', direction: 'rtl', fontFamily: 'system-ui,sans-serif', padding: 24, boxSizing: 'border-box' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1180, margin: '0 auto 20px' }}><div><h1 style={{ margin: 0, fontSize: 24 }}>پنل مشاور</h1><p style={{ margin: '6px 0', color: '#69707d' }}>گفت‌وگو با هنرجویان اختصاص‌یافته</p></div><button onClick={onLogout} style={{ border: '1px solid #d5d8df', background: '#fff', borderRadius: 10, padding: '10px 16px', cursor: 'pointer' }}>خروج</button></header>
    <section style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', minHeight: 560, background: '#fff', border: '1px solid #e1e4e9', borderRadius: 16, overflow: 'hidden' }}>
      <aside style={{ borderLeft: '1px solid #e7e9ee', padding: 16 }}><h2 style={{ fontSize: 16, margin: '4px 0 14px' }}>گفت‌وگوها</h2>{loading ? <p>در حال بارگذاری…</p> : conversations.length === 0 ? <p style={{ color: '#747b87', fontSize: 14 }}>هنرجوی فعالی به شما اختصاص داده نشده است.</p> : conversations.map(c => <button key={c.id} onClick={() => setSelected(c.id)} style={{ width: '100%', textAlign: 'right', padding: 12, marginBottom: 8, borderRadius: 10, border: c.id === selected ? '1px solid #8aa8d8' : '1px solid #e5e7eb', background: c.id === selected ? '#edf4ff' : '#fff', cursor: 'pointer' }}><strong style={{ display: 'block' }}>{c.student.fullName}</strong><small style={{ color: '#737b88' }}>{c._count.messages} پیام</small></button>)}</aside>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, padding: 16 }}><h2 style={{ margin: '4px 0 14px', fontSize: 16 }}>{active?.student.fullName || 'یک گفت‌وگو انتخاب کنید'}</h2><div style={{ flex: 1, minHeight: 360, overflowY: 'auto', background: '#f8f9fb', borderRadius: 12, padding: 14 }}>{messages.map(m => <div key={m.id} style={{ display: 'flex', justifyContent: m.senderUserId === currentUserId ? 'flex-start' : 'flex-end', marginBottom: 10 }}><div style={{ maxWidth: '78%', background: '#fff', border: '1px solid #e4e7ec', borderRadius: 12, padding: '10px 12px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.content}<small style={{ display: 'block', color: '#858b95', marginTop: 6, fontSize: 11 }}>{new Date(m.createdAt).toLocaleString('fa-IR')}</small></div></div>)}</div>{error && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{error}</p>}<form onSubmit={sendMessage} style={{ display: 'flex', gap: 10, marginTop: 12 }}><input value={draft} onChange={e => setDraft(e.target.value)} maxLength={5000} placeholder="پیام خود را بنویسید…" disabled={!selected} style={{ flex: 1, minWidth: 0, padding: 12, border: '1px solid #d7dbe2', borderRadius: 10 }} /><button disabled={!selected || !draft.trim() || sending} style={{ border: 0, background: '#243b63', color: '#fff', borderRadius: 10, padding: '0 20px', cursor: 'pointer' }} >{sending ? 'در حال ارسال…' : 'ارسال'}</button></form></div>
    </section>
  </main>;
}