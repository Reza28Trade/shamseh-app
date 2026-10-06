import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, RefreshCw, Download, ChevronDown, ChevronUp, FileText, Link as LinkIcon, CalendarDays, X } from 'lucide-react';

type CourseStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
type FileType = 'PDF' | 'POWERPOINT' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LINK';

type Course = {
  id: string;
  title: string;
  professor: string;
  level: string | null;
  description: string | null;
  term: string | null;
  category: string | null;
  price: string | number | null;
  coverImage: string | null;
  status: CourseStatus;
  _count?: { enrollments: number; sessions: number; files: number };
};

type Session = {
  id: string;
  courseId: string;
  sessionNumber: number;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type CourseFile = {
  id: string;
  courseId: string;
  title: string;
  type: FileType;
  mimeType: string | null;
  fileSize: string | null;
  externalUrl: string | null;
  streamUrl: string | null;
};

const emptyCourse = {
  title: '', professor: '', level: '', description: '', term: '', category: '',
  price: '', coverImage: '', status: 'DRAFT' as CourseStatus,
};

const emptySession = {
  sessionNumber: '',
};

const emptyFile = {
  title: '', type: 'PDF' as FileType, externalUrl: '',
};

const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#0e0e11', color: '#fff',
  border: '1px solid rgba(255,255,255,.1)', padding: '11px 13px',
  borderRadius: 9, fontSize: 12, outline: 'none',
};

const button = (background: string, color = '#fff'): React.CSSProperties => ({
  background, color, border: '1px solid rgba(255,255,255,.1)', padding: '8px 11px',
  borderRadius: 8, cursor: 'pointer', fontSize: 11, display: 'inline-flex',
  alignItems: 'center', gap: 5,
});

