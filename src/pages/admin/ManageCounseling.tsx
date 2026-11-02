import React, { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MessageSquare, Plus, RefreshCw, Search, ShieldCheck, UserRound, Users, ArrowLeftRight, History, Eye, EyeOff, Paperclip, Download } from 'lucide-react';
import '../../styles/admin/pages/ManageCounseling.css';

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
  const [counselorSearch, setCounselorSearch] = useState('');
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [studentId, setStudentId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentLevelFilter, setStudentLevelFilter] = useState('ALL');
  const [studentAssignmentFilter, setStudentAssignmentFilter] = useState('ALL');
  const [studentPage, setStudentPage] = useState(1);
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
  const filteredCounselors = counselors.filter(item => [item.displayName, item.user.username, item.bio || ''].some(value => value.toLocaleLowerCase().includes(counselorSearch.trim().toLocaleLowerCase())));
  const activeStudentIds = useMemo(() => new Set(activeAssignments.map(item => item.studentId)), [activeAssignments]);
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLocaleLowerCase();
    return students.filter(student => {
      const matchesSearch = !q || student.fullName.toLocaleLowerCase().includes(q) || student.nationalId.includes(q);
      const matchesLevel = studentLevelFilter === 'ALL' || student.academicLevel === studentLevelFilter;
      const assigned = activeStudentIds.has(student.id);
      const matchesAssignment = studentAssignmentFilter === 'ALL' || (studentAssignmentFilter === 'ASSIGNED' ? assigned : !assigned);
      return matchesSearch && matchesLevel && matchesAssignment;
    });
  }, [students, studentSearch, studentLevelFilter, studentAssignmentFilter, activeStudentIds]);
  const studentPageSize = 10;
  const studentPageCount = Math.max(1, Math.ceil(filteredStudents.length / studentPageSize));
  const visibleStudents = filteredStudents.slice((studentPage - 1) * studentPageSize, studentPage * studentPageSize);
  const assignmentPageSize = 10;
  const assignmentPageCount = Math.max(1, Math.ceil(assignments.length / assignmentPageSize));
  const visibleAssignments = assignments.slice((assignmentPage - 1) * assignmentPageSize, assignmentPage * assignmentPageSize);
  useEffect(() => { setAssignmentPage(1); }, [assignments.length]);
  useEffect(() => { if (assignmentPage > assignmentPageCount) setAssignmentPage(assignmentPageCount); }, [assignmentPage, assignmentPageCount]);
  useEffect(() => { setStudentPage(1); }, [studentSearch, studentLevelFilter, studentAssignmentFilter]);
  useEffect(() => { if (studentPage > studentPageCount) setStudentPage(studentPageCount); }, [studentPage, studentPageCount]);

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
    const targetIds = selectedStudentIds.length ? selectedStudentIds : (studentId ? [studentId] : []);
    if (!targetIds.length || !counselorId) { setError('حداقل یک هنرجو و یک مشاور را انتخاب کنید.'); return; }
    setSaving(true); setError(''); setNotice('');
    const completedIds: string[] = [];
    try {
      for (const targetStudentId of targetIds) {
        const response = await fetch('/api/admin/counseling/assignments', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: targetStudentId, counselorId }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || 'تخصیص یا انتقال هنرجو انجام نشد.');
        completedIds.push(targetStudentId);
      }
      setNotice(completedIds.length === 1 ? 'تخصیص مشاور ثبت شد. تاریخچه تخصیص قبلی حفظ شده است.' : 'تخصیص مشاور برای ' + completedIds.length + ' هنرجو ثبت شد؛ سوابق قبلی حفظ شده‌اند.');
      setStudentId('');
      setSelectedStudentIds([]);
      setCounselorId('');
      await load();
    } catch (e) {
      setSelectedStudentIds(current => current.filter(id => !completedIds.includes(id)));
      setStudentId(current => completedIds.includes(current) ? '' : current);
      setError((e instanceof Error ? e.message : 'تخصیص هنرجو انجام نشد.') + (completedIds.length ? ' تعداد ' + completedIds.length + ' هنرجو با موفقیت ثبت شد؛ انتخاب‌های باقی‌مانده حفظ شده‌اند.' : ''));
      if (completedIds.length) await load();
    } finally { setSaving(false); }
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
    <div className="admin-legacy-page admin-counseling-page" className="admin-extracted-managecounseling-1">
      <div className="counseling-page-head" className="admin-extracted-managecounseling-2">
        <div>
          <h2 className="admin-extracted-managecounseling-3">مدیریت مشاوران و گفت‌وگوها</h2>
          <p className="admin-extracted-managecounseling-4">تخصیص هنرجو، انتقال مشاور و نظارت بر تاریخچه گفت‌وگوهای آنلاین</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} style={buttonStyle}><RefreshCw size={14} /> بروزرسانی</button>
      </div>

      {error && <div role="alert" className="admin-extracted-managecounseling-5">{error}</div>}
      {notice && <div role="status" className="admin-extracted-managecounseling-6">{notice}</div>}

      <div className="counseling-stats-grid" className="admin-extracted-managecounseling-7">
        {[
          { label: 'مشاوران فعال', value: counselors.filter(item => item.isActive).length, icon: UserRound },
          { label: 'هنرجوهای دارای مشاور', value: new Set(activeAssignments.map(item => item.studentId)).size, icon: Users },
          { label: 'هنرجوهای بدون مشاور', value: Math.max(0, students.length - new Set(activeAssignments.map(item => item.studentId)).size), icon: UserRound },
          { label: 'پرونده‌های گفتگو', value: conversations.length, icon: MessageSquare },
        ].map(item => { const Icon = item.icon; return <div key={item.label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, padding: 15 }}><div className="admin-extracted-managecounseling-8"><Icon size={18}/></div><div><div className="admin-extracted-managecounseling-9">{item.label}</div><strong className="admin-extracted-managecounseling-10">{item.value}</strong></div></div>; })}
      </div>

      <section className="counseling-account-section" style={cardStyle}>
        <div className="admin-extracted-managecounseling-11">
          <h3 className="admin-extracted-managecounseling-12">حساب مشاوران</h3>
          <button type="button" onClick={() => setShowCreate(value => !value)} style={buttonStyle}><Plus size={14}/>{showCreate ? 'بستن فرم' : 'تعریف مشاور جدید'}</button>
        </div>
        {showCreate && <form onSubmit={createCounselor} className="admin-extracted-managecounseling-13">
          <label className="admin-extracted-managecounseling-14">نام نمایشی<input required value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ ...inputStyle, display: 'block', marginTop: 6 }} /></label>
          <label className="admin-extracted-managecounseling-15">نام کاربری<input required value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" style={{ ...inputStyle, display: 'block', marginTop: 6 }} /></label>
          <label className="admin-extracted-managecounseling-16">رمز عبور (حداقل ۱۰ نویسه)<input required minLength={10} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" style={{ ...inputStyle, display: 'block', marginTop: 6 }} /></label>
          <label className="admin-extracted-managecounseling-17">توضیح اختیاری<input value={bio} onChange={e => setBio(e.target.value)} style={{ ...inputStyle, display: 'block', marginTop: 6 }} /></label>
          <div className="admin-extracted-managecounseling-18"><button disabled={saving} style={buttonStyle}>{saving ? 'در حال ثبت…' : 'ساخت حساب مشاور'}</button></div>
        </form>}
        {loading ? <p className="admin-extracted-managecounseling-19">در حال دریافت اطلاعات…</p> : counselors.length === 0 ? <p className="admin-extracted-managecounseling-20">هنوز حساب مشاوری تعریف نشده است.</p> : (
          <>
          <label className="counseling-account-search"><Search size={15}/><input type="search" value={counselorSearch} onChange={e => setCounselorSearch(e.target.value)} placeholder="جست‌وجوی نام مشاور یا نام کاربری" aria-label="جست‌وجوی مشاوران"/></label>
          <div className="counseling-account-list" className="admin-extracted-managecounseling-21">
            {filteredCounselors.map(counselor => <div className="counseling-account-item" key={counselor.id} className="admin-extracted-managecounseling-22">
              <div className="admin-extracted-managecounseling-23">
                <div><strong className="admin-extracted-managecounseling-24">{counselor.displayName}</strong><div className="admin-extracted-managecounseling-25">نام کاربری: {counselor.user.username}</div></div>
                <span style={{ color: counselor.isActive ? '#16805d' : '#b54708', background: counselor.isActive ? 'rgba(22,128,93,.1)' : 'rgba(181,71,8,.1)', borderRadius: 7, padding: '4px 7px', fontSize: 9, fontWeight: 800 }}>{counselor.isActive ? 'فعال' : 'غیرفعال'}</span>
              </div>
              {counselor.bio && <p className="admin-extracted-managecounseling-26">{counselor.bio}</p>}
              <button type="button" onClick={() => void toggleCounselor(counselor)} style={{ ...buttonStyle, marginTop: 12, borderColor: 'var(--admin-border)', background: 'var(--admin-card)' }}>{counselor.isActive ? <EyeOff size={13}/> : <Eye size={13}/>} {counselor.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button>
            </div>)}
          </div>
          </>
        )}
      </section>

      <section className="counseling-assignment-section" style={cardStyle}>
        <h3 className="admin-extracted-managecounseling-27">تخصیص یا انتقال هنرجو</h3>
        <p className="admin-extracted-managecounseling-28">برای جلوگیری از فهرست طولانی، هر صفحه ۱۰ هنرجو دارد. جست‌وجو، فیلتر و انتخاب‌ها هنگام جابه‌جایی صفحه حفظ می‌شوند.</p>
        <div className="counseling-student-tools">
          <label className="counseling-student-search"><Search size={15}/><input type="search" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="جست‌وجوی نام یا کد ملی هنرجو" aria-label="جست‌وجوی هنرجو"/></label>
          <label className="counseling-student-filter"><span>مقطع</span><select value={studentLevelFilter} onChange={e => setStudentLevelFilter(e.target.value)}><option value="ALL">همه مقاطع</option><option value="MASTER">ارشد</option><option value="DOCTORATE">دکتری</option></select></label>
          <label className="counseling-student-filter"><span>وضعیت مشاور</span><select value={studentAssignmentFilter} onChange={e => setStudentAssignmentFilter(e.target.value)}><option value="ALL">همه هنرجوها</option><option value="UNASSIGNED">بدون مشاور</option><option value="ASSIGNED">دارای مشاور</option></select></label>
        </div>
        <div className="counseling-student-list-head"><span>نمایش {visibleStudents.length} از {filteredStudents.length} هنرجو</span><span>انتخاب‌شده: {selectedStudentIds.length}</span></div>
        {loading ? <p className="admin-extracted-managecounseling-29">در حال دریافت فهرست هنرجوها…</p> : filteredStudents.length === 0 ? <p className="admin-extracted-managecounseling-30">هنرجویی مطابق جست‌وجو و فیلترها پیدا نشد.</p> : <div className="counseling-student-list">
          {visibleStudents.map(student => {
            const checked = selectedStudentIds.includes(student.id);
            const assigned = activeStudentIds.has(student.id);
            const assignedCounselor = activeAssignments.find(item => item.studentId === student.id)?.counselor.displayName;
            return <label className="counseling-student-row" key={student.id}>
              <input type="checkbox" checked={checked} onChange={event => setSelectedStudentIds(current => event.target.checked ? [...current.filter(id => id !== student.id), student.id] : current.filter(id => id !== student.id))}/>
              <span className="counseling-student-copy"><strong>{student.fullName}</strong><small>کد ملی: {student.nationalId} · {levelLabel(student.academicLevel)}</small></span>
              <span className={assigned ? 'counseling-assignment-status is-assigned' : 'counseling-assignment-status'}>{assigned ? 'دارای مشاور: ' + (assignedCounselor || 'تخصیص‌یافته') : 'بدون مشاور'}</span>
            </label>;
          })}
        </div>}
        <div className="counseling-student-pagination"><span>صفحه {studentPage} از {studentPageCount}</span><div><button type="button" disabled={studentPage <= 1} onClick={() => setStudentPage(page => Math.max(1, page - 1))}>صفحه قبل</button><button type="button" disabled={studentPage >= studentPageCount} onClick={() => setStudentPage(page => Math.min(studentPageCount, page + 1))}>صفحه بعد</button></div></div>
        <form onSubmit={assignStudent} className="counseling-assignment-submit">
          <label className="admin-extracted-managecounseling-31">مشاور فعال<select required value={counselorId} onChange={e => setCounselorId(e.target.value)}><option value="">انتخاب مشاور</option>{counselors.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
          <button disabled={saving || loading || !selectedStudentIds.length || !counselorId} style={{ ...buttonStyle, minHeight: 39 }}><ArrowLeftRight size={14}/>{saving ? 'در حال ثبت…' : 'ثبت تخصیص برای ' + selectedStudentIds.length + ' هنرجو'}</button>
        </form>
      </section>

      <section className="counseling-conversation-section" style={cardStyle}>
        <div className="admin-extracted-managecounseling-32">
          <div><h3 className="admin-extracted-managecounseling-33">نظارت بر گفت‌وگوها</h3><p className="admin-extracted-managecounseling-34">ادمین می‌تواند تاریخچه را مشاهده کند؛ ارسال پیام از طرف ادمین غیرفعال است.</p></div>
          <div className="admin-extracted-managecounseling-35"><Search size={14} className="admin-extracted-managecounseling-36"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی هنرجو، مشاور یا پیام" style={{ ...inputStyle, paddingRight: 34, paddingLeft: 12 }}/></div>
        </div>
        {loading ? <p className="admin-extracted-managecounseling-37">در حال دریافت گفت‌وگوها…</p> : filteredConversations.length === 0 ? <p className="admin-extracted-managecounseling-38">گفت‌وگویی مطابق جست‌وجو پیدا نشد.</p> : (
          <div className="admin-counseling-conversations-grid" className="admin-extracted-managecounseling-39">
            <div className="counseling-conversation-list" className="admin-extracted-managecounseling-40">
              {filteredConversations.map(item => <button key={item.id} type="button" onClick={() => void openConversation(item.id)} style={{ width: '100%', textAlign: 'right', padding: 12, borderRadius: 11, border: `1px solid ${selectedConversation === item.id ? 'var(--admin-accent)' : 'var(--admin-border)'}`, background: selectedConversation === item.id ? 'var(--admin-accent-soft)' : 'var(--admin-inner)', color: 'var(--admin-text)', cursor: 'pointer' }}>
                <strong className="admin-extracted-managecounseling-41">{item.student.fullName}</strong><span className="admin-extracted-managecounseling-42">مشاور: {item.counselor.displayName}</span><span className="admin-extracted-managecounseling-43">{item._count.messages} پیام · {item.messages[0] ? dateLabel(item.messages[0].createdAt) : 'بدون پیام'}</span>
                {item.messages[0] && <span className="admin-extracted-managecounseling-44">{item.messages[0].attachmentName ? '📎 ' + item.messages[0].attachmentName : item.messages[0].content}</span>}
              </button>)}
            </div>
            <div className="admin-extracted-managecounseling-45">
              {!selected ? <div className="admin-extracted-managecounseling-46"><History size={22} className="admin-extracted-managecounseling-47"/><div>برای مشاهده تاریخچه، یک گفت‌وگو را انتخاب کنید.</div></div> : <>
                <div className="counseling-selected-student" className="admin-extracted-managecounseling-48"><strong className="admin-extracted-managecounseling-49">{selected.student.fullName}</strong><div className="admin-extracted-managecounseling-50">مشاور: {selected.counselor.displayName} · کد هنرجو: {selected.student.nationalId}</div></div>
                <div className="admin-extracted-managecounseling-51">
                  {messagesLoading ? <p className="admin-extracted-managecounseling-52">در حال دریافت تاریخچه…</p> : messages.length === 0 ? <p className="admin-extracted-managecounseling-53">هنوز پیامی ثبت نشده است.</p> : messages.map(message => <div key={message.id} className="admin-extracted-managecounseling-54">{message.content && <div className="admin-extracted-managecounseling-55">{message.content}</div>}
                    {message.attachmentName && <a href={`/api/counseling/conversations/${selectedConversation}/messages/${message.id}/attachment`} className="admin-extracted-managecounseling-56"><Paperclip size={14}/><span className="admin-extracted-managecounseling-57">{message.attachmentName}<small className="admin-extracted-managecounseling-58">{message.attachmentSize ? (message.attachmentSize / 1024 / 1024).toFixed(2) + ' MB' : 'پیوست'}</small></span><Download size={14}/></a>}
                    <div className="admin-extracted-managecounseling-59"><span>شناسه فرستنده: {message.senderUserId.slice(0, 8)}</span><time>{dateLabel(message.createdAt)}</time></div></div>)}
                </div>
              </>}
            </div>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h3 className="admin-extracted-managecounseling-60"><ShieldCheck size={16} color="var(--admin-accent)"/> تاریخچه تخصیص‌ها</h3>
        {assignments.length === 0 ? <p className="admin-extracted-managecounseling-61">هنوز تخصیصی ثبت نشده است.</p> : <><div className="admin-extracted-managecounseling-62"><table className="admin-extracted-managecounseling-63"><thead><tr>{['هنرجو','مشاور','شروع مسئولیت','پایان مسئولیت','ثبت‌کننده'].map(label => <th key={label} className="admin-extracted-managecounseling-64">{label}</th>)}</tr></thead><tbody>{visibleAssignments.map(item => <tr key={item.id}><td className="admin-extracted-managecounseling-65">{item.student.fullName}<div className="admin-extracted-managecounseling-66">{item.student.nationalId}</div></td><td className="admin-extracted-managecounseling-67">{item.counselor.displayName}</td><td className="admin-extracted-managecounseling-68">{dateLabel(item.startedAt)}</td><td className="admin-extracted-managecounseling-69">{item.endedAt ? dateLabel(item.endedAt) : <span className="admin-extracted-managecounseling-70">فعال</span>}</td><td className="admin-extracted-managecounseling-71">{item.assignedBy.username}</td></tr>)}</tbody></table></div>
          <div className="counseling-assignment-pagination"><span>نمایش {(assignmentPage - 1) * assignmentPageSize + 1} تا {Math.min(assignmentPage * assignmentPageSize, assignments.length)} از {assignments.length} تخصیص</span><div><span>صفحه {assignmentPage} از {assignmentPageCount}</span><button type="button" disabled={assignmentPage <= 1} onClick={() => setAssignmentPage(page => Math.max(1, page - 1))}>صفحه قبل</button><button type="button" disabled={assignmentPage >= assignmentPageCount} onClick={() => setAssignmentPage(page => Math.min(assignmentPageCount, page + 1))}>صفحه بعد</button></div></div></>}
      </section>
    </div>
  );
};
