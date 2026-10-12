import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { LogOut, MessageCircle, Search, Send, UserRound, ArrowRight, Circle, Paperclip, Download } from 'lucide-react';

type Conversation = {
  id: string;
  student: { id: string; fullName: string };
  counselor: { id: string; displayName: string };
  messages: { id: string; content: string; senderUserId: string; createdAt: string; attachmentName?: string | null }[];
  _count: { messages: number };
};
type Message = { id: string; content: string; senderUserId: string; createdAt: string; readAt: string | null; attachmentName?: string | null; attachmentMimeType?: string | null; attachmentSize?: number | null };

const palette = {
  bg: '#101416', card: '#191f21', inner: '#202729', text: '#f1f4f3',
  sub: '#a2aeae', border: '#303a3c', accent: '#398a90', accentSoft: 'rgba(57,138,144,.18)',
  accentBorder: 'rgba(112,185,181,.35)', danger: '#d4777d',
};

export function CounselorPortal({ onLogout }: { onLogout: () => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(true);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const active = conversations.find(c => c.id === selected);
  const filteredConversations = useMemo(() => conversations.filter(c => c.student.fullName.toLocaleLowerCase('fa').includes(search.trim().toLocaleLowerCase('fa'))), [conversations, search]);

  async function loadConversations() {
    const r = await fetch('/api/counseling/conversations', { credentials: 'include' });
    if (!r.ok) throw new Error('دریافت گفت‌وگوها ناموفق بود.');
    const data: Conversation[] = await r.json();
    setConversations(data);
    setSelected(current => current && data.some(c => c.id === current) ? current : data[0]?.id || '');
  }
  async function loadMessages(id: string) {
    const r = await fetch(`/api/counseling/conversations/${id}/messages`, { credentials: 'include' });
    if (!r.ok) throw new Error('دریافت پیام‌ها ناموفق بود.');
    const data: Message[] = await r.json();
    if (selectedRef.current === id) setMessages(data);
  }

  useEffect(() => {
    void fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()).then(d => setCurrentUserId(d.user?.id || '')).catch(() => undefined);
    void loadConversations().catch(e => setError(e instanceof Error ? e.message : 'دریافت گفت‌وگوها ناموفق بود.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setError('');
    if (selected) {
      void fetch(`/api/counseling/conversations/${selected}/messages`, { credentials: 'include' })
        .then(async r => { if (!r.ok) throw new Error('دریافت پیام‌ها ناموفق بود.'); return r.json(); })
        .then(data => { if (!cancelled) setMessages(data); })
        .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'دریافت پیام‌ها ناموفق بود.'); });
    }
    return () => { cancelled = true; };
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const r = await fetch('/api/counseling/conversations', { credentials: 'include' });
        if (!r.ok || cancelled) return;
        const data: Conversation[] = await r.json();
        if (cancelled) return;
        setConversations(data);
        setSelected(current => current && data.some(c => c.id === current) ? current : data[0]?.id || '');
      } catch { /* retry on the next cycle */ }
    }, 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/counseling/conversations/${selected}/messages`, { credentials: 'include' });
        if (r.ok && !cancelled) setMessages(await r.json());
      } catch { /* retry on the next cycle */ }
    }, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [selected]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    const conversationId = selected;
    if (!content || !conversationId || sending) return;
    setSending(true);
    setError('');
    try {
      let r: Response;
      if (selectedFile) {
        const form = new FormData();
        form.append('file', selectedFile);
        form.append('content', content);
        r = await fetch(`/api/counseling/conversations/${conversationId}/messages/attachments`, {
          method: 'POST', credentials: 'include', body: form,
        });
      } else {
        r = await fetch(`/api/counseling/conversations/${conversationId}/messages`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
        });
      }
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        throw new Error(data?.message || 'ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید.');
      }
      if (selectedRef.current === conversationId) { setDraft(''); setSelectedFile(null); }
      await loadMessages(conversationId);
      await loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ارتباط با سرور.');
    } finally { setSending(false); }
  }

  const initials = (active?.student.fullName || 'ه').trim().slice(0, 1);
  return (
    <main style={{ minHeight: '100vh', background: palette.bg, color: palette.text, direction: 'rtl', fontFamily: 'Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif', padding: 0 }}>
      <header style={{ height: 76, position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 28px', background: palette.card, borderBottom: `1px solid ${palette.border}`, boxShadow: '0 4px 18px rgba(0,0,0,.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
          <img src="/logo.png" alt="لوگوی شمسه" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 11 }} />
          <div><strong style={{ display: 'block', fontSize: 14, fontWeight: 900 }}>مرکز مشاوره شمسه</strong><span style={{ color: palette.sub, fontSize: 11 }}>پنل مشاوران</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: palette.sub, fontSize: 11 }}><Circle size={8} fill={palette.accent} color={palette.accent} /> سامانه فعال</span>
          <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${palette.border}`, background: palette.inner, color: palette.text, borderRadius: 11, padding: '10px 13px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}><LogOut size={15} /> خروج</button>
        </div>
      </header>

      <div className="counselor-workspace" style={{ display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', gap: 18, maxWidth: 1500, margin: '0 auto', padding: 24, minHeight: 'calc(100vh - 76px)', boxSizing: 'border-box' }}>
        <aside style={{ minWidth: 0, background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 17, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 600 }}>
          <div style={{ padding: 18, borderBottom: `1px solid ${palette.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}><MessageCircle size={18} color="#70b9b5" /><h2 style={{ fontSize: 15, margin: 0, fontWeight: 900 }}>گفت‌وگوها</h2><span style={{ marginRight: 'auto', padding: '3px 8px', borderRadius: 7, background: palette.accentSoft, color: '#70b9b5', fontSize: 10, fontWeight: 800 }}>{conversations.length}</span></div>
            <p style={{ color: palette.sub, fontSize: 11, lineHeight: 1.8, margin: '7px 0 14px' }}>پیام‌های هنرجویان اختصاص‌یافته به شما</p>
            <div style={{ position: 'relative' }}><Search size={15} color={palette.sub} style={{ position: 'absolute', right: 11, top: 12 }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی نام هنرجو" aria-label="جست‌وجوی هنرجو" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 34px 11px 10px', border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.inner, color: palette.text, outline: 'none', font: 'inherit', fontSize: 11 }} /></div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {loading ? <p style={{ color: palette.sub, padding: 12, fontSize: 12 }}>در حال دریافت گفت‌وگوها…</p> : filteredConversations.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: palette.sub, fontSize: 12, lineHeight: 2 }}>{search ? 'هنرجویی با این نام پیدا نشد.' : 'هنرجویی به شما اختصاص داده نشده است.'}</div> : filteredConversations.map(c => {
              const chosen = c.id === selected;
              const last = c.messages[c.messages.length - 1];
              return <button key={c.id} onClick={() => { setSelected(c.id); setSelectedFile(null); setMobileListOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, textAlign: 'right', padding: 12, marginBottom: 6, borderRadius: 12, border: `1px solid ${chosen ? palette.accentBorder : 'transparent'}`, background: chosen ? palette.accentSoft : 'transparent', color: palette.text, cursor: 'pointer' }}>
                <span style={{ width: 40, height: 40, flex: '0 0 40px', display: 'grid', placeItems: 'center', borderRadius: 13, background: chosen ? palette.accent : palette.inner, color: chosen ? '#fff' : '#70b9b5', fontSize: 15, fontWeight: 900 }}>{c.student.fullName.trim().slice(0,1) || 'ه'}</span>
                <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', fontSize: 12, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.student.fullName}</strong><small style={{ display: 'block', color: palette.sub, fontSize: 10, marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last?.attachmentName || last?.content || 'گفت‌وگوی جدید'}</small></span>
                <span style={{ alignSelf: 'flex-start', whiteSpace: 'nowrap', fontSize: 9, color: palette.sub }}>{c._count.messages} پیام</span>
              </button>;
            })}
          </div>
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${palette.border}`, color: palette.sub, fontSize: 10 }}>پیام‌ها به‌صورت خودکار به‌روزرسانی می‌شوند.</div>
        </aside>

        <section className="counselor-chat-pane" style={{ minWidth: 0, background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 17, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 600 }}>
          {active ? <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 20px', borderBottom: `1px solid ${palette.border}`, background: palette.card }}>
              <button className="counselor-mobile-back" onClick={() => setMobileListOpen(true)} aria-label="بازگشت به فهرست" style={{ display: 'none', border: `1px solid ${palette.border}`, background: palette.inner, color: palette.text, borderRadius: 9, padding: 8 }}><ArrowRight size={16} /></button>
              <span style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 13, background: palette.accentSoft, color: '#70b9b5' }}><UserRound size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>{active.student.fullName}</strong><span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, color: palette.sub, fontSize: 10 }}><Circle size={6} fill={palette.accent} color={palette.accent} /> گفت‌وگوی اختصاصی هنرجو</span></div>
              <span style={{ color: palette.sub, fontSize: 10, whiteSpace: 'nowrap' }}>{messages.length} پیام</span>
            </div>
            <div aria-live="polite" style={{ flex: 1, minHeight: 360, maxHeight: 'calc(100vh - 270px)', overflowY: 'auto', padding: 20, background: 'radial-gradient(ellipse at top, rgba(57,138,144,.07), transparent 58%), #141a1c' }}>
              {messages.length === 0 ? <div style={{ textAlign: 'center', padding: '70px 20px', color: palette.sub }}><MessageCircle size={32} style={{ marginBottom: 12, opacity: .6 }} /><p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>هنوز پیامی ردوبدل نشده است</p><p style={{ fontSize: 11, lineHeight: 1.8 }}>می‌توانید گفت‌وگو را با ارسال اولین پیام آغاز کنید.</p></div> : messages.map(m => {
                const own = m.senderUserId === currentUserId;
                return <div key={m.id} style={{ display: 'flex', justifyContent: own ? 'flex-start' : 'flex-end', marginBottom: 13 }}>
                  <div style={{ maxWidth: 'min(78%, 650px)', padding: '11px 14px', borderRadius: own ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: own ? '#246d72' : palette.inner, border: `1px solid ${own ? 'rgba(112,185,181,.25)' : palette.border}`, color: palette.text, overflowWrap: 'anywhere' }}>
                    {m.content && <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.9 }}>{m.content}</div>}
                    {m.attachmentName && <a href={`/api/counseling/conversations/${selected}/messages/${m.id}/attachment`} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, padding: '10px 11px', borderRadius: 10, background: 'rgba(112,185,181,.10)', border: `1px solid ${palette.accentBorder}`, color: '#a5ded8', textDecoration: 'none', fontSize: 11 }}><Paperclip size={15} /><span style={{ flex: 1, overflowWrap: 'anywhere' }}>{m.attachmentName}<small style={{ display: 'block', marginTop: 4, opacity: .7 }}>{m.attachmentSize ? (m.attachmentSize / 1024 / 1024).toFixed(2) + ' MB' : 'پیوست'}</small></span><Download size={14} /></a>}
                    <time style={{ display: 'block', textAlign: 'left', marginTop: 6, color: palette.sub, fontSize: 9 }}>{new Date(m.createdAt).toLocaleString('fa-IR')}</time>
                  </div>
                </div>;
              })}
            </div>
            {error && <div role="alert" style={{ padding: '9px 16px', color: '#ff9b9b', background: 'rgba(190,75,85,.08)', fontSize: 11 }}>{error}</div>}
            {selectedFile && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: `1px solid ${palette.border}`, background: palette.inner, color: palette.sub, fontSize: 10 }}><Paperclip size={14} /><span style={{ flex: 1, overflowWrap: 'anywhere' }}>{selectedFile.name}</span><button type="button" onClick={() => setSelectedFile(null)} style={{ border: 0, background: 'transparent', color: palette.danger, cursor: 'pointer' }}>حذف پیوست</button></div>}
            <form onSubmit={sendMessage} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: 14, borderTop: `1px solid ${palette.border}`, background: palette.card }}>
              <label title="افزودن فایل (حداکثر ۱۰ مگابایت)" style={{ display: 'grid', placeItems: 'center', flex: '0 0 42px', height: 44, border: `1px solid ${palette.border}`, borderRadius: 11, background: palette.inner, color: '#70b9b5', cursor: sending ? 'wait' : 'pointer' }}><Paperclip size={17} /><input type="file" disabled={sending} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.mp4,.webm" onChange={e => { setSelectedFile(e.target.files?.[0] || null); e.currentTarget.value = ''; }} style={{ display: 'none' }} /></label>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} maxLength={5000} rows={2} disabled={sending} placeholder="پیام خود را بنویسید…" aria-label="متن پیام" style={{ flex: 1, minWidth: 0, resize: 'vertical', border: `1px solid ${palette.border}`, borderRadius: 11, padding: 12, background: palette.inner, color: palette.text, font: 'inherit', fontSize: 12, lineHeight: 1.8, outline: 'none' }} />
              <button type="submit" disabled={sending || (!draft.trim() && !selectedFile)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, border: 0, borderRadius: 11, padding: '0 17px', background: palette.accent, color: '#fff', fontWeight: 850, fontSize: 11, cursor: sending || (!draft.trim() && !selectedFile) ? 'wait' : 'pointer', opacity: sending || (!draft.trim() && !selectedFile) ? .6 : 1 }}><Send size={15} />{sending ? 'در حال ارسال…' : 'ارسال'}</button>
            </form>
          </> : <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 30, color: palette.sub, textAlign: 'center' }}><div><MessageCircle size={36} style={{ marginBottom: 12, opacity: .6 }} /><h2 style={{ fontSize: 15, color: palette.text }}>یک گفت‌وگو انتخاب کنید</h2><p style={{ fontSize: 11, lineHeight: 1.9 }}>از فهرست کنار صفحه، هنرجوی موردنظر را انتخاب کنید.</p></div></div>}
        </section>
      </div>
      <style>{`
        @media(max-width:760px){
          .counselor-workspace{display:block!important;padding:12px!important;min-height:calc(100vh - 66px)!important}
          .counselor-workspace aside,.counselor-chat-pane{min-height:calc(100vh - 92px)!important}
          .counselor-workspace aside{display:${mobileListOpen ? 'flex' : 'none'}!important}
          .counselor-chat-pane{display:${mobileListOpen ? 'none' : 'flex'}!important}
          .counselor-mobile-back{display:inline-flex!important;align-items:center;justify-content:center}
          header{height:66px!important;padding:0 12px!important}
        }
      `}</style>
    </main>
  );
}
