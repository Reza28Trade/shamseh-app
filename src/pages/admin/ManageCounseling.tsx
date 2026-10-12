import React, { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MessageSquare, Plus, RefreshCw, Search, ShieldCheck, UserRound, Users, ArrowLeftRight, History, Eye, EyeOff, Paperclip, Download } from 'lucide-react';

type Counselor = {
  id: string;
  displayName: string;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  user: { id: string; username: string; status: 'ACTIVE' | 'INACTIVE' };
};
type StudentOption = { id: string; fullName: string; nationalId: string; academicLevel?: string | null };
type Assignment = {
  id: string;
  studentId: string;
  counselorId: string;
  startedAt: string;
  endedAt: string | null;
  student: { id: string; fullName: string; nationalId: string };
  counselor: { id: string; displayName: string };
  assignedBy: { id: string; username: string };
};
type Conversation = {
  id: string;
  studentId: string;
  counselorId: string;
  updatedAt: string;
  student: { id: string; fullName: string; nationalId: string };
  counselor: { id: string; displayName: string };
  messages: { id: string; content: string; senderUserId: string; readAt: string | null; createdAt: string; attachmentName?: string | null }[];
  _count: { messages: number };
};
type Message = { id: string; content: string; senderUserId: string; readAt: string | null; createdAt: string; attachmentName?: string | null; attachmentMimeType?: string | null; attachmentSize?: number | null };

const inputStyle: React.CSSProperties = {
  width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid var(--admin-border)',
  borderRadius: 10, background: 'var(--admin-control)', color: 'var(--admin-text)', font: 'inherit', fontSize: 12,
};
const buttonStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 12px',
  border: '1px solid var(--admin-brand-border)', borderRadius: 10, background: 'var(--admin-accent-soft)',
  color: 'var(--admin-text)', fontSize: 11, fontWeight: 800, cursor: 'pointer',
};
const cardStyle: React.CSSProperties = {
  minWidth: 0, padding: 18, border: '1px solid var(--admin-border)', borderRadius: 16,
  background: 'var(--admin-card)',
};

