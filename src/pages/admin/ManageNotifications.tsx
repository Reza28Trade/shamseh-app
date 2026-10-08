import React, { useEffect, useState } from 'react';
import { Bell, Send, Users, BookOpen, Globe } from 'lucide-react';

type TargetType = 'GLOBAL' | 'COURSE' | 'STUDENT';
type NotificationType = 'GENERAL' | 'IMPORTANT' | 'CLASS_CANCELLED' | 'CLASS_POSTPONED' | 'NEW_FILE' | 'MOCK_EXAM' | 'MOCK_EXAM_DATE_CHANGED' | 'MOCK_EXAM_LINK_AVAILABLE';

interface CourseOption { id: string; title: string; professor: string; status: string; }
interface StudentOption { id: string; fullName: string; nationalId: string; }

const types: { value: NotificationType; label: string }[] = [
  { value: 'GENERAL', label: 'عمومی' }, { value: 'IMPORTANT', label: 'مهم' },
  { value: 'CLASS_CANCELLED', label: 'لغو کلاس' }, { value: 'CLASS_POSTPONED', label: 'تغییر زمان کلاس' },
  { value: 'NEW_FILE', label: 'فایل جدید' }, { value: 'MOCK_EXAM', label: 'آزمون آزمایشی' },
  { value: 'MOCK_EXAM_DATE_CHANGED', label: 'تغییر تاریخ آزمون' }, { value: 'MOCK_EXAM_LINK_AVAILABLE', label: 'لینک آزمون' },
];

export const ManageNotifications: React.FC = () => {
  const [targetType, setTargetType] = useState<TargetType>('GLOBAL');
  const [courseId, setCourseId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState<NotificationType>('GENERAL');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [coursesRes, studentsRes] = await Promise.all([
          fetch('/api/courses', { credentials: 'include' }),
          fetch('/api/admin/students', { credentials: 'include' }),
        ]);
        if (!coursesRes.ok || !studentsRes.ok) throw new Error('دریافت گیرندگان انجام نشد.');
        const courseData = await coursesRes.json();
        const studentData = await studentsRes.json();
        setCourses(courseData);
        setStudents(studentData.map((x: any) => ({
          id: x.student?.id ?? x.id,
          fullName: x.student?.fullName ?? x.fullName,
          nationalId: x.student?.nationalId ?? x.nationalId,
        })));
      } catch (e) {
        setMessage({ text: e instanceof Error ? e.message : 'دریافت اطلاعات انجام نشد.', ok: false });
      } finally { setLoading(false); }
    };
    void load();
  }, []);

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || sending) return;
    if (targetType === 'COURSE' && !courseId) { setMessage({ text: 'دوره را انتخاب کنید.', ok: false }); return; }
    if (targetType === 'STUDENT' && !studentId) { setMessage({ text: 'هنرجو را انتخاب کنید.', ok: false }); return; }

    setSending(true); setMessage(null);
    try {
      const body = {
        title: title.trim(), content: content.trim(), type, targetType,
        ...(targetType === 'COURSE' ? { courseId } : {}),
        ...(targetType === 'STUDENT' ? { studentIds: [studentId] } : {}),
      };
      const res = await fetch('/api/admin/notifications', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'ارسال اطلاعیه انجام نشد.');
      }
      setTitle(''); setContent('');
      setMessage({ text: 'اطلاعیه با موفقیت ارسال شد.', ok: true });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'ارسال اطلاعیه انجام نشد.', ok: false });
    } finally { setSending(false); }
  };

  return (
    <div className="admin-legacy-page admin-notifications-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(109,0,26,.2), rgba(10,10,10,.8))', border: '1px solid rgba(109,0,26,.4)', padding: '24px 32px', borderRadius: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}><Bell size={20} color="#ff3366" /> ارسال اطلاعیه</h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>ارسال پیام عمومی، مخصوص یک دوره یا مخصوص یک هنرجو</p>
      </div>
      <div style={{ backgroundColor: 'rgba(14,14,17,.75)', border: '1px solid rgba(255,255,255,.08)', padding: '28px 32px', borderRadius: '24px' }}>
        {message && <div style={{ marginBottom: '16px', background: message.ok ? 'rgba(52,211,153,.1)' : 'rgba(239,68,68,.1)', color: message.ok ? '#34d399' : '#f87171', padding: '12px', borderRadius: '10px', fontSize: '12px' }}>{message.text}</div>}
        <form onSubmit={sendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>گیرنده</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
            {[
              ['GLOBAL', 'همه هنرجویان', Globe], ['COURSE', 'یک دوره', BookOpen], ['STUDENT', 'یک هنرجو', Users],
            ].map(([value, label, Icon]) => (
              <button key={value as string} type="button" onClick={() => setTargetType(value as TargetType)} style={{ padding: '12px', borderRadius: '12px', border: targetType === value ? '1px solid #ff3366' : '1px solid rgba(255,255,255,.08)', background: targetType === value ? 'rgba(109,0,26,.2)' : '#111116', color: targetType === value ? '#ff6688' : '#cbd5e1', cursor: 'pointer', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                {React.createElement(Icon as React.ElementType, { size: 15 })}{label as string}
              </button>
            ))}
          </div>
          {targetType === 'COURSE' && <select value={courseId} onChange={e => setCourseId(e.target.value)} required style={{ background: '#0e0e11', color: '#fff', padding: '12px', borderRadius: '10px', fontSize: '12px' }}><option value="">انتخاب دوره...</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title} — {c.professor}</option>)}</select>}
          {targetType === 'STUDENT' && <select value={studentId} onChange={e => setStudentId(e.target.value)} required style={{ background: '#0e0e11', color: '#fff', padding: '12px', borderRadius: '10px', fontSize: '12px' }}><option value="">انتخاب هنرجو...</option>{students.map(s => <option key={s.id} value={s.id}>{s.fullName} — {s.nationalId}</option>)}</select>}
          <select value={type} onChange={e => setType(e.target.value as NotificationType)} style={{ background: '#0e0e11', color: '#fff', padding: '12px', borderRadius: '10px', fontSize: '12px' }}>{types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان اطلاعیه" required style={{ background: '#0e0e11', color: '#fff', border: '1px solid rgba(255,255,255,.1)', padding: '12px 14px', borderRadius: '10px', fontSize: '12px' }} />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="متن اطلاعیه را بنویسید..." rows={5} required style={{ background: '#0e0e11', color: '#fff', border: '1px solid rgba(255,255,255,.1)', padding: '12px 14px', borderRadius: '10px', fontSize: '12px', resize: 'vertical' }} />
          <button type="submit" disabled={sending || loading} style={{ background: '#6D001A', color: '#fff', border: 0, padding: '13px', borderRadius: '11px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', opacity: sending || loading ? .6 : 1, display: 'flex', justifyContent: 'center', gap: '7px' }}><Send size={15} />{sending ? 'در حال ارسال...' : 'ارسال اطلاعیه'}</button>
        </form>
      </div>
    </div>
  );
};
