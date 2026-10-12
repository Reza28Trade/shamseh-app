import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send, UserRound, Circle, Paperclip, FileText, Download, Check, CheckCheck } from 'lucide-react';

type Conversation = {
  id: string;
  studentId: string;
  counselor: { id: string; displayName: string };
  messages: { id: string; content: string; senderUserId: string; createdAt: string; readAt: string | null; attachmentName?: string | null }[];
  _count: { messages: number };
};
type Message = { id: string; content: string; senderUserId: string; sender: { role: 'STUDENT' | 'COUNSELOR' | 'STAFF' | 'SUPER_ADMIN' }; createdAt: string; readAt: string | null; attachmentName?: string | null; attachmentMimeType?: string | null; attachmentSize?: number | null };

export function StudentCounselingChat({ isDark }: { isDark: boolean }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const loadRequestId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const colors = isDark
    ? { bg: '#101416', card: '#191f21', inner: '#202729', text: '#f1f4f3', sub: '#a2aeae', border: '#303a3c', accent: '#70b9b5', accentSolid: '#398a90', soft: 'rgba(57,138,144,.18)' }
    : { bg: '#f0f5f4', card: '#ffffff', inner: '#e7efed', text: '#202a2a', sub: '#667675', border: '#d8e3e0', accent: '#398a90', accentSolid: '#398a90', soft: '#e0f0ee' };

  async function loadConversation() {
    const requestId = ++loadRequestId.current;
    const response = await fetch('/api/counseling/conversations', { credentials: 'include' });
    if (!response.ok) throw new Error('دریافت گفت‌وگوی مشاوره انجام نشد.');
    const data: Conversation[] = await response.json();
    if (requestId !== loadRequestId.current) return;
    const active = data[0] ?? null;
    setConversation(active);
    if (active) {
      const messagesResponse = await fetch(`/api/counseling/conversations/${active.id}/messages`, { credentials: 'include' });
      if (!messagesResponse.ok) throw new Error('دریافت پیام‌ها انجام نشد.');
      const nextMessages: Message[] = await messagesResponse.json();
      if (requestId === loadRequestId.current) setMessages(nextMessages);
    } else if (requestId === loadRequestId.current) setMessages([]);
  }

  useEffect(() => {
    let cancelled = false;
    const initialRequestId = ++loadRequestId.current;
    void fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()).then(d => setCurrentUserId(d.user?.id || '')).catch(() => undefined);
    void (async () => {
      setLoading(true); setError('');
      try {
        const conversationsResponse = await fetch('/api/counseling/conversations', { credentials: 'include' });
        if (!conversationsResponse.ok) throw new Error('دریافت اطلاعات مشاوره انجام نشد.');
        const conversations: Conversation[] = await conversationsResponse.json();
        const active = conversations[0] ?? null;
        if (cancelled || initialRequestId !== loadRequestId.current) return;
        setConversation(active);
        if (active) {
          const response = await fetch(`/api/counseling/conversations/${active.id}/messages`, { credentials: 'include' });
          if (!response.ok) throw new Error('دریافت پیام‌ها انجام نشد.');
          const data = await response.json();
          if (!cancelled && initialRequestId === loadRequestId.current) setMessages(data);
        } else setMessages([]);
      } catch (e) {
        if (!cancelled && initialRequestId === loadRequestId.current) setError(e instanceof Error ? e.message : 'دریافت اطلاعات مشاوره انجام نشد.');
      } finally { if (!cancelled && initialRequestId === loadRequestId.current) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let latestRefresh = 0;
    async function refreshChat() {
      const refreshId = ++latestRefresh;
      try {
        const response = await fetch('/api/counseling/conversations', { credentials: 'include' });
        if (!response.ok) return;
        const data: Conversation[] = await response.json();
        if (cancelled || refreshId !== latestRefresh) return;
        const active = data[0] ?? null;
        if (active?.id !== conversation?.id) {
          loadRequestId.current += 1; setMessages([]); setConversation(active);
          if (active) {
            const nextMessages = await fetch(`/api/counseling/conversations/${active.id}/messages`, { credentials: 'include' });
            if (nextMessages.ok && !cancelled && refreshId === latestRefresh) setMessages(await nextMessages.json());
          }
          return;
        }
        if (active) {
          const messagesResponse = await fetch(`/api/counseling/conversations/${active.id}/messages`, { credentials: 'include' });
          if (messagesResponse.ok && !cancelled && refreshId === latestRefresh) setMessages(await messagesResponse.json());
        }
      } catch { /* retry on the next cycle */ }
    }
    const timer = window.setInterval(() => void refreshChat(), 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [conversation?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if ((!content && !selectedFile) || !conversation || sending) return;
    setSending(true); setError('');
    try {
      let response: Response;
      if (selectedFile) {
        const form = new FormData();
        form.append('file', selectedFile);
        form.append('content', content);
        response = await fetch(`/api/counseling/conversations/${conversation.id}/messages/attachments`, {
          method: 'POST', credentials: 'include', body: form,
        });
      } else {
        response = await fetch(`/api/counseling/conversations/${conversation.id}/messages`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
        });
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'ارسال پیام انجام نشد.');
      setDraft(''); setSelectedFile(null); await loadConversation();
    } catch (e) { setError(e instanceof Error ? e.message : 'ارسال پیام انجام نشد.'); }
    finally { setSending(false); }
  }

  return (
    <section style={{ direction: 'rtl', color: colors.text, fontFamily: 'Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 17, overflow: 'hidden', boxShadow: isDark ? '0 16px 38px rgba(0,0,0,.20)' : '0 12px 32px rgba(32,62,58,.07)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '18px 20px', borderBottom: `1px solid ${colors.border}`, background: colors.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 43, height: 43, display: 'grid', placeItems: 'center', borderRadius: 13, background: colors.soft, color: colors.accent }}><MessageCircle size={21} /></span>
          <div><span style={{ display: 'block', color: colors.accent, fontSize: 10, fontWeight: 850, marginBottom: 4 }}>ارتباط مستقیم</span><h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>مشاوره من</h2><p style={{ margin: '5px 0 0', color: colors.sub, fontSize: 11 }}>گفت‌وگوی آنلاین با مشاور اختصاص‌یافته</p></div>
        </div>
        {conversation && <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.inner }}><span style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 10, background: colors.soft, color: colors.accent }}><UserRound size={17} /></span><div><small style={{ display: 'block', color: colors.sub, fontSize: 9 }}>مشاور شما</small><strong style={{ display: 'block', fontSize: 11, marginTop: 3 }}>{conversation.counselor.displayName}</strong></div><Circle size={7} fill={colors.accent} color={colors.accent} /></div>}
      </header>

      {error && <div role="alert" style={{ padding: '10px 16px', margin: 14, borderRadius: 10, color: '#c44b55', background: 'rgba(190,75,85,.08)', fontSize: 11 }}>{error}</div>}
      {loading ? <div style={{ textAlign: 'center', padding: 54, color: colors.sub, fontSize: 12 }}>در حال دریافت گفت‌وگو…</div> : !conversation ? (
        <div style={{ margin: 18, padding: '42px 20px', textAlign: 'center', borderRadius: 14, background: colors.inner, border: `1px dashed ${colors.border}` }}><MessageCircle size={34} color={colors.accent} style={{ marginBottom: 10 }} /><p style={{ margin: '0 0 7px', fontSize: 13, fontWeight: 850 }}>هنوز مشاوری برای شما تعیین نشده است.</p><p style={{ margin: 0, color: colors.sub, fontSize: 11, lineHeight: 1.9 }}>پس از تخصیص مشاور توسط مدیریت، امکان گفت‌وگوی آنلاین در همین بخش فعال می‌شود.</p></div>
      ) : (
        <div style={{ padding: 14 }}>
          <div className="student-chat-scroll-area" aria-live="polite" style={{ minHeight: 300, maxHeight: 520, overflowY: 'auto', padding: 18, background: isDark ? '#141a1c' : '#f7faf9', border: `1px solid ${colors.border}`, borderRadius: '13px 13px 0 0' }}>
            {messages.length === 0 ? <div style={{ textAlign: 'center', padding: '65px 18px', color: colors.sub }}><MessageCircle size={30} style={{ opacity: .6, marginBottom: 10 }} /><p style={{ margin: 0, fontSize: 12, fontWeight: 800 }}>گفت‌وگو را شروع کنید</p><p style={{ fontSize: 11, lineHeight: 1.8 }}>پیام شما مستقیماً برای مشاور اختصاص‌یافته ارسال می‌شود.</p></div> : messages.map(message => {
              const own = !!currentUserId && message.senderUserId === currentUserId;
              return <div key={message.id} style={{ display: 'flex', direction: 'ltr', justifyContent: own ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                <div style={{ direction: 'rtl', maxWidth: 'min(84%, 700px)', padding: '11px 14px', borderRadius: own ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: own ? colors.accentSolid : colors.card, color: own ? '#fff' : colors.text, border: own ? '1px solid transparent' : `1px solid ${colors.border}`, overflowWrap: 'anywhere', boxShadow: isDark ? 'none' : '0 3px 12px rgba(32,62,58,.045)' }}>
                  {message.content && <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.9 }}>{message.content}</div>}
                  {message.attachmentName && !message.content.trim() && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2, color: own ? 'rgba(255,255,255,.78)' : colors.sub, fontSize: 10 }}><Paperclip size={12} /> پیام فقط شامل فایل پیوست است</div>}
                  {message.attachmentName && <a href={`/api/counseling/conversations/${conversation.id}/messages/${message.id}/attachment`} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, padding: '10px 11px', borderRadius: 10, background: own ? 'rgba(255,255,255,.10)' : colors.soft, border: `1px solid ${colors.border}`, color: own ? '#fff' : colors.accent, textDecoration: 'none', fontSize: 11 }}><Paperclip size={15} /><span style={{ flex: 1, overflowWrap: 'anywhere' }}>{message.attachmentName}<small style={{ display: 'block', marginTop: 4, opacity: .75 }}>{message.attachmentSize ? (message.attachmentSize / 1024 / 1024).toFixed(2) + ' MB' : 'پیوست'}</small></span><Download size={14} /></a>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6, marginTop: 6, fontSize: 9, opacity: .8 }}><time>{new Date(message.createdAt).toLocaleString('fa-IR')}</time>{own && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: message.readAt ? (isDark ? '#a8e6cf' : '#237e68') : 'inherit' }}>{message.readAt ? <CheckCheck size={12} /> : <Check size={12} />}{message.readAt ? 'دیده شد' : 'ارسال شد'}</span>}</div>
                </div>
              </div>;
            })}<div ref={bottomRef} />
          </div>
          {selectedFile && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${colors.border}`, borderBottom: 0, borderRadius: '10px 10px 0 0', background: colors.inner, color: colors.sub, fontSize: 10 }}><Paperclip size={14} /><span style={{ flex: 1, overflowWrap: 'anywhere' }}>{selectedFile.name}</span><button type="button" onClick={() => setSelectedFile(null)} style={{ border: 0, background: 'transparent', color: '#d4777d', cursor: 'pointer' }}>حذف پیوست</button></div>}
          <form onSubmit={sendMessage} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: 12, background: colors.card, border: `1px solid ${colors.border}`, borderTop: 0, borderRadius: '0 0 13px 13px' }}>
            <label title="افزودن فایل (حداکثر ۱۰ مگابایت)" style={{ display: 'grid', placeItems: 'center', flex: '0 0 40px', height: 44, border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.inner, color: colors.accent, cursor: sending ? 'wait' : 'pointer' }}><Paperclip size={17} /><input type="file" disabled={sending} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.mp4,.webm" onChange={e => { setSelectedFile(e.target.files?.[0] || null); e.currentTarget.value = ''; }} style={{ display: 'none' }} /></label>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (draft.trim() || selectedFile) void sendMessage(e as unknown as FormEvent); } }} maxLength={5000} rows={2} disabled={sending} placeholder="برای ارسال Enter و برای خط جدید Shift+Enter" aria-label="متن پیام" style={{ flex: 1, minWidth: 0, resize: 'vertical', border: `1px solid ${colors.border}`, borderRadius: 10, padding: 11, background: colors.inner, color: colors.text, font: 'inherit', fontSize: 12, lineHeight: 1.8, outline: 'none' }} />
            <button type="submit" disabled={sending || (!draft.trim() && !selectedFile)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, border: 0, borderRadius: 10, padding: '0 16px', background: colors.accentSolid, color: '#fff', fontSize: 11, fontWeight: 850, cursor: sending || (!draft.trim() && !selectedFile) ? 'wait' : 'pointer', opacity: sending || (!draft.trim() && !selectedFile) ? .6 : 1 }}><Send size={15} />{sending ? 'در حال ارسال…' : 'ارسال'}</button>
          </form>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.sub, fontSize: 9, margin: '10px 3px 0' }}><FileText size={12} /> پیام‌ها در همین گفت‌وگو ذخیره می‌شوند و پس از تازه‌سازی باقی می‌مانند.</p>
        </div>
      )}
      <style>{`
        .student-chat-scroll-area{scrollbar-width:thin;scrollbar-color:${colors.accentSolid} ${colors.inner};scrollbar-gutter:stable}
        .student-chat-scroll-area::-webkit-scrollbar{width:7px;height:7px}
        .student-chat-scroll-area::-webkit-scrollbar-track{background:${colors.inner};border-radius:999px}
        .student-chat-scroll-area::-webkit-scrollbar-thumb{background:${colors.accentSolid};border:2px solid ${colors.inner};border-radius:999px}
        .student-chat-scroll-area::-webkit-scrollbar-thumb:hover{background:${isDark ? '#70b9b5' : '#286d70'}}
      `}</style>
    </section>
  );
}
