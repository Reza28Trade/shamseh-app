import React, { useEffect, useState } from 'react';
import { CalendarDays, ExternalLink, Link2, Pencil, Plus, RefreshCw, Sparkles, Users } from 'lucide-react';

type MockExamStatus = 'DRAFT' | 'SCHEDULED' | 'LINK_AVAILABLE' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

interface StudentOption {
  id: string;
  fullName: string;
  nationalId: string;
}

interface MockExamParticipant {
  student: StudentOption;
}

interface MockExam {
  id: string;
  title: string;
  level: string;
  field: string;
  examDate: string;
  examUrl?: string | null;
  status: MockExamStatus;
  participants: MockExamParticipant[];
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
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [participantExamId, setParticipantExamId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    level: '',
    field: '',
    examDate: '',
    examUrl: '',
    status: 'DRAFT' as MockExamStatus,
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [examResponse, studentResponse] = await Promise.all([
        fetch('/api/admin/mock-exams', { credentials: 'include' }),
        fetch('/api/admin/students', { credentials: 'include' }),
      ]);
      if (!examResponse.ok || !studentResponse.ok) {
        throw new Error('خطا در دریافت اطلاعات');
      }
      setExams(await examResponse.json());
      const studentData = await studentResponse.json();
      setStudents(
        Array.isArray(studentData)
          ? studentData.map((student) => ({
              id: student.id,
              fullName: student.fullName,
              nationalId: student.nationalId,
            }))
          : [],
      );
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
      examDate: '',
      examUrl: '',
      status: 'DRAFT',
    });
  };

  const editExam = (exam: MockExam) => {
    setEditingId(exam.id);
    setForm({
      title: exam.title,
      level: exam.level,
      field: exam.field,
      examDate: exam.examDate.slice(0, 16),
      examUrl: exam.examUrl ?? '',
      status: exam.status,
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
        examDate: new Date(form.examDate).toISOString(),
        examUrl: form.examUrl || undefined,
        status: form.status,
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

  const toggleParticipant = async (examId: string, studentId: string, selected: boolean) => {
    setError('');
    try {
      const response = await fetch(
        `/api/admin/mock-exams/${examId}/participants/${studentId}`,
        {
          method: selected ? 'DELETE' : 'POST',
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error('خطا در تغییر شرکت‌کننده');
      }
      await load();
    } catch {
      setError('تغییر شرکت‌کننده انجام نشد.');
    }
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
            Shamseh فقط اطلاعات آزمون، لینک و فهرست هنرجویان ثبت‌نام‌شده را مدیریت می‌کند.
          </p>
        </div>
        <button onClick={() => void load()} style={secondaryButton}>
          <RefreshCw size={15} /> به‌روزرسانی
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <form onSubmit={submit} style={card}>
        <div style={sectionTitle}>
          <Plus size={17} color="#ff3366" />
          {editingId ? 'ویرایش آزمون' : 'تعریف آزمون جدید'}
        </div>

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

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
          {editingId && <button type="button" onClick={resetForm} style={secondaryButton}>انصراف</button>}
          <button type="submit" disabled={saving} style={primaryButton}>
            {saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ثبت آزمون'}
          </button>
        </div>
      </form>

      <div style={card}>
        <div style={sectionTitle}>
          <CalendarDays size={17} color="#ff3366" />
          آزمون‌های تعریف‌شده ({exams.length})
        </div>
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
                gap: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                      <strong style={{ color: '#fff', fontSize: 14 }}>{exam.title}</strong>
                      <span style={badge}>{statusLabels[exam.status]}</span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 8 }}>
                      {exam.level} · {exam.field} · {new Date(exam.examDate).toLocaleString('fa-IR')}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users size={13} />
                      {exam.participants.length} هنرجوی ثبت‌نام‌شده
                    </div>
                    {exam.examUrl && (
                      <a href={exam.examUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
                        <Link2 size={13} /> لینک سایت آزمون <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => editExam(exam)} style={secondaryButton}>
                      <Pencil size={14} /> ویرایش
                    </button>
                    <button onClick={() => setParticipantExamId(participantExamId === exam.id ? null : exam.id)} style={secondaryButton}>
                      <Users size={14} /> شرکت‌کنندگان
                    </button>
                  </div>
                </div>

                {participantExamId === exam.id && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 14 }}>
                    <div style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
                      انتخاب هنرجویان ثبت‌نام‌شده در این آزمون
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8 }}>
                      {students.map((student) => {
                        const selected = exam.participants.some((item) => item.student.id === student.id);
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => void toggleParticipant(exam.id, student.id, selected)}
                            style={{
                              textAlign: 'right',
                              padding: '10px 12px',
                              borderRadius: 11,
                              cursor: 'pointer',
                              color: '#fff',
                              background: selected ? 'rgba(109,0,26,.35)' : 'rgba(20,20,25,.8)',
                              border: selected ? '1px solid #6D001A' : '1px solid rgba(255,255,255,.08)',
                            }}
                          >
                            {student.fullName} · {student.nationalId}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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

const labelStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 11,
  fontWeight: 700,
  display: 'block',
  marginBottom: 9,
};

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(20,20,25,.85)',
  border: '1px solid rgba(255,255,255,.09)',
  color: '#fff',
  padding: '11px 13px',
  borderRadius: 11,
  outline: 'none',
  fontSize: 12,
};

const card: React.CSSProperties = {
  background: 'rgba(14,14,17,.75)',
  border: '1px solid rgba(255,255,255,.08)',
  padding: 24,
  borderRadius: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
};

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
  gap: 16,
};

const sectionTitle: React.CSSProperties = {
  color: '#fff',
  fontSize: 14,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  borderBottom: '1px solid rgba(255,255,255,.06)',
  paddingBottom: 12,
};

const muted: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  textAlign: 'center',
  padding: 20,
};

const badge: React.CSSProperties = {
  fontSize: 10,
  color: '#ffb4c4',
  background: 'rgba(109,0,26,.25)',
  padding: '3px 8px',
  borderRadius: 7,
};

const primaryButton: React.CSSProperties = {
  border: 0,
  borderRadius: 11,
  padding: '11px 18px',
  background: 'linear-gradient(135deg,#6D001A,#a21c3a)',
  color: '#fff',
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 10,
  padding: '9px 13px',
  background: 'rgba(255,255,255,.04)',
  color: '#e2e8f0',
  fontWeight: 700,
  fontSize: 11,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const errorBox: React.CSSProperties = {
  background: 'rgba(239,68,68,.08)',
  border: '1px solid rgba(239,68,68,.2)',
  color: '#fca5a5',
  padding: '12px 15px',
  borderRadius: 12,
  fontSize: 12,
};
