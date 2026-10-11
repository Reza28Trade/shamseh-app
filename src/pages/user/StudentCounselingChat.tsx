import { useEffect, useState, type FormEvent } from 'react';

type Conversation = {
  id: string;
  studentId: string;
  counselor: { id: string; displayName: string };
  messages: { id: string; content: string; senderUserId: string; createdAt: string; readAt: string | null }[];
  _count: { messages: number };
};

type Message = {
  id: string;
  content: string;
  senderUserId: string;
  createdAt: string;
  readAt: string | null;
};

export function StudentCounselingChat({ isDark }: { isDark: boolean }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const colors = isDark
    ? { card: '#191f21', inner: '#202729', text: '#f1f4f3', sub: '#a2aeae', border: '#303a3c', accent: '#70b9b5' }
    : { card: '#fff', inner: '#f7faf9', text: '#202a2a', sub: '#667675', border: '#d8e3e0', accent: '#398a90' };

  async function loadConversation() {
    const response = await fetch('/api/counseling/conversations', { credentials: 'include' });
    if (!response.ok) throw new Error('دریافت گفت‌وگوی مشاوره انجام نشد.');
    const data: Conversation[] = await response.json();
    const active = data[0] ?? null;
    setConversation(active);
    if (active) {
      const messagesResponse = await fetch(`/api/counseling/conversations/${active.id}/messages`, { credentials: 'include' });
      if (!messagesResponse.ok) throw new Error('دریافت پیام‌ها انجام نشد.');
      setMessages(await messagesResponse.json());
    } else {
      setMessages([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const [meResponse, conversationsResponse] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'include' }),
          fetch('/api/counseling/conversations', { credentials: 'include' }),
        ]);
        if (!meResponse.ok || !conversationsResponse.ok) throw new Error('دریافت اطلاعات مشاوره انجام نشد.');
        const me = await meResponse.json();
        const conversations: Conversation[] = await conversationsResponse.json();
        const active = conversations[0] ?? null;
        if (cancelled) return;
        setCurrentUserId(me.user?.id ?? '');
        setConversation(active);
        if (active) {
          const response = await fetch(`/api/counseling/conversations/${active.id}/messages`, { credentials: 'include' });
          if (!response.ok) throw new Error('دریافت پیام‌ها انجام نشد.');
          const data = await response.json();
          if (!cancelled) setMessages(data);
        } else {
          setMessages([]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'دریافت اطلاعات مشاوره انجام نشد.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !conversation || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch(`/api/counseling/conversations/${conversation.id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'ارسال پیام انجام نشد.');
      setDraft('');
      await loadConversation();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ارسال پیام انجام نشد.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section style={{ background: colors.card, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 22, direction: 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 850 }}>مشاوره من</h2>
          <p style={{ margin: '7px 0 0', color: colors.sub, fontSize: 12 }}>پیام خود را برای مشاور اختصاص‌یافته ارسال کنید و پاسخ را همین‌جا ببینید.</p>
        </div>
        {conversation && <span style={{ borderRadius: 9, padding: '7px 10px', background: colors.inner, color: colors.accent, fontSize: 11, fontWeight: 800 }}>مشاور: {conversation.counselor.displayName}</span>}
      </div>

      {error && <div role="alert" style={{ padding: 12, marginBottom: 14, borderRadius: 10, color: '#d92d20', background: 'rgba(217,45,32,.08)', fontSize: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 36, color: colors.sub, fontSize: 12 }}>در حال دریافت گفت‌وگو…</div>
      ) : !conversation ? (
        <div style={{ textAlign: 'center', padding: '36px 16px', borderRadius: 14, background: colors.inner, border: `1px solid ${colors.border}` }}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800 }}>هنوز مشاوری برای شما تعیین نشده است.</p>
          <p style={{ margin: 0, color: colors.sub, fontSize: 12 }}>پس از تخصیص مشاور توسط مدیریت، امکان گفت‌وگوی آنلاین در همین بخش فعال می‌شود.</p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div aria-live="polite" style={{ minHeight: 300, maxHeight: 520, overflowY: 'auto', padding: 16, background: colors.inner }}>
            {messages.length === 0 ? (
              <p style={{ textAlign: 'center', color: colors.sub, fontSize: 12, padding: 30 }}>هنوز پیامی ارسال نشده است. می‌توانید گفت‌وگو را شروع کنید.</p>
            ) : messages.map(message => {
              const own = message.senderUserId === currentUserId;
              return (
                <div key={message.id} style={{ display: 'flex', justifyContent: own ? 'flex-start' : 'flex-end', marginBottom: 12 }}>
                  <div style={{ maxWidth: '85%', padding: '10px 13px', borderRadius: 13, background: own ? colors.accent : colors.card, color: own ? '#fff' : colors.text, border: own ? 'none' : `1px solid ${colors.border}`, overflowWrap: 'anywhere' }}>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8 }}>{message.content}</div>
                    <time style={{ display: 'block', marginTop: 5, fontSize: 10, opacity: .75 }}>{new Date(message.createdAt).toLocaleString('fa-IR')}</time>
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10, padding: 12, background: colors.card, borderTop: `1px solid ${colors.border}` }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} maxLength={5000} rows={2} required disabled={sending} placeholder="پیام خود را بنویسید…" aria-label="متن پیام" style={{ flex: 1, minWidth: 0, resize: 'vertical', border: `1px solid ${colors.border}`, borderRadius: 10, padding: 11, background: colors.inner, color: colors.text, font: 'inherit', fontSize: 13 }} />
            <button type="submit" disabled={sending || !draft.trim()} style={{ alignSelf: 'stretch', minWidth: 82, border: 0, borderRadius: 10, padding: '0 16px', background: colors.accent, color: '#fff', fontWeight: 800, cursor: sending || !draft.trim() ? 'wait' : 'pointer', opacity: sending || !draft.trim() ? .65 : 1 }}>{sending ? 'در حال ارسال…' : 'ارسال پیام'}</button>
          </form>
        </div>
      )}
    </section>
  );
}
