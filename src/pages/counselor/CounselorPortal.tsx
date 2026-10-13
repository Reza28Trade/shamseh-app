import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { LogOut, MessageCircle, Search, Send, UserRound, ArrowRight, Circle, Mic, Square, Paperclip, Download, Sun, Moon, Clock3, MessagesSquare, Users, Check, CheckCheck } from 'lucide-react';

type Conversation = {
  id: string;
  student: { id: string; fullName: string };
  counselor: { id: string; displayName: string };
  messages: { id: string; content: string; senderUserId: string; createdAt: string; readAt?: string | null; attachmentName?: string | null }[];
  _count: { messages: number };
};
type Message = { id: string; content: string; senderUserId: string; sender: { role: 'STUDENT' | 'COUNSELOR' | 'STAFF' | 'SUPER_ADMIN' }; createdAt: string; readAt: string | null; attachmentName?: string | null; attachmentMimeType?: string | null; attachmentSize?: number | null };

export function CounselorPortal({ onLogout }: { onLogout: () => void }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('shamseh-counselor-theme') !== 'light'; }
    catch { return true; }
  });
  const palette = isDark
    ? { bg: '#101416', card: '#191f21', inner: '#202729', text: '#f1f4f3', sub: '#a2aeae', border: '#303a3c', accent: '#398a90', accentSoft: 'rgba(57,138,144,.18)', accentBorder: 'rgba(112,185,181,.35)', danger: '#d4777d', ownBubble: '#246d72', chatBg: '#141a1c' }
    : { bg: '#f1f6f5', card: '#ffffff', inner: '#e8f0ee', text: '#1c2928', sub: '#637471', border: '#d7e3df', accent: '#347f80', accentSoft: 'rgba(57,138,144,.12)', accentBorder: 'rgba(57,138,144,.28)', danger: '#bd5660', ownBubble: '#347f80', chatBg: '#f7faf9' };
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const [search, setSearch] = useState('');
  const [conversationFilter, setConversationFilter] = useState<'all' | 'pending' | 'unread'>('all');
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [counselorName, setCounselorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(true);
  const selectedRef = useRef(selected);
  const messageHistoryRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  selectedRef.current = selected;
  const active = conversations.find(c => c.id === selected);
  const pendingReplies = currentUserId
    ? conversations.filter(c => c.messages?.[0] && c.messages[0].senderUserId !== currentUserId).length
    : 0;
  const unreadConversations = currentUserId
    ? conversations.filter(c => c.messages?.[0] && c.messages[0].senderUserId !== currentUserId && !c.messages[0].readAt).length
    : 0;
  const totalMessages = conversations.reduce((total, c) => total + (c._count?.messages || 0), 0);
  const filteredConversations = useMemo(() => conversations.filter(c => {
    const last = c.messages?.[0];
    const matchesSearch = c.student.fullName.toLocaleLowerCase('fa').includes(search.trim().toLocaleLowerCase('fa'));
    const pending = !!last && !!currentUserId && last.senderUserId !== currentUserId;
    const unread = pending && !last?.readAt;
    return matchesSearch && (conversationFilter === 'all' || (conversationFilter === 'pending' ? pending : unread));
  }), [conversations, search, conversationFilter, currentUserId]);

  useEffect(() => {
    try { localStorage.setItem('shamseh-counselor-theme', isDark ? 'dark' : 'light'); } catch { /* storage may be unavailable */ }
  }, [isDark]);

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
    void fetch('/api/counseling/profile', { credentials: 'include' }).then(async r => { if (!r.ok) throw new Error('پروفایل مشاور دریافت نشد'); return r.json(); }).then(d => setCounselorName(d.displayName || '')).catch(() => undefined);
    void loadConversations().catch(e => setError(e instanceof Error ? e.message : 'دریافت گفت‌وگوها ناموفق بود.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    shouldAutoScrollRef.current = true;
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

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    const history = messageHistoryRef.current;
    if (history) history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' });
  }, [messages.length, selected]);

  async function toggleVoiceRecording() {
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    if (selectedFile) { setError('ابتدا پیوست فعلی را حذف کنید.'); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('ضبط صدا در این مرورگر پشتیبانی نمی‌شود.'); return;
    }
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size) setSelectedFile(new File([blob], `voice-message-${Date.now()}.webm`, { type: blob.type || 'audio/webm' }));
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());
      recordingStreamRef.current = null;
      setError('دسترسی به میکروفون ممکن نشد. مجوز میکروفون را بررسی کنید.');
    }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    const conversationId = selected;
    if ((!content && !selectedFile) || !conversationId || sending) return;
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

  return (
    <main style={{ minHeight: '100vh', background: palette.bg, color: palette.text, direction: 'rtl', fontFamily: 'Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif', padding: 0 }}>
      <header style={{ height: 76, position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 28px', background: palette.card, borderBottom: `1px solid ${palette.border}`, boxShadow: '0 4px 18px rgba(0,0,0,.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
          <img src="/logo.png" alt="لوگوی شمسه" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 11 }} />
          <div><strong style={{ display: 'block', fontSize: 14, fontWeight: 900 }}>مرکز مشاوره شمسه</strong><span style={{ color: palette.sub, fontSize: 11 }}>پنل مشاوران</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" onClick={() => setIsDark(value => !value)} aria-label={isDark ? 'فعال‌کردن پوسته روشن' : 'فعال‌کردن پوسته تیره'} title={isDark ? 'پوسته روشن' : 'پوسته تیره'} style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, border: `1px solid ${palette.border}`, background: palette.inner, color: '#d6a74d', borderRadius: 11, cursor: 'pointer' }}>{isDark ? <Sun size={17} /> : <Moon size={17} />}</button>
          {counselorName && <span title="حساب کاربری واردشده" style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, maxWidth: 250, padding: '8px 11px', border: `1px solid ${palette.accentBorder}`, borderRadius: 11, background: palette.accentSoft, color: palette.text, fontSize: 11 }}><UserRound size={15} color={palette.accent} /><span style={{ color: palette.sub, whiteSpace: 'nowrap' }}>مشاور:</span><strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 850 }}>{counselorName}</strong></span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: palette.sub, fontSize: 11, whiteSpace: 'nowrap' }}><Circle size={8} fill="#50b68b" color="#50b68b" /> سامانه فعال</span>
          <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${palette.border}`, background: palette.inner, color: palette.text, borderRadius: 11, padding: '10px 13px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}><LogOut size={15} /> خروج</button>
        </div>
      </header>

      <section className="counselor-stats" aria-label="آمار مشاوره" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, maxWidth: 1452, margin: '0 auto', padding: '18px 24px 0', boxSizing: 'border-box' }}>
        {[
          { label: 'گفت‌وگوهای اختصاص‌یافته', value: conversations.length, icon: <Users size={18} />, color: '#4c9e9a' },
          { label: 'منتظر پاسخ مشاور', value: pendingReplies, icon: <Clock3 size={18} />, color: '#d6a34b' },
          { label: 'گفت‌وگوهای خوانده‌نشده', value: unreadConversations, icon: <MessageCircle size={18} />, color: '#d4777d' },
          { label: 'مجموع پیام‌ها', value: totalMessages, icon: <MessagesSquare size={18} />, color: '#6996d7' },
        ].map(stat => <article key={stat.label} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 13, minWidth: 0, padding: '14px 16px', borderRadius: 15, border: `1px solid ${palette.border}`, background: `linear-gradient(120deg,${palette.accentSoft},${palette.card} 78%)`, boxShadow: isDark ? '0 8px 20px rgba(0,0,0,.10)' : '0 8px 20px rgba(32,62,58,.05)' }}>
          <span style={{ width: 42, height: 42, flex: '0 0 42px', display: 'grid', placeItems: 'center', borderRadius: 12, color: stat.color, background: `${stat.color}1c`, border: `1px solid ${stat.color}35` }}>{stat.icon}</span>
          <span style={{ minWidth: 0 }}><small style={{ display: 'block', color: palette.sub, fontSize: 10, lineHeight: 1.8 }}>{stat.label}</small><strong style={{ display: 'block', marginTop: 2, color: stat.color, fontSize: 23, lineHeight: 1.2, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</strong></span>
        </article>)}
      </section>

      <div className="counselor-workspace" style={{ display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', gap: 18, maxWidth: 1500, margin: '0 auto', padding: 24, minHeight: 'calc(100vh - 76px)', boxSizing: 'border-box' }}>
        <aside style={{ minWidth: 0, background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 17, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 600 }}>
          <div style={{ padding: 18, borderBottom: `1px solid ${palette.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}><MessageCircle size={18} color="#70b9b5" /><h2 style={{ fontSize: 15, margin: 0, fontWeight: 900 }}>گفت‌وگوها</h2><span style={{ marginRight: 'auto', padding: '3px 8px', borderRadius: 7, background: palette.accentSoft, color: '#70b9b5', fontSize: 10, fontWeight: 800 }}>{conversations.length}</span></div>
            <p style={{ color: palette.sub, fontSize: 11, lineHeight: 1.8, margin: '7px 0 14px' }}>پیام‌های هنرجویان اختصاص‌یافته به شما</p>
            <div style={{ position: 'relative' }}><Search size={15} color={palette.sub} style={{ position: 'absolute', right: 11, top: 12 }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی نام هنرجو" aria-label="جست‌وجوی هنرجو" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 34px 11px 10px', border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.inner, color: palette.text, outline: 'none', font: 'inherit', fontSize: 11 }} /></div>
            <div role="group" aria-label="فیلتر گفت‌وگوها" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 5, marginTop: 10, padding: 4, borderRadius: 10, background: palette.inner, border: `1px solid ${palette.border}` }}>
              {([{ id: 'all', label: 'همه', count: conversations.length }, { id: 'pending', label: 'منتظر پاسخ', count: pendingReplies }, { id: 'unread', label: 'خوانده‌نشده', count: unreadConversations }] as const).map(item => <button key={item.id} type="button" onClick={() => setConversationFilter(item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '7px 3px', borderRadius: 7, border: `1px solid ${conversationFilter === item.id ? palette.accentBorder : 'transparent'}`, background: conversationFilter === item.id ? palette.accentSoft : 'transparent', color: conversationFilter === item.id ? (isDark ? '#a5ded8' : palette.accent) : palette.sub, cursor: 'pointer', font: 'inherit', fontSize: 9, fontWeight: 800 }}><span>{item.label}</span><strong style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{item.count}</strong></button>)}
            </div>
          </div>
          <div className="counselor-scroll-area counselor-conversation-list" style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {loading ? <p style={{ color: palette.sub, padding: 12, fontSize: 12 }}>در حال دریافت گفت‌وگوها…</p> : filteredConversations.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: palette.sub, fontSize: 12, lineHeight: 2 }}>{search ? 'هنرجویی با این نام پیدا نشد.' : conversationFilter === 'unread' ? 'گفت‌وگوی خوانده‌نشده‌ای ندارید.' : conversationFilter === 'pending' ? 'گفت‌وگویی منتظر پاسخ نیست.' : 'هنرجویی به شما اختصاص داده نشده است.'}</div> : filteredConversations.map(c => {
              const chosen = c.id === selected;
              const last = c.messages[c.messages.length - 1];
              return <button key={c.id} onClick={() => { setSelected(c.id); setSelectedFile(null); setMobileListOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, textAlign: 'right', padding: 12, marginBottom: 6, borderRadius: 12, border: `1px solid ${chosen ? palette.accentBorder : 'transparent'}`, background: chosen ? palette.accentSoft : 'transparent', color: palette.text, cursor: 'pointer' }}>
                <span style={{ width: 40, height: 40, flex: '0 0 40px', display: 'grid', placeItems: 'center', borderRadius: 13, background: chosen ? palette.accent : palette.inner, color: chosen ? '#fff' : '#70b9b5', fontSize: 15, fontWeight: 900 }}>{c.student.fullName.trim().slice(0,1) || 'ه'}</span>
                <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', fontSize: 12, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.student.fullName}</strong><small style={{ display: 'block', color: palette.sub, fontSize: 10, marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last?.attachmentName || last?.content || (last ? 'پیام بدون متن' : 'گفت‌وگوی جدید')}</small>{currentUserId && last && last.senderUserId !== currentUserId && <small style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, padding: '3px 7px', borderRadius: 6, color: !last.readAt ? '#d4777d' : '#b98221', background: !last.readAt ? 'rgba(212,119,125,.13)' : 'rgba(214,163,75,.13)', fontSize: 9, fontWeight: 850 }}>{!last.readAt ? <><Circle size={7} fill="currentColor" /> خوانده‌نشده</> : <><Clock3 size={11} /> منتظر پاسخ شما</>}</small>}{last && <small style={{ display: 'block', marginTop: 5, color: palette.sub, fontSize: 9 }}>{new Date(last.createdAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}</small>}</span>
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
            <div ref={messageHistoryRef} onScroll={e => { const element = e.currentTarget; shouldAutoScrollRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100; }} className="counselor-scroll-area counselor-message-history" aria-live="polite" style={{ flex: 1, minHeight: 360, maxHeight: 'calc(100vh - 270px)', overflowY: 'auto', padding: 20, background: isDark ? 'radial-gradient(ellipse at top, rgba(57,138,144,.10), transparent 58%), #141a1c' : 'radial-gradient(ellipse at top, rgba(57,138,144,.10), transparent 58%), #f7faf9' }}>
              {messages.length === 0 ? <div style={{ textAlign: 'center', padding: '70px 20px', color: palette.sub }}><MessageCircle size={32} style={{ marginBottom: 12, opacity: .6 }} /><p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>هنوز پیامی ردوبدل نشده است</p><p style={{ fontSize: 11, lineHeight: 1.8 }}>می‌توانید گفت‌وگو را با ارسال اولین پیام آغاز کنید.</p></div> : messages.map(m => {
                const own = m.sender.role === 'COUNSELOR';
                return <div key={m.id} style={{ display: 'flex', direction: 'ltr', justifyContent: own ? 'flex-end' : 'flex-start', marginBottom: 13 }}>
                  <div style={{ direction: 'rtl', maxWidth: 'min(78%, 650px)', padding: '11px 14px', borderRadius: own ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: own ? palette.ownBubble : palette.inner, border: `1px solid ${own ? 'rgba(112,185,181,.25)' : palette.border}`, color: own ? '#ffffff' : palette.text, overflowWrap: 'anywhere' }}>
                    {m.content && <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.9 }}>{m.content}</div>}
                    {m.attachmentName && !m.content.trim() && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2, color: palette.sub, fontSize: 10 }}><Paperclip size={12} /> پیام فقط شامل فایل پیوست است</div>}
                    {m.attachmentName && (m.attachmentMimeType?.startsWith('audio/') || /\.(mp3|wav|webm)$/i.test(m.attachmentName || '')) ? <audio controls preload="metadata" style={{ display: 'block', width: 'min(280px, 100%)', marginTop: 9 }} src={`/api/counseling/conversations/${selected}/messages/${m.id}/attachment?inline=true`} /> : null}
                    {m.attachmentName && <a href={`/api/counseling/conversations/${selected}/messages/${m.id}/attachment`} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, padding: '10px 11px', borderRadius: 10, background: palette.accentSoft, border: `1px solid ${palette.accentBorder}`, color: isDark ? '#b5e7df' : '#286d70', textDecoration: 'none', fontSize: 11 }}><Paperclip size={15} /><span style={{ flex: 1, overflowWrap: 'anywhere' }}>{m.attachmentName}<small style={{ display: 'block', marginTop: 4, opacity: .7 }}>{m.attachmentSize ? (m.attachmentSize / 1024 / 1024).toFixed(2) + ' MB' : 'پیوست'}</small></span><Download size={14} /></a>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6, marginTop: 6, color: own ? 'rgba(255,255,255,.75)' : palette.sub, fontSize: 9 }}><time>{new Date(m.createdAt).toLocaleString('fa-IR')}</time>{own && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: m.readAt ? '#a8e6cf' : 'inherit' }}>{m.readAt ? <CheckCheck size={12} /> : <Check size={12} />}{m.readAt ? 'دیده شد' : 'ارسال شد'}</span>}</div>
                  </div>
                </div>;
              })}
            </div>
            {error && <div role="alert" style={{ padding: '9px 16px', color: '#ff9b9b', background: 'rgba(190,75,85,.08)', fontSize: 11 }}>{error}</div>}
            {isRecording && <div style={{ padding: '7px 14px', color: '#d85b65', fontSize: 11 }}>در حال ضبط پیام صوتی… برای پایان ضبط، دکمه مربع را بزنید.</div>}
            {selectedFile && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: `1px solid ${palette.border}`, background: palette.inner, color: palette.sub, fontSize: 10 }}><Paperclip size={14} /><span style={{ flex: 1, overflowWrap: 'anywhere' }}>{selectedFile.name}</span><button type="button" onClick={() => setSelectedFile(null)} style={{ border: 0, background: 'transparent', color: palette.danger, cursor: 'pointer' }}>حذف پیوست</button></div>}
            <form onSubmit={sendMessage} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: 14, borderTop: `1px solid ${palette.border}`, background: palette.card }}>
              <button type="button" title={isRecording ? 'پایان ضبط' : 'ضبط پیام صوتی'} disabled={sending || Boolean(selectedFile)} onClick={() => void toggleVoiceRecording()} style={{ display: 'grid', placeItems: 'center', flex: '0 0 42px', height: 44, border: `1px solid ${palette.border}`, borderRadius: 11, background: isRecording ? '#b43d48' : palette.inner, color: isRecording ? '#fff' : '#70b9b5', cursor: sending ? 'wait' : 'pointer' }}>{isRecording ? <Square size={15}/> : <Mic size={17}/>}</button>
              <label title="افزودن فایل (حداکثر ۱۰ مگابایت)" style={{ display: 'grid', placeItems: 'center', flex: '0 0 42px', height: 44, border: `1px solid ${palette.border}`, borderRadius: 11, background: palette.inner, color: '#70b9b5', cursor: sending ? 'wait' : 'pointer' }}><Paperclip size={17} /><input type="file" disabled={sending} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.mp4,.webm" onChange={e => { setSelectedFile(e.target.files?.[0] || null); e.currentTarget.value = ''; }} style={{ display: 'none' }} /></label>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (draft.trim() || selectedFile) void sendMessage(e as unknown as FormEvent); } }} maxLength={5000} rows={2} disabled={sending} placeholder="برای ارسال Enter و برای خط جدید Shift+Enter" aria-label="متن پیام" style={{ flex: 1, minWidth: 0, resize: 'vertical', border: `1px solid ${palette.border}`, borderRadius: 11, padding: 12, background: palette.inner, color: palette.text, font: 'inherit', fontSize: 12, lineHeight: 1.8, outline: 'none' }} />
              <button type="submit" disabled={sending || (!draft.trim() && !selectedFile)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, border: 0, borderRadius: 11, padding: '0 17px', background: palette.accent, color: '#fff', fontWeight: 850, fontSize: 11, cursor: sending || (!draft.trim() && !selectedFile) ? 'wait' : 'pointer', opacity: sending || (!draft.trim() && !selectedFile) ? .6 : 1 }}><Send size={15} />{sending ? 'در حال ارسال…' : 'ارسال'}</button>
            </form>
          </> : <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 30, color: palette.sub, textAlign: 'center' }}><div><MessageCircle size={36} style={{ marginBottom: 12, opacity: .6 }} /><h2 style={{ fontSize: 15, color: palette.text }}>یک گفت‌وگو انتخاب کنید</h2><p style={{ fontSize: 11, lineHeight: 1.9 }}>از فهرست کنار صفحه، هنرجوی موردنظر را انتخاب کنید.</p></div></div>}
        </section>
      </div>
      <style>{`
        .counselor-scroll-area{scrollbar-width:thin;scrollbar-color:${palette.accent} ${palette.inner};scrollbar-gutter:stable}
        .counselor-scroll-area::-webkit-scrollbar{width:7px;height:7px}
        .counselor-scroll-area::-webkit-scrollbar-track{background:${palette.inner};border-radius:999px}
        .counselor-scroll-area::-webkit-scrollbar-thumb{background:${palette.accent};border:2px solid ${palette.inner};border-radius:999px}
        .counselor-scroll-area::-webkit-scrollbar-thumb:hover{background:${isDark ? '#70b9b5' : '#286d70'}}
        @media(max-width:760px){
          .counselor-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:12px 12px 0!important;gap:8px!important}
          .counselor-stats article{padding:10px!important;gap:8px!important}
          .counselor-stats article:last-child{grid-column:1/-1}
          .counselor-stats article>span:first-child{width:34px!important;height:34px!important;flex-basis:34px!important}
          .counselor-stats article strong{font-size:18px!important}
          .counselor-stats article small{font-size:9px!important}
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
