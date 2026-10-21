import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send, UserRound, Circle, Mic, Square, Paperclip, FileText, Download, Check, CheckCheck } from 'lucide-react';

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
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const loadRequestId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const colors = isDark
    ? { bg: '#262424', card: '#1D1B1B', inner: '#302D2D', text: '#EEE5DA', sub: '#B9B0A6', border: 'rgba(238,229,218,.12)', accent: '#48D1CC', accentSolid: '#008C88', soft: 'rgba(72,209,204,.12)' }
    : { bg: '#EEE5DA', card: '#F7F1E8', inner: '#E5D9CB', text: '#262424', sub: '#655D55', border: 'rgba(38,36,36,.12)', accent: '#008080', accentSolid: '#008080', soft: 'rgba(0,128,128,.10)' };

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
    <section className="student-counseling-panel" style={{ direction: 'rtl', color: colors.text, fontFamily: 'Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 15, overflow: 'hidden', boxShadow: 'none', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', minHeight: 420 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderBottom: `1px solid ${colors.border}`, background: colors.card }}>
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
        <div className="student-counseling-body" style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="student-chat-scroll-area" aria-live="polite" style={{ flex: 1, minHeight: 0, maxHeight: 'none', overflowY: 'auto', padding: 14, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '13px 13px 0 0' }}>
            {messages.length === 0 ? <div style={{ textAlign: 'center', padding: '65px 18px', color: colors.sub }}><MessageCircle size={30} style={{ opacity: .6, marginBottom: 10 }} /><p style={{ margin: 0, fontSize: 12, fontWeight: 800 }}>گفت‌وگو را شروع کنید</p><p style={{ fontSize: 11, lineHeight: 1.8 }}>پیام شما مستقیماً برای مشاور اختصاص‌یافته ارسال می‌شود.</p></div> : messages.map(message => {
              const own = message.sender.role === 'STUDENT';
              return <div key={message.id} style={{ display: 'flex', direction: 'ltr', justifyContent: own ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                <div style={{ direction: 'rtl', maxWidth: 'min(84%, 700px)', padding: '11px 14px', borderRadius: own ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: own ? colors.accentSolid : colors.card, color: own ? '#fff' : colors.text, border: own ? '1px solid transparent' : `1px solid ${colors.border}`, overflowWrap: 'anywhere', boxShadow: isDark ? 'none' : '0 3px 12px rgba(32,62,58,.045)' }}>
                  {message.content && <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.9 }}>{message.content}</div>}
                  {message.attachmentName && !message.content.trim() && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2, color: own ? 'rgba(255,255,255,.78)' : colors.sub, fontSize: 10 }}><Paperclip size={12} /> پیام فقط شامل فایل پیوست است</div>}
                  {message.attachmentName && (message.attachmentMimeType?.startsWith('audio/') || /\.(mp3|wav|webm)$/i.test(message.attachmentName || '')) ? <audio controls preload="metadata" style={{ display: 'block', width: 'min(280px, 100%)', marginTop: 9 }} src={`/api/counseling/conversations/${conversation.id}/messages/${message.id}/attachment?inline=true`} /> : null}
                  {message.attachmentName && <a href={`/api/counseling/conversations/${conversation.id}/messages/${message.id}/attachment`} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, padding: '10px 11px', borderRadius: 10, background: own ? 'rgba(255,255,255,.10)' : colors.soft, border: `1px solid ${colors.border}`, color: own ? '#fff' : colors.accent, textDecoration: 'none', fontSize: 11 }}><Paperclip size={15} /><span style={{ flex: 1, overflowWrap: 'anywhere' }}>{message.attachmentName}<small style={{ display: 'block', marginTop: 4, opacity: .75 }}>{message.attachmentSize ? (message.attachmentSize / 1024 / 1024).toFixed(2) + ' MB' : 'پیوست'}</small></span><Download size={14} /></a>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6, marginTop: 7, fontSize: 10, opacity: 1 }}><time>{new Date(message.createdAt).toLocaleString('fa-IR')}</time>{own && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: message.readAt ? (isDark ? '#d1fae5' : '#ffffff') : (isDark ? 'rgba(255,255,255,.88)' : '#ffffff') }}>{message.readAt ? <CheckCheck size={12} /> : <Check size={12} />}{message.readAt ? 'دیده شد' : 'ارسال شد'}</span>}</div>
                </div>
              </div>;
            })}<div ref={bottomRef} />
          </div>
          {isRecording && <div style={{ padding: '7px 12px', color: '#d85b65', fontSize: 11 }}>در حال ضبط پیام صوتی… برای پایان ضبط، دکمه مربع را بزنید.</div>}
          {selectedFile && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${colors.border}`, borderBottom: 0, borderRadius: '10px 10px 0 0', background: colors.inner, color: colors.sub, fontSize: 10 }}><Paperclip size={14} /><span style={{ flex: 1, overflowWrap: 'anywhere' }}>{selectedFile.name}</span><button type="button" onClick={() => setSelectedFile(null)} style={{ border: 0, background: 'transparent', color: '#d4777d', cursor: 'pointer' }}>حذف پیوست</button></div>}
          <form className="student-chat-composer" onSubmit={sendMessage} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: 10, background: colors.card, border: `1px solid ${colors.border}`, borderTop: 0, borderRadius: '0 0 13px 13px' }}>
            <button type="button" title={isRecording ? 'پایان ضبط' : 'ضبط پیام صوتی'} disabled={sending || Boolean(selectedFile)} onClick={() => void toggleVoiceRecording()} style={{ display: 'grid', placeItems: 'center', flex: '0 0 40px', height: 44, border: `1px solid ${colors.border}`, borderRadius: 10, background: isRecording ? '#b43d48' : colors.inner, color: isRecording ? '#fff' : colors.accent, cursor: sending ? 'wait' : 'pointer' }}>{isRecording ? <Square size={15}/> : <Mic size={17}/>}</button>
            <label title="افزودن فایل (حداکثر ۱۰ مگابایت)" style={{ display: 'grid', placeItems: 'center', flex: '0 0 40px', height: 44, border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.inner, color: colors.accent, cursor: sending ? 'wait' : 'pointer' }}><Paperclip size={17} /><input type="file" disabled={sending} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.mp4,.webm" onChange={e => { setSelectedFile(e.target.files?.[0] || null); e.currentTarget.value = ''; }} style={{ display: 'none' }} /></label>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (draft.trim() || selectedFile) void sendMessage(e as unknown as FormEvent); } }} maxLength={5000} rows={2} disabled={sending} placeholder="برای ارسال Enter و برای خط جدید Shift+Enter" aria-label="متن پیام" style={{ flex: 1, minWidth: 0, resize: 'vertical', border: `1px solid ${colors.border}`, borderRadius: 10, padding: 11, background: colors.inner, color: colors.text, font: 'inherit', fontSize: 12, lineHeight: 1.8, outline: 'none' }} />
            <button type="submit" disabled={sending || (!draft.trim() && !selectedFile)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, border: 0, borderRadius: 10, padding: '0 16px', background: colors.accentSolid, color: '#fff', fontSize: 11, fontWeight: 850, cursor: sending || (!draft.trim() && !selectedFile) ? 'wait' : 'pointer', opacity: sending || (!draft.trim() && !selectedFile) ? .6 : 1, boxShadow: 'none' }}><Send size={15} />{sending ? 'در حال ارسال…' : 'ارسال'}</button>
          </form>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.sub, fontSize: 9, margin: '10px 3px 0' }}><FileText size={12} /> پیام‌ها در همین گفت‌وگو ذخیره می‌شوند و پس از تازه‌سازی باقی می‌مانند.</p>
        </div>
      )}
      <style>{`
        .student-counseling-panel{min-width:0}\n        .student-chat-composer textarea{min-height:44px;max-height:140px}\n        .student-chat-scroll-area{scrollbar-width:thin;scrollbar-color:${colors.accentSolid} ${colors.inner};scrollbar-gutter:stable}
        .student-chat-scroll-area::-webkit-scrollbar{width:7px;height:7px}
        .student-chat-scroll-area::-webkit-scrollbar-track{background:${colors.inner};border-radius:999px}
        .student-chat-scroll-area::-webkit-scrollbar-thumb{background:${colors.accentSolid};border:2px solid ${colors.inner};border-radius:999px}
        .student-chat-scroll-area::-webkit-scrollbar-thumb:hover{background:${isDark ? '#70b9b5' : '#286d70'}}
        @media(max-width:640px){.student-counseling-panel{height:calc(100dvh - 100px)!important;min-height:360px!important}.student-counseling-body{padding:8px!important}.student-chat-scroll-area{padding:10px!important}.student-chat-composer{gap:6px!important;padding:8px!important}.student-chat-composer button[type=submit]{padding:0 10px!important}.student-chat-composer textarea{font-size:11px!important}}
        @media(max-height:600px){.student-counseling-panel{height:calc(100vh - 90px);min-height:320px}}
      `}</style>
    </section>
  );
}
