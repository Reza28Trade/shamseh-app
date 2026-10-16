import React, { useEffect, useState } from 'react';
import { Bell, Send, Users, BookOpen, Globe, CalendarDays } from 'lucide-react';

type TargetType = 'GLOBAL' | 'COURSE' | 'STUDENT' | 'MOCK_EXAM';
type NotificationType = 'GENERAL' | 'IMPORTANT' | 'CLASS_CANCELLED' | 'CLASS_POSTPONED' | 'NEW_FILE' | 'MOCK_EXAM' | 'MOCK_EXAM_DATE_CHANGED' | 'MOCK_EXAM_LINK_AVAILABLE';

interface CourseOption { id: string; title: string; professor: string; status: string; }
interface StudentOption { id: string; fullName: string; nationalId: string; }
interface MockExamOption { id: string; title: string; level: string; field: string; examDate: string; participants: { student: { id: string; fullName: string; nationalId: string } }[]; }

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
  const [mockExamId, setMockExamId] = useState('');
  const [mockExams, setMockExams] = useState<MockExamOption[]>([]);
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
        const [coursesRes, studentsRes, examsRes] = await Promise.all([
          fetch('/api/courses', { credentials: 'include' }),
          fetch('/api/admin/students', { credentials: 'include' }),
          fetch('/api/admin/mock-exams', { credentials: 'include' }),
        ]);
        if (!coursesRes.ok || !studentsRes.ok || !examsRes.ok) throw new Error('دریافت گیرندگان انجام نشد.');
        const courseData = await coursesRes.json();
        const studentData = await studentsRes.json();
        const examData = await examsRes.json();
        setCourses(courseData);
        setMockExams(Array.isArray(examData) ? examData : []);
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
    const selectedMockExam = targetType === 'MOCK_EXAM' ? mockExams.find(exam => exam.id === mockExamId) : undefined;
    if (targetType === 'MOCK_EXAM' && !selectedMockExam) { setMessage({ text: 'آزمون آزمایشی را انتخاب کنید.', ok: false }); return; }
    const mockExamStudentIds = selectedMockExam?.participants.map(participant => participant.student.id) ?? [];
    if (targetType === 'MOCK_EXAM' && mockExamStudentIds.length === 0) { setMessage({ text: 'برای این آزمون هنوز هنرجویی ثبت‌نام نشده است.', ok: false }); return; }

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
    <div className="admin-legacy-page admin-notifications-page">
      <header className="notifications-page-head">
        <div>
          <span className="notifications-eyebrow"><Bell size={14} /> مرکز مدیریت شمسه</span>
          <h2><Bell size={20} /> ارسال اطلاعیه</h2>
          <p>ارسال پیام عمومی، مخصوص یک دوره یا مخصوص یک هنرجو</p>
        </div>
      </header>

      <section className="notifications-form-card">
        {message && <div className={`notifications-feedback ${message.ok ? 'is-success' : 'is-error'}`} role="status">{message.text}</div>}
        <form onSubmit={sendNotification} className="notifications-form">
          <div className="notifications-field">
            <label>گیرندگان اطلاعیه</label>
            <div className="notifications-target-grid">
              {[
                ['GLOBAL', 'همه هنرجویان', Globe],
                ['COURSE', 'یک دوره', BookOpen],
                ['STUDENT', 'یک هنرجو', Users], ['MOCK_EXAM', 'شرکت‌کنندگان آزمون', CalendarDays],
              ].map(([value, label, Icon]) => (
                <button
                  key={value as string}
                  type="button"
                  className={`notifications-target ${targetType === value ? 'is-active' : ''}`}
                  onClick={() => setTargetType(value as TargetType)}
                >
                  {React.createElement(Icon as React.ElementType, { size: 16 })}
                  {label as string}
                </button>
              ))}
            </div>
          </div>

          {targetType === 'COURSE' && (
            <div className="notifications-field">
              <label htmlFor="notification-course">دورهٔ موردنظر</label>
              <select id="notification-course" value={courseId} onChange={e => setCourseId(e.target.value)} required>
                <option value="">انتخاب دوره...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title} — {c.professor}</option>)}
              </select>
            </div>
          )}
          {targetType === 'MOCK_EXAM' && (
            <div className="notifications-field">
              <label htmlFor="notification-mock-exam">آزمون آزمایشی</label>
              <select id="notification-mock-exam" value={mockExamId} onChange={e => setMockExamId(e.target.value)} required>
                <option value="">انتخاب آزمون...</option>
                {mockExams.map(exam => <option key={exam.id} value={exam.id}>{exam.title} — {exam.level} · {exam.participants.length} شرکت‌کننده</option>)}
              </select>
              {mockExamId && <small className="notifications-recipient-hint">این اطلاعیه برای {mockExams.find(exam => exam.id === mockExamId)?.participants.length ?? 0} هنرجوی ثبت‌نام‌شده در همین آزمون ارسال می‌شود.</small>}
            </div>
          )}
          {targetType === 'STUDENT' && (
            <div className="notifications-field">
              <label htmlFor="notification-student">هنرجوی موردنظر</label>
              <select id="notification-student" value={studentId} onChange={e => setStudentId(e.target.value)} required>
                <option value="">انتخاب هنرجو...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.fullName} — {s.nationalId}</option>)}
              </select>
            </div>
          )}

          <div className="notifications-field">
            <label htmlFor="notification-type">نوع اطلاعیه</label>
            <select id="notification-type" value={type} onChange={e => setType(e.target.value as NotificationType)}>
              {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="notifications-field">
            <label htmlFor="notification-title">عنوان اطلاعیه</label>
            <input id="notification-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان اطلاعیه را بنویسید..." required />
          </div>
          <div className="notifications-field">
            <label htmlFor="notification-content">متن اطلاعیه</label>
            <textarea id="notification-content" value={content} onChange={e => setContent(e.target.value)} placeholder="متن اطلاعیه را بنویسید..." rows={5} required />
          </div>
          <div className="notifications-form-footer">
            <span>پیش از ارسال، گیرنده و متن اطلاعیه را بررسی کنید.</span>
            <button type="submit" className="notifications-submit" disabled={sending || loading}>
              <Send size={15} /> {sending ? 'در حال ارسال...' : 'ارسال اطلاعیه'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