const toDateTimeLocal = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const ManageCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState(emptyCourse);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, Session[]>>({});
  const [courseFiles, setCourseFiles] = useState<Record<string, CourseFile[]>>({});
  const [contentLoading, setContentLoading] = useState<Record<string, boolean>>({});
  const [sessionForm, setSessionForm] = useState(emptySession);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [fileForm, setFileForm] = useState(emptyFile);
  const [fileTarget, setFileTarget] = useState<{ courseId: string } | null>(null);
  const [fileSaving, setFileSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);


  const exportCourses = async () => {
    const response = await fetch('/api/admin/courses/export', { credentials: 'include' });
    if (!response.ok) { setError('خروجی Excel دوره‌ها دریافت نشد.'); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'courses.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadCourses = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/courses', { credentials: 'include' });
      if (!response.ok) throw new Error('دریافت دوره‌ها انجام نشد.');
      setCourses(await response.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'دریافت دوره‌ها انجام نشد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCourses(); }, []);

  const loadContent = async (courseId: string) => {
    setContentLoading(current => ({ ...current, [courseId]: true }));
    try {
      const [sessionsResponse, filesResponse] = await Promise.all([
        fetch(`/api/courses/${courseId}/sessions`, { credentials: 'include' }),
        fetch(`/api/courses/${courseId}/files`, { credentials: 'include' }),
      ]);
      if (!sessionsResponse.ok || !filesResponse.ok) throw new Error('دریافت جلسات یا فایل‌های دوره انجام نشد.');
      const [sessionData, fileData] = await Promise.all([sessionsResponse.json(), filesResponse.json()]);
      setSessions(current => ({ ...current, [courseId]: sessionData }));
      setCourseFiles(current => ({ ...current, [courseId]: fileData }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'دریافت محتوای دوره انجام نشد.');
    } finally {
      setContentLoading(current => ({ ...current, [courseId]: false }));
    }
  };

  const toggleCourse = async (courseId: string) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }
    setExpandedCourseId(courseId);
    if (!sessions[courseId]) await loadContent(courseId);
  };

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.professor.trim() || saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const body = {
        ...form,
        title: form.title.trim(),
        professor: form.professor.trim(),
        price: form.price === '' ? undefined : Number(form.price),
      };
      const url = editingId ? `/api/admin/courses/${editingId}` : '/api/admin/courses';
      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'ذخیره دوره انجام نشد.');
      setForm(emptyCourse); setEditingId(null);
      setSuccess(editingId ? 'دوره ویرایش شد.' : 'دوره ایجاد شد.');
      await loadCourses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ذخیره دوره انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const editCourse = (course: Course) => {
    setEditingId(course.id);
    setForm({
      title: course.title, professor: course.professor, level: course.level || '',
      description: course.description || '', term: course.term || '', category: course.category || '',
      price: course.price == null ? '' : String(course.price), coverImage: course.coverImage || '',
      status: course.status,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('آیا از حذف این دوره اطمینان دارید؟')) return;
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, { method: 'DELETE', credentials: 'include' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'حذف دوره انجام نشد.');
      if (expandedCourseId === courseId) setExpandedCourseId(null);
      await loadCourses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حذف دوره انجام نشد.');
    }
  };

  const startNewSession = () => {
    setEditingSessionId(null);
    setSessionForm(emptySession);
    setShowSessionForm(true);
  };

  const cancelSessionForm = () => {
    setEditingSessionId(null);
    setSessionForm(emptySession);
    setShowSessionForm(false);
  };

  const editSession = (session: Session) => {
    setEditingSessionId(session.id);
    setShowSessionForm(true);
    setSessionForm({ sessionNumber: String(session.sessionNumber) });
  };

  const saveSession = async (courseId: string) => {
    if (!sessionForm.sessionNumber || Number(sessionForm.sessionNumber) < 1 || sessionSaving) return;
    setSessionSaving(true); setError('');
    try {
      const body = { sessionNumber: Number(sessionForm.sessionNumber) };
      const url = editingSessionId
        ? `/api/admin/sessions/${editingSessionId}`
        : `/api/admin/courses/${courseId}/sessions`;
      const response = await fetch(url, {
        method: editingSessionId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'ذخیره جلسه انجام نشد.');
      setSessionForm(emptySession); setEditingSessionId(null); setShowSessionForm(false);
      await loadContent(courseId);
      await loadCourses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ذخیره جلسه انجام نشد.');
    } finally {
      setSessionSaving(false);
    }
  };

  const deleteSession = async (courseId: string, sessionId: string) => {
    if (!confirm('آیا از حذف این جلسه اطمینان دارید؟')) return;
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, { method: 'DELETE', credentials: 'include' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'حذف جلسه انجام نشد.');
      await loadContent(courseId);
      await loadCourses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حذف جلسه انجام نشد.');
    }
  };

  const openFileForm = (courseId: string) => {
    setFileTarget({ courseId });
    setFileForm(emptyFile);
    setSelectedFile(null);
  };

  const saveFile = async () => {
    if (!fileTarget || !fileForm.title.trim() || fileSaving) return;
    setFileSaving(true); setError('');
    try {
      const uploadUrl = `/api/admin/courses/${fileTarget.courseId}/files`;
      const linkUrl = `/api/admin/courses/${fileTarget.courseId}/files/link`;

      let response: Response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('title', fileForm.title.trim());
        formData.append('type', fileForm.type);
        formData.append('file', selectedFile);
        response = await fetch(uploadUrl, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
      } else {
        const externalUrl = fileForm.externalUrl.trim();
        if (!externalUrl) throw new Error('یک فایل از کامپیوتر انتخاب کنید یا لینک خارجی وارد کنید.');
        response = await fetch(linkUrl, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: fileForm.title.trim(),
            type: fileForm.type,
            externalUrl,
          }),
        });
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'افزودن فایل انجام نشد.');
      const created = data as CourseFile;
      setCourseFiles(current => ({ ...current, [fileTarget.courseId]: [created, ...(current[fileTarget.courseId] || [])] }));
      setFileTarget(null);
      setFileForm(emptyFile);
      setSelectedFile(null);
      await loadCourses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'افزودن فایل انجام نشد.');
    } finally {
      setFileSaving(false);
    }
  };

  const deleteFile = async (courseId: string, file: CourseFile) => {
    if (!confirm(`حذف «${file.title}»؟`)) return;
    try {
      const response = await fetch(`/api/admin/files/${file.id}`, { method: 'DELETE', credentials: 'include' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'حذف فایل انجام نشد.');
      setCourseFiles(current => ({ ...current, [courseId]: (current[courseId] || []).filter(item => item.id !== file.id) }));
      await loadCourses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حذف فایل انجام نشد.');
    }
  };

  const fileLabel = (type: FileType) => ({
    PDF: 'PDF', POWERPOINT: 'PowerPoint', AUDIO: 'صوتی', VIDEO: 'ویدئو', DOCUMENT: 'سند', LINK: 'لینک',
  }[type]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', boxSizing: 'border-box', direction: 'rtl' }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(109,0,26,.2),rgba(10,10,10,.8))', border: '1px solid rgba(109,0,26,.4)', padding: '24px 32px', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={20} color="#ff3366" /> مدیریت دوره‌ها
          </h2>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>دوره، جلسات و محتوای هر دوره از PostgreSQL مدیریت می‌شود</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => void exportCourses()} style={button('rgba(255,255,255,.06)')}><Download size={14} /> خروجی Excel</button><button onClick={() => void loadCourses()} style={button('rgba(255,255,255,.06)')}><RefreshCw size={14} /></button></div>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', padding: 12, borderRadius: 10, fontSize: 12 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(52,211,153,.1)', color: '#34d399', padding: 12, borderRadius: 10, fontSize: 12 }}>{success}</div>}

      <form onSubmit={saveCourse} style={{ background: 'rgba(14,14,17,.75)', border: '1px solid rgba(255,255,255,.08)', padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 15 }}>
        <h3 style={{ color: '#fff', fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}><Plus size={17} color="#ff3366" />{editingId ? 'ویرایش دوره' : 'ایجاد دوره جدید'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
          <input required placeholder="عنوان دوره" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={input} />
          <input required placeholder="نام استاد" value={form.professor} onChange={e => setForm({ ...form, professor: e.target.value })} style={input} />
          <input placeholder="مقطع تحصیلی" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} style={input} />
          <input placeholder="ترم" value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} style={input} />
          <input placeholder="دسته‌بندی" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={input} />
          <input type="number" min="0" placeholder="قیمت (تومان)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={input} />
          <input placeholder="آدرس تصویر جلد" value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} style={input} />
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CourseStatus })} style={input}>
            <option value="DRAFT">پیش‌نویس</option><option value="ACTIVE">فعال</option><option value="ARCHIVED">بایگانی</option>
          </select>
        </div>
        <textarea placeholder="توضیحات دوره" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...input, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={saving} type="submit" style={button('#6D001A')}>{saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ثبت دوره'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyCourse); }} style={button('transparent', '#94a3b8')}>انصراف</button>}
        </div>
      </form>

      <div style={{ background: 'rgba(14,14,17,.75)', border: '1px solid rgba(255,255,255,.08)', padding: 24, borderRadius: 24 }}>
        <h3 style={{ color: '#fff', fontSize: 15, margin: '0 0 16px' }}>دوره‌های ثبت‌شده ({courses.length})</h3>
        {loading ? <p style={{ color: '#94a3b8', fontSize: 12 }}>در حال دریافت...</p> :
          courses.length === 0 ? <p style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 20 }}>هنوز دوره‌ای ثبت نشده است.</p> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {courses.map(course => {
              const expanded = expandedCourseId === course.id;
              const courseSessions = sessions[course.id] || [];
              const files = courseFiles[course.id] || [];
              return (
                <div key={course.id} style={{ background: '#141419', border: '1px solid #222228', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: '#fff', fontSize: 13 }}>{course.title}</strong>
                        <p style={{ color: '#94a3b8', fontSize: 11, margin: '7px 0' }}>استاد: {course.professor}</p>
                        <div style={{ color: '#64748b', fontSize: 10 }}>هنرجو: {course._count?.enrollments ?? 0} · جلسه: {course._count?.sessions ?? 0} · فایل: {course._count?.files ?? 0}</div>
                      </div>
                      <span style={{ color: course.status === 'ACTIVE' ? '#34d399' : '#fbbf24', fontSize: 9 }}>{course.status}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                      <button type="button" onClick={() => void toggleCourse(course.id)} style={button('rgba(255,255,255,.06)')}>{expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} مدیریت جلسات و فایل‌ها</button>
                      <button type="button" onClick={() => editCourse(course)} style={button('rgba(56,189,248,.1)', '#38bdf8')}><Pencil size={12} /> ویرایش دوره</button>
                      <button type="button" onClick={() => void deleteCourse(course.id)} style={button('rgba(239,68,68,.1)', '#f87171')}><Trash2 size={12} /> حذف</button>
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ borderTop: '1px solid #222228', padding: 18, background: 'rgba(0,0,0,.15)' }}>
                      {contentLoading[course.id] ? <p style={{ color: '#94a3b8', fontSize: 12 }}>در حال دریافت محتوای دوره...</p> : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h4 style={{ color: '#fff', fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={14} /> جلسات ({courseSessions.length})</h4>
                            <button type="button" onClick={startNewSession} style={button('#6D001A')}><Plus size={12} /> جلسه جدید</button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 10 }}>
                            {courseSessions.map(session => (
                              <div key={session.id} style={{ background: '#0e0e11', border: '1px solid #25252b', borderRadius: 12, padding: 13 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                                  <strong style={{ color: '#fff', fontSize: 12 }}>جلسه {session.sessionNumber}</strong>
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                  <button type="button" onClick={() => editSession(session)} style={button('rgba(56,189,248,.1)', '#38bdf8')}><Pencil size={11} /> ویرایش شماره</button>
                                  <button type="button" onClick={() => void deleteSession(course.id, session.id)} style={button('rgba(239,68,68,.1)', '#f87171')}><Trash2 size={11} /></button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {showSessionForm && editingSessionId && (
                            <div style={{ marginTop: 14, padding: 15, background: '#111116', border: '1px solid #2b2b32', borderRadius: 12 }}>
                              <h4 style={{ color: '#fff', fontSize: 12, margin: '0 0 10px' }}>ویرایش جلسه</h4>
                              <SessionForm form={sessionForm} setForm={setSessionForm} saving={sessionSaving} onSave={() => void saveSession(course.id)} onCancel={cancelSessionForm} />
                            </div>
                          )}

                          {!editingSessionId && showSessionForm && (
                            <div style={{ marginTop: 14, padding: 15, background: '#111116', border: '1px solid #2b2b32', borderRadius: 12 }}>
                              <h4 style={{ color: '#fff', fontSize: 12, margin: '0 0 10px' }}>جلسه جدید</h4>
                              <SessionForm form={sessionForm} setForm={setSessionForm} saving={sessionSaving} onSave={() => void saveSession(course.id)} onCancel={cancelSessionForm} />
                            </div>
                          )}

                          <div style={{ marginTop: 20, borderTop: '1px solid #25252b', paddingTop: 15 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <h4 style={{ color: '#fff', fontSize: 12, margin: 0 }}><FileText size={13} style={{ verticalAlign: 'middle', marginLeft: 5 }} /> فایل‌های عمومی دوره ({files.length})</h4>
                              <button type="button" onClick={() => openFileForm(course.id)} style={button('rgba(109,0,26,.35)')}><Plus size={11} /> افزودن فایل</button>
                            </div>
                            {files.length === 0 ? <p style={{ color: '#64748b', fontSize: 10 }}>فایل عمومی برای این دوره ثبت نشده است.</p> :
                              files.map(file => (
                                <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #1e1e24' }}>
                                  <span style={{ color: '#cbd5e1', fontSize: 10 }}>{file.title} · {fileLabel(file.type)}</span>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {(file.streamUrl || file.externalUrl) && <a href={file.streamUrl || file.externalUrl || '#'} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontSize: 9 }}><LinkIcon size={10} style={{ verticalAlign: 'middle', marginLeft: 3 }} />باز کردن</a>}
                                    <button type="button" onClick={() => void deleteFile(course.id, file)} style={{ background: 'transparent', border: 0, color: '#f87171', cursor: 'pointer' }}><Trash2 size={11} /></button>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        }
      </div>

      {fileTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ width: 'min(520px,100%)', background: '#15151a', border: '1px solid #2b2b32', borderRadius: 18, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 14 }}>افزودن فایل</h3>
              <button type="button" onClick={() => setFileTarget(null)} style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="عنوان فایل" value={fileForm.title} onChange={e => setFileForm({ ...fileForm, title: e.target.value })} style={input} />
              <select value={fileForm.type} onChange={e => setFileForm({ ...fileForm, type: e.target.value as FileType })} style={input}>
                <option value="PDF">PDF</option><option value="POWERPOINT">PowerPoint</option><option value="AUDIO">صوتی</option><option value="VIDEO">ویدئو</option><option value="DOCUMENT">سند</option><option value="LINK">لینک</option>
              </select>
              <label style={{ color: '#cbd5e1', fontSize: 11 }}>انتخاب فایل از کامپیوتر (حداکثر 100MB)</label>
              <input
                type="file"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                style={{ ...input, padding: 8 }}
              />
              {selectedFile && <div style={{ color: '#94a3b8', fontSize: 10 }}>فایل انتخاب‌شده: {selectedFile.name}</div>}
              <input placeholder="یا لینک خارجی (اختیاری)" value={fileForm.externalUrl} onChange={e => setFileForm({ ...fileForm, externalUrl: e.target.value })} style={input} disabled={!!selectedFile} />
              <button type="button" disabled={fileSaving} onClick={() => void saveFile()} style={button('#6D001A')}>{fileSaving ? 'در حال آپلود...' : selectedFile ? 'آپلود و ثبت فایل' : 'ثبت لینک'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type SessionFormProps = {
  form: typeof emptySession;
  setForm: React.Dispatch<React.SetStateAction<typeof emptySession>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

const SessionForm: React.FC<SessionFormProps> = ({ form, setForm, saving, onSave, onCancel }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <input type="number" min="1" placeholder="شماره جلسه" value={form.sessionNumber} onChange={e => setForm({ ...form, sessionNumber: e.target.value })} style={input} />
    <div style={{ display: 'flex', gap: 7 }}>
      <button type="button" disabled={saving} onClick={onSave} style={button('#6D001A')}>{saving ? 'در حال ذخیره...' : 'ذخیره جلسه'}</button>
      <button type="button" onClick={onCancel} style={button('transparent', '#94a3b8')}>انصراف</button>
    </div>
  </div>
);