export const ManageCounseling: React.FC = () => {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [counselorId, setCounselorId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messageRequestId = React.useRef(0);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const responses = await Promise.all([
        fetch('/api/admin/counselors', { credentials: 'include' }),
        fetch('/api/admin/students', { credentials: 'include' }),
        fetch('/api/admin/counseling/assignments', { credentials: 'include' }),
        fetch('/api/counseling/conversations', { credentials: 'include' }),
      ]);
      if (responses.some(response => !response.ok)) throw new Error('دریافت اطلاعات مدیریت مشاوره انجام نشد.');
      const [counselorData, studentData, assignmentData, conversationData] = await Promise.all(responses.map(response => response.json()));
      setCounselors(counselorData);
      setStudents(studentData.map((student: any) => ({
        id: student.id, fullName: student.fullName, nationalId: student.nationalId, academicLevel: student.academicLevel ?? null,
      })));
      setAssignments(assignmentData);
      setConversations(conversationData);
      setSelectedConversation(current => conversationData.some((c: Conversation) => c.id === current) ? current : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'دریافت اطلاعات انجام نشد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const activeAssignments = useMemo(() => assignments.filter(item => !item.endedAt), [assignments]);
  const filteredConversations = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    if (!q) return conversations;
    return conversations.filter(item =>
      item.student.fullName.toLocaleLowerCase().includes(q) ||
      item.student.nationalId.includes(q) ||
      item.counselor.displayName.toLocaleLowerCase().includes(q) ||
      ((item.messages[0]?.attachmentName || item.messages[0]?.content) || '').toLocaleLowerCase().includes(q)
    );
  }, [conversations, search]);
  const selected = conversations.find(item => item.id === selectedConversation) ?? null;

  async function createCounselor(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/counselors', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, displayName: displayName.trim(), bio: bio.trim() || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'ساخت حساب مشاور انجام نشد.');
      setUsername(''); setPassword(''); setDisplayName(''); setBio(''); setShowCreate(false);
      setNotice('حساب مشاور ساخته شد.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ساخت حساب مشاور انجام نشد.');
    } finally { setSaving(false); }
  }

  async function toggleCounselor(counselor: Counselor) {
    const isActive = !counselor.isActive;
    setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/counselors/${counselor.id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'تغییر وضعیت مشاور انجام نشد.');
      setNotice(isActive ? 'مشاور فعال شد.' : 'مشاور غیرفعال شد؛ سوابق گفتگو حفظ شده‌اند.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'تغییر وضعیت انجام نشد.'); }
  }

  async function assignStudent(event: FormEvent) {
    event.preventDefault();
    if (!studentId || !counselorId) { setError('هنرجو و مشاور را انتخاب کنید.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/counseling/assignments', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, counselorId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'تخصیص یا انتقال هنرجو انجام نشد.');
      setNotice('تخصیص مشاور ثبت شد. تاریخچه تخصیص قبلی حفظ شده است.');
      setStudentId(''); setCounselorId('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'تخصیص هنرجو انجام نشد.'); }
    finally { setSaving(false); }
  }

  async function openConversation(id: string) {
    const requestId = ++messageRequestId.current;
    setSelectedConversation(id);
    setMessages([]);
    setMessagesLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/counseling/conversations/${id}/messages`, { credentials: 'include' });
      const data = await response.json().catch(() => null);
      if (requestId !== messageRequestId.current) return;
      if (!response.ok) throw new Error(data?.message || 'دریافت تاریخچه گفتگو انجام نشد.');
      setMessages(data);
    } catch (e) {
      if (requestId !== messageRequestId.current) return;
      setError(e instanceof Error ? e.message : 'دریافت پیام‌ها انجام نشد.');
      setMessages([]);
    } finally {
      if (requestId === messageRequestId.current) setMessagesLoading(false);
    }
  }

  const dateLabel = (value: string) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(value));
  const levelLabel = (level?: string | null) => level === 'MASTER' ? 'ارشد' : level === 'DOCTORATE' ? 'دکتری' : 'بدون مقطع';

  return (
    <div className="admin-legacy-page admin-counseling-page" style={{ display: 'flex', flexDirection: 'column', gap: 18, color: 'var(--admin-text)', direction: 'rtl' }}>
      <div className="counseling-page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>مدیریت مشاوران و گفت‌وگوها</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--admin-sub)', fontSize: 11 }}>تخصیص هنرجو، انتقال مشاور و نظارت بر تاریخچه گفت‌وگوهای آنلاین</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} style={buttonStyle}><RefreshCw size={14} /> بروزرسانی</button>
      </div>

      {error && <div role="alert" style={{ padding: 12, borderRadius: 10, color: '#d92d20', background: 'rgba(217,45,32,.08)', fontSize: 12 }}>{error}</div>}
      {notice && <div role="status" style={{ padding: 12, borderRadius: 10, color: '#16805d', background: 'rgba(22,128,93,.09)', fontSize: 12 }}>{notice}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        {[
          { label: 'مشاوران فعال', value: counselors.filter(item => item.isActive).length, icon: UserRound },
          { label: 'هنرجوهای دارای مشاور', value: new Set(activeAssignments.map(item => item.studentId)).size, icon: Users },
          { label: 'پرونده‌های گفتگو', value: conversations.length, icon: MessageSquare },
        ].map(item => { const Icon = item.icon; return <div key={item.label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, padding: 15 }}><div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 11, color: 'var(--admin-accent)', background: 'var(--admin-accent-soft)' }}><Icon size={18}/></div><div><div style={{ color: 'var(--admin-sub)', fontSize: 10 }}>{item.label}</div><strong style={{ display: 'block', marginTop: 4, fontSize: 20 }}>{item.value}</strong></div></div>; })}
      </div>

      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>حساب مشاوران</h3>
          <button type="button" onClick={() => setShowCreate(value => !value)} style={buttonStyle}><Plus size={14}/>{showCreate ? 'بستن فرم' : 'تعریف مشاور جدید'}</button>
        </div>
        {showCreate && <form onSubmit={createCounselor} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10, padding: 14, marginBottom: 16, borderRadius: 12, background: 'var(--admin-inner)' }}>
          <label style={{ fontSize: 11 }}>نام نمایشی<input required value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ ...inputStyle, display: 'block', marginTop: 6 }} /></label>
          <label style={{ fontSize: 11 }}>نام کاربری<input required value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" style={{ ...inputStyle, display: 'block', marginTop: 6 }} /></label>
          <label style={{ fontSize: 11 }}>رمز عبور (حداقل ۱۰ نویسه)<input required minLength={10} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" style={{ ...inputStyle, display: 'block', marginTop: 6 }} /></label>
          <label style={{ fontSize: 11 }}>توضیح اختیاری<input value={bio} onChange={e => setBio(e.target.value)} style={{ ...inputStyle, display: 'block', marginTop: 6 }} /></label>
          <div style={{ display: 'flex', alignItems: 'end' }}><button disabled={saving} style={buttonStyle}>{saving ? 'در حال ثبت…' : 'ساخت حساب مشاور'}</button></div>
        </form>}
        {loading ? <p style={{ color: 'var(--admin-sub)', fontSize: 12 }}>در حال دریافت اطلاعات…</p> : counselors.length === 0 ? <p style={{ color: 'var(--admin-sub)', fontSize: 12 }}>هنوز حساب مشاوری تعریف نشده است.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
            {counselors.map(counselor => <div key={counselor.id} style={{ border: '1px solid var(--admin-border)', borderRadius: 12, padding: 13, background: 'var(--admin-inner)' }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 8 }}>
                <div><strong style={{ fontSize: 13 }}>{counselor.displayName}</strong><div style={{ color: 'var(--admin-sub)', fontSize: 10, marginTop: 5 }}>نام کاربری: {counselor.user.username}</div></div>
                <span style={{ color: counselor.isActive ? '#16805d' : '#b54708', background: counselor.isActive ? 'rgba(22,128,93,.1)' : 'rgba(181,71,8,.1)', borderRadius: 7, padding: '4px 7px', fontSize: 9, fontWeight: 800 }}>{counselor.isActive ? 'فعال' : 'غیرفعال'}</span>
              </div>
              {counselor.bio && <p style={{ margin: '8px 0 0', color: 'var(--admin-sub)', fontSize: 11 }}>{counselor.bio}</p>}
              <button type="button" onClick={() => void toggleCounselor(counselor)} style={{ ...buttonStyle, marginTop: 12, borderColor: 'var(--admin-border)', background: 'var(--admin-card)' }}>{counselor.isActive ? <EyeOff size={13}/> : <Eye size={13}/>} {counselor.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button>
            </div>)}
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 900 }}>تخصیص یا انتقال هنرجو</h3>
        <p style={{ margin: '0 0 14px', color: 'var(--admin-sub)', fontSize: 11 }}>با انتخاب مشاور جدید، تخصیص قبلی پایان می‌یابد و سوابق آن حفظ می‌شود.</p>
        <form onSubmit={assignStudent} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, alignItems: 'end' }}>
          <label style={{ fontSize: 11 }}>هنرجو<select required value={studentId} onChange={e => setStudentId(e.target.value)} style={{ ...inputStyle, display: 'block', marginTop: 6 }}><option value="">انتخاب هنرجو</option>{students.map(student => <option key={student.id} value={student.id}>{student.fullName} · {student.nationalId} · {levelLabel(student.academicLevel)}</option>)}</select></label>
          <label style={{ fontSize: 11 }}>مشاور فعال<select required value={counselorId} onChange={e => setCounselorId(e.target.value)} style={{ ...inputStyle, display: 'block', marginTop: 6 }}><option value="">انتخاب مشاور</option>{counselors.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
          <button disabled={saving || loading || !studentId || !counselorId} style={{ ...buttonStyle, minHeight: 39 }}><ArrowLeftRight size={14}/>{saving ? 'در حال ثبت…' : 'ثبت تخصیص / انتقال'}</button>
        </form>
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div><h3 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>نظارت بر گفت‌وگوها</h3><p style={{ margin: '5px 0 0', color: 'var(--admin-sub)', fontSize: 10 }}>ادمین می‌تواند تاریخچه را مشاهده کند؛ ارسال پیام از طرف ادمین غیرفعال است.</p></div>
          <div style={{ position: 'relative', minWidth: 220, maxWidth: 340, flex: '1 1 240px' }}><Search size={14} style={{ position: 'absolute', right: 10, top: 12, color: 'var(--admin-sub)' }}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی هنرجو، مشاور یا پیام" style={{ ...inputStyle, paddingRight: 32 }}/></div>
        </div>
        {loading ? <p style={{ color: 'var(--admin-sub)', fontSize: 12 }}>در حال دریافت گفت‌وگوها…</p> : filteredConversations.length === 0 ? <p style={{ color: 'var(--admin-sub)', fontSize: 12 }}>گفت‌وگویی مطابق جست‌وجو پیدا نشد.</p> : (
          <div className="admin-counseling-conversations-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, .85fr) minmax(0, 1.5fr)', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
              {filteredConversations.map(item => <button key={item.id} type="button" onClick={() => void openConversation(item.id)} style={{ width: '100%', textAlign: 'right', padding: 12, borderRadius: 11, border: `1px solid ${selectedConversation === item.id ? 'var(--admin-accent)' : 'var(--admin-border)'}`, background: selectedConversation === item.id ? 'var(--admin-accent-soft)' : 'var(--admin-inner)', color: 'var(--admin-text)', cursor: 'pointer' }}>
                <strong style={{ display: 'block', fontSize: 12 }}>{item.student.fullName}</strong><span style={{ display: 'block', color: 'var(--admin-sub)', fontSize: 10, marginTop: 4 }}>مشاور: {item.counselor.displayName}</span><span style={{ display: 'block', color: 'var(--admin-sub)', fontSize: 10, marginTop: 5 }}>{item._count.messages} پیام · {item.messages[0] ? dateLabel(item.messages[0].createdAt) : 'بدون پیام'}</span>
                {item.messages[0] && <span style={{ display: 'block', fontSize: 10, marginTop: 7, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.messages[0].attachmentName ? '📎 ' + item.messages[0].attachmentName : item.messages[0].content}</span>}
              </button>)}
            </div>
            <div style={{ minWidth: 0, border: '1px solid var(--admin-border)', borderRadius: 12, padding: 12, background: 'var(--admin-inner)' }}>
              {!selected ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--admin-sub)', fontSize: 12 }}><History size={22} style={{ marginBottom: 8 }}/><div>برای مشاهده تاریخچه، یک گفت‌وگو را انتخاب کنید.</div></div> : <>
                <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--admin-border)', marginBottom: 10 }}><strong style={{ fontSize: 12 }}>{selected.student.fullName}</strong><div style={{ color: 'var(--admin-sub)', fontSize: 10, marginTop: 4 }}>مشاور: {selected.counselor.displayName} · کد هنرجو: {selected.student.nationalId}</div></div>
                <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {messagesLoading ? <p style={{ color: 'var(--admin-sub)', fontSize: 11 }}>در حال دریافت تاریخچه…</p> : messages.length === 0 ? <p style={{ color: 'var(--admin-sub)', fontSize: 11, textAlign: 'center', padding: 25 }}>هنوز پیامی ثبت نشده است.</p> : messages.map(message => <div key={message.id} style={{ border: '1px solid var(--admin-border)', borderRadius: 10, padding: 10, background: 'var(--admin-card)' }}>{message.content && <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12, lineHeight: 1.8 }}>{message.content}</div>}
                    {message.attachmentName && <a href={`/api/counseling/conversations/${selectedConversation}/messages/${message.id}/attachment`} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, padding: '10px 11px', borderRadius: 9, background: 'var(--admin-accent-soft)', border: '1px solid var(--admin-brand-border)', color: 'var(--admin-text)', textDecoration: 'none', fontSize: 11 }}><Paperclip size={14}/><span style={{ flex: 1, overflowWrap: 'anywhere' }}>{message.attachmentName}<small style={{ display: 'block', color: 'var(--admin-sub)', marginTop: 4 }}>{message.attachmentSize ? (message.attachmentSize / 1024 / 1024).toFixed(2) + ' MB' : 'پیوست'}</small></span><Download size={14}/></a>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 7, color: 'var(--admin-sub)', fontSize: 9 }}><span>شناسه فرستنده: {message.senderUserId.slice(0, 8)}</span><time>{dateLabel(message.createdAt)}</time></div></div>)}
                </div>
              </>}
            </div>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 12px', fontSize: 14, fontWeight: 900 }}><ShieldCheck size={16} color="var(--admin-accent)"/> تاریخچه تخصیص‌ها</h3>
        {assignments.length === 0 ? <p style={{ color: 'var(--admin-sub)', fontSize: 11 }}>هنوز تخصیصی ثبت نشده است.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}><thead><tr>{['هنرجو','مشاور','شروع مسئولیت','پایان مسئولیت','ثبت‌کننده'].map(label => <th key={label} style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--admin-sub)', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' }}>{label}</th>)}</tr></thead><tbody>{assignments.map(item => <tr key={item.id}><td style={{ padding: '10px 8px', borderBottom: '1px solid var(--admin-border)' }}>{item.student.fullName}<div style={{ color: 'var(--admin-sub)', fontSize: 9 }}>{item.student.nationalId}</div></td><td style={{ padding: '10px 8px', borderBottom: '1px solid var(--admin-border)' }}>{item.counselor.displayName}</td><td style={{ padding: '10px 8px', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' }}>{dateLabel(item.startedAt)}</td><td style={{ padding: '10px 8px', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' }}>{item.endedAt ? dateLabel(item.endedAt) : <span style={{ color: '#16805d', fontWeight: 800 }}>فعال</span>}</td><td style={{ padding: '10px 8px', borderBottom: '1px solid var(--admin-border)' }}>{item.assignedBy.username}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
};
