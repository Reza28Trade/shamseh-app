import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, Link2, Pencil, Plus, RefreshCw, Sparkles } from 'lucide-react';

type MockExamStatus = 'DRAFT' | 'SCHEDULED' | 'LINK_AVAILABLE' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

interface CourseOption {
  id: string;
  title: string;
}

interface MockExam {
  id: string;
  title: string;
  level: string;
  field: string;
  description?: string | null;
  examDate: string;
  examUrl?: string | null;
  status: MockExamStatus;
  courses: { courseId: string; course: CourseOption }[];
}

const statusLabels: Record<MockExamStatus, string> = {
  DRAFT: 'پیش‌نویس',
  SCHEDULED: 'زمان‌بندی‌شده',
  LINK_AVAILABLE: 'لینک فعال',
  LIVE: 'در حال برگزاری',
  COMPLETED: 'برگزارشده',
  CANCELLED: 'لغوشده',
};

export const ManageMockExams: React.FC = () => {
  const [exams, setExams] = useState<MockExam[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    level: '',
    field: '',
    description: '',
    examDate: '',
    examUrl: '',
    status: 'DRAFT' as MockExamStatus,
    courseIds: [] as string[],
  });

  const selectedCourseTitles = useMemo(
    () => courses.filter((course) => form.courseIds.includes(course.id)).map((course) => course.title),
    [courses, form.courseIds],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [examResponse, courseResponse] = await Promise.all([
        fetch('/api/admin/mock-exams', { credentials: 'include' }),
        fetch('/api/courses', { credentials: 'include' }),
      ]);
      if (!examResponse.ok || !courseResponse.ok) {
        throw new Error('خطا در دریافت اطلاعات');
      }
      setExams(await examResponse.json());
      const courseData = await courseResponse.json();
      setCourses(Array.isArray(courseData) ? courseData.map((course) => ({ id: course.id, title: course.title })) : []);
    } catch {
      setError('دریافت اطلاعات آزمون‌ها انجام نشد. اتصال به سرور را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      level: '',
      field: '',
      description: '',
      examDate: '',
      examUrl: '',
      status: 'DRAFT',
      courseIds: [],
    });
  };

  const editExam = (exam: MockExam) => {
    setEditingId(exam.id);
    setForm({
      title: exam.title,
      level: exam.level,
      field: exam.field,
      description: exam.description ?? '',
      examDate: exam.examDate.slice(0, 16),
      examUrl: exam.examUrl ?? '',
      status: exam.status,
      courseIds: exam.courses.map((item) => item.courseId),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.level || !form.field || !form.examDate) return;

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        level: form.level,
        field: form.field,
        description: form.description || undefined,
        examDate: new Date(form.examDate).toISOString(),
        examUrl: form.examUrl || undefined,
        status: form.status,
        courseIds: form.courseIds.length ? form.courseIds : undefined,
      };

      const response = await fetch(
        editingId ? `/api/admin/mock-exams/${editingId}` : '/api/admin/mock-exams',
        {
          method: editingId ? 'PATCH' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || 'خطا در ذخیره آزمون');
      }

      await load();
      resetForm();
    } catch {
      setError('ذخیره آزمون انجام نشد. اطلاعات واردشده و اتصال به سرور را بررسی کنید.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    setForm((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((id) => id !== courseId)
        : [...current.courseIds, courseId],
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', direction: 'rtl' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(109,0,26,.22), rgba(10,10,10,.85))',
        border: '1px solid rgba(109,0,26,.4)',
        padding: '24px 28px',
        borderRadius: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
      }}>
        <div>
          <h2 style={{ color: '#fff', margin: '0 0 6px', fontSize: 20, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Sparkles size={20} color="#ff3366" />
            مدیریت آزمون‌های آزمایشی
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 12 }}>
            Shamseh فقط اطلاعات آزمون و لینک ورود به سامانه آزمون را مدیریت می‌کند.
          </p>
        </div>
        <button onClick={() => void load()} style={secondaryButton}>
          <RefreshCw size={15} /> به‌روزرسانی
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <form onSubmit={submit} style={card}>
        <div style={sectionTitle}><Plus size={17} color="#ff3366" /> {editingId ? 'ویرایش آزمون' : 'تعریف آزمون جدید'}</div>

        <div style={grid}>
          <Field label="عنوان آزمون *">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: آزمون آزمایشی مهر" style={input} required />
          </Field>
          <Field label="مقطع *">
            <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="مثال: ارشد" style={input} required />
          </Field>
          <Field label="رشته *">
            <input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="مثال: پژوهش هنر" style={input} required />
          </Field>
          <Field label="تاریخ و ساعت آزمون *">
            <input type="datetime-local" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} style={input} required />
          </Field>
          <Field label="وضعیت">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MockExamStatus })} style={input}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="لینک سایت آزمون">
            <input type="url" value={form.examUrl} onChange={(e) => setForm({ ...form, examUrl: e.target.value })} placeholder="https://exam.example.ir/..." style={input} />
          </Field>
        </div>

        <Field label="توضیحات">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="توضیحات قابل نمایش برای هنرجو..." style={{ ...input, resize: 'vertical' }} />
        </Field>

        <div>
          <label style={label}>دوره‌های مرتبط</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => toggleCourse(course.id)}
                style={{
                  textAlign: 'right',
                  padding: '12px 14px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  color: '#fff',
                  background: form.courseIds.includes(course.id) ? 'rgba(109,0,26,.35)' : 'rgba(20,20,25,.8)',
                  border: form.courseIds.includes(course.id) ? '1px solid #6D001A' : '1px solid rgba(255,255,255,.08)',
                }}
              >
                {course.title}
              </button>
            ))}
          </div>
          {!!selectedCourseTitles.length && (
            <p style={{ color: '#94a3b8', fontSize: 11, margin: '10px 0 0' }}>
              دوره‌های انتخاب‌شده: {selectedCourseTitles.join('، ')}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
          {editingId && <button type="button" onClick={resetForm} style={secondaryButton}>انصراف</button>}
          <button type="submit" disabled={saving} style={primaryButton}>
            {saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ثبت آزمون'}
          </button>
        </div>
      </form>

      <div style={card}>
        <div style={sectionTitle}><CalendarDays size={17} color="#ff3366" /> آزمون‌های تعریف‌شده ({exams.length})</div>
        {loading ? (
          <p style={muted}>در حال دریافت اطلاعات...</p>
        ) : exams.length === 0 ? (
          <p style={muted}>هنوز آزمونی تعریف نشده است.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {exams.map((exam) => (
              <div key={exam.id} style={{
                padding: 16,
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,.07)',
                background: 'rgba(20,20,25,.75)',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#fff', fontSize: 14 }}>{exam.title}</strong>
                    <span style={badge}>{statusLabels[exam.status]}</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 8 }}>
                    {exam.level} · {exam.field} · {new Date(exam.examDate).toLocaleString('fa-IR')}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 5 }}>
                    {exam.courses.length ? exam.courses.map((item) => item.course.title).join('، ') : 'بدون دوره مرتبط'}
                  </div>
                  {exam.examUrl && (
                    <a href={exam.examUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
                      <Link2 size={13} /> لینک سایت آزمون <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <button onClick={() => editExam(exam)} style={secondaryButton}>
                  <Pencil size={14} /> ویرایش
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

const label: React.CSSProperties = { color: '#94a3b8', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 9 };
const labelStyle: React.CSSProperties = { ...label };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'rgba(20,20,25,.85)', border: '1px solid rgba(255,255,255,.09)', color: '#fff', padding: '11px 13px', borderRadius: 11, outline: 'none', fontSize: 12 };
const card: React.CSSProperties = { background: 'rgba(14,14,17,.75)', border: '1px solid rgba(255,255,255,.08)', padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 18 };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 };
const sectionTitle: React.CSSProperties = { color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: 12 };
const muted: React.CSSProperties = { color: '#64748b', fontSize: 12, textAlign: 'center', padding: 20 };
const badge: React.CSSProperties = { fontSize: 10, color: '#ffb4c4', background: 'rgba(109,0,26,.25)', padding: '3px 8px', borderRadius: 7 };
const primaryButton: React.CSSProperties = { border: 0, borderRadius: 11, padding: '11px 18px', background: 'linear-gradient(135deg,#6D001A,#a21c3a)', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 13px', background: 'rgba(255,255,255,.04)', color: '#e2e8f0', fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const errorBox: React.CSSProperties = { background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#fca5a5', padding: '12px 15px', borderRadius: 12, fontSize: 12 };
