import React, { useEffect, useState } from 'react';
import { compareJalali, getTehranTodayJalali, jalaliMonthLength, jalaliToTehranDate, toGregorian } from '../../utils/jalali';
import { CalendarDays, Download, ExternalLink, Link2, Pencil, Plus, RefreshCw, Sparkles, Users } from 'lucide-react';
import '../../styles/AdminMockExams.css';

type MockExamStatus = 'DRAFT' | 'SCHEDULED' | 'LINK_AVAILABLE' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

interface StudentOption {
  id: string;
  fullName: string;
  nationalId: string;
  academicLevel?: 'MASTER' | 'DOCTORATE' | '';
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
  const [participantGroup, setParticipantGroup] = useState<'ALL' | 'MASTER' | 'DOCTORATE'>('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'MASTER' | 'DOCTORATE'>('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = getTehranTodayJalali();
  const [calendarMonth, setCalendarMonth] = useState({ jy: today.jy, jm: today.jm });
  const [selectedDate, setSelectedDate] = useState<{ jy: number; jm: number; jd: number } | null>(null);
  const [hour, setHour] = useState('10');
  const [minute, setMinute] = useState('00');
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
              academicLevel: student.academicLevel ?? '',
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

  const getExamLevel = (level: string): 'MASTER' | 'DOCTORATE' | 'OTHER' => {
    if (/دکتری|دکترا|دکتور|doctor/i.test(level)) return 'DOCTORATE';
    if (/ارشد|کارشناسی ارشد|master/i.test(level)) return 'MASTER';
    return 'OTHER';
  };

  const getJalaliYear = (date: string) => new Intl.DateTimeFormat('en-US-u-ca-persian', {
    timeZone: 'Asia/Tehran', year: 'numeric',
  }).format(new Date(date));

  const availableYears = Array.from(new Set(exams.map(exam => getJalaliYear(exam.examDate)))).sort((a, b) => Number(b) - Number(a));
  const filteredExams = exams.filter(exam => {
    const levelMatches = levelFilter === 'ALL' || getExamLevel(exam.level) === levelFilter;
    const yearMatches = yearFilter === 'ALL' || getJalaliYear(exam.examDate) === yearFilter;
    return levelMatches && yearMatches;
  });
  const completedCount = exams.filter(exam => exam.status === 'COMPLETED').length;
  const cancelledCount = exams.filter(exam => exam.status === 'CANCELLED').length;
  const remainingCount = exams.filter(exam => !['COMPLETED', 'CANCELLED'].includes(exam.status)).length;

  const exportExams = () => {
    const headers = ['عنوان آزمون', 'مقطع', 'رشته', 'تاریخ', 'وضعیت', 'تعداد هنرجویان', 'لینک آزمون'];
    const rows = filteredExams.map(exam => [
      exam.title,
      exam.level,
      exam.field,
      new Date(exam.examDate).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }),
      statusLabels[exam.status],
      String(exam.participants.length),
      exam.examUrl ?? '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(value => {
      const safe = String(value).replace(/"/g, '""');
      return '"' + safe + '"';
    }).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'shamseh-mock-exams.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

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
    setSelectedDate(null);
    setHour('10');
    setMinute('00');
  };

  const editExam = (exam: MockExam) => {
    setEditingId(exam.id);
    setForm({
      title: exam.title,
      level: exam.level,
      field: exam.field,
      examDate: exam.examDate,
      examUrl: exam.examUrl ?? '',
      status: exam.status,
    });
    const examDate = new Date(exam.examDate);
    const jalali = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(examDate);
    const jy = Number(jalali.find(p => p.type === 'year')?.value);
    const jm = Number(jalali.find(p => p.type === 'month')?.value);
    const jd = Number(jalali.find(p => p.type === 'day')?.value);
    setSelectedDate({ jy, jm, jd });
    const timeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(examDate);
    setHour(timeParts.find(p => p.type === 'hour')?.value ?? '10');
    setMinute(timeParts.find(p => p.type === 'minute')?.value ?? '00');
    setCalendarMonth({ jy, jm });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.level || !form.field || !selectedDate) {
      setError('عنوان، مقطع، رشته و تاریخ آزمون را کامل کنید.');
      return;
    }

    const h = Number(hour);
    const m = Number(minute);
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      setError('ساعت واردشده معتبر نیست.');
      return;
    }

    const examDate = jalaliToTehranDate(selectedDate.jy, selectedDate.jm, selectedDate.jd, h, m);
    if (examDate <= new Date()) {
      setError('زمان آزمون باید در آینده باشد.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        level: form.level,
        field: form.field,
        examDate: examDate.toISOString(),
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
      setSelectedDate(null);
      setCalendarOpen(false);
    } catch {
      setError('ذخیره آزمون انجام نشد. اطلاعات واردشده و اتصال به سرور را بررسی کنید.');
    } finally {
      setSaving(false);
    }
  };

  const openCalendar = () => {
    const base = selectedDate || { jy: today.jy, jm: today.jm, jd: today.jd };
    setCalendarMonth({ jy: base.jy, jm: base.jm });
    setCalendarOpen(true);
  };

  const selectDay = (jd: number) => {
    setSelectedDate({ ...calendarMonth, jd });
  };

  const monthNames = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const weekdays = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
  const firstGregorian = toGregorian(calendarMonth.jy, calendarMonth.jm, 1);
  const firstWeekday = (new Date(Date.UTC(firstGregorian.gy, firstGregorian.gm - 1, firstGregorian.gd)).getUTCDay() + 1) % 7;
  const days = Array.from({ length: firstWeekday + jalaliMonthLength(calendarMonth.jy, calendarMonth.jm) }, (_, i) => i < firstWeekday ? null : i - firstWeekday + 1);

  const shiftMonth = (delta: number) => {
    let jy = calendarMonth.jy;
    let jm = calendarMonth.jm + delta;
    if (jm < 1) { jm = 12; jy -= 1; }
    if (jm > 12) { jm = 1; jy += 1; }
    setCalendarMonth({ jy, jm });
  };

  const isPast = (jd: number) => compareJalali({ jy: calendarMonth.jy, jm: calendarMonth.jm, jd }, today) < 0;
  const isSelected = (jd: number) => selectedDate?.jy === calendarMonth.jy && selectedDate?.jm === calendarMonth.jm && selectedDate?.jd === jd;

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
    <div className="admin-legacy-page admin-mock-exams-page" style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', direction: 'rtl' }}>
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

      <div className="mock-exam-dashboard">
        <div className="mock-exam-stats">
          <div className="mock-exam-stat"><span>کل آزمون‌ها</span><strong>{exams.length}</strong></div>
          <div className="mock-exam-stat"><span>برگزارشده</span><strong>{completedCount}</strong></div>
          <div className="mock-exam-stat"><span>باقی‌مانده</span><strong>{remainingCount}</strong></div>
          <div className="mock-exam-stat"><span>لغوشده</span><strong>{cancelledCount}</strong></div>
        </div>
      </div>

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
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={openCalendar}
                style={{ ...input, flex: 1, minWidth: 180, textAlign: 'right', cursor: 'pointer' }}
              >
                {selectedDate ? `${selectedDate.jd} ${monthNames[selectedDate.jm - 1]} ${selectedDate.jy}` : 'انتخاب تاریخ شمسی'}
              </button>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <select value={hour} onChange={e => setHour(e.target.value)} style={{ ...input, width: 72 }}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i).padStart(2,'0')}>{String(i).padStart(2,'0')}</option>)}
                </select>
                <span style={{ color: '#888', fontWeight: 800 }}>:</span>
                <select value={minute} onChange={e => setMinute(e.target.value)} style={{ ...input, width: 72 }}>
                  {['00','15','30','45'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
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

      {calendarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setCalendarOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 'min(390px, 100%)', background: '#141419', border: '1px solid #333', borderRadius: 18, padding: 18, boxShadow: '0 20px 60px rgba(0,0,0,.45)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button type="button" onClick={() => shiftMonth(1)} style={calendarNavButton}>‹</button>
              <strong style={{ fontSize: 14 }}>{monthNames[calendarMonth.jm - 1]} {calendarMonth.jy}</strong>
              <button type="button" onClick={() => shiftMonth(-1)} style={calendarNavButton}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, textAlign: 'center' }}>
              {weekdays.map(day => <div key={day} style={{ color: '#888', fontSize: 10, padding: '6px 0' }}>{day}</div>)}
              {days.map((jd, i) => jd === null ? <div key={`empty-${i}`} /> : (
                <button
                  type="button"
                  key={jd}
                  disabled={isPast(jd)}
                  onClick={() => selectDay(jd)}
                  style={{
                    height: 40,
                    borderRadius: 9,
                    border: isSelected(jd) ? '1px solid #38bdf8' : '1px solid transparent',
                    background: isSelected(jd) ? 'rgba(56,189,248,.16)' : 'transparent',
                    color: isPast(jd) ? '#444' : isSelected(jd) ? '#38bdf8' : '#fff',
                    cursor: isPast(jd) ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    fontWeight: isSelected(jd) ? 900 : 500,
                  }}
                >{jd}</button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid #26262d', paddingTop: 14 }}>
              <span style={{ color: '#888', fontSize: 10 }}>روزهای گذشته قابل انتخاب نیستند</span>
              <button type="button" onClick={() => setCalendarOpen(false)} style={{ background: '#38bdf8', color: '#071018', border: 0, padding: '8px 15px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: 11 }}>تأیید تاریخ</button>
            </div>
          </div>
        </div>
      )}

      <div className="mock-exam-dashboard">

        <div style={card} className="mock-exam-list-card">
          <div className="mock-exam-list-head">
            <div style={sectionTitle}>
              <CalendarDays size={17} color="#ff3366" />
              آزمون‌های ثبت‌شده ({filteredExams.length} از {exams.length})
            </div>
            <button type="button" onClick={exportExams} style={secondaryButton} disabled={filteredExams.length === 0}>
              <Download size={14} /> خروجی Excel
            </button>
          </div>
          <div className="mock-exam-filters">
            <label>مقطع
              <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as typeof levelFilter)}>
                <option value="ALL">همه مقاطع</option>
                <option value="MASTER">ارشد</option>
                <option value="DOCTORATE">دکتری</option>
              </select>
            </label>
            <label>سال
              <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                <option value="ALL">همه سال‌ها</option>
                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </div>
          {loading ? (
            <p style={muted}>در حال دریافت اطلاعات...</p>
          ) : exams.length === 0 ? (
            <p style={muted}>هنوز آزمونی تعریف نشده است.</p>
          ) : filteredExams.length === 0 ? (
            <p style={muted}>با فیلترهای انتخاب‌شده آزمونی پیدا نشد.</p>
          ) : (
          <div className="mock-exam-scroll-list">
            {filteredExams.map((exam) => (
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
                    <button onClick={() => {
                        if (participantExamId === exam.id) {
                          setParticipantExamId(null);
                        } else {
                          setParticipantExamId(exam.id);
                          setParticipantGroup(/دکتری|دکترا/i.test(exam.level) ? 'DOCTORATE' : /ارشد/i.test(exam.level) ? 'MASTER' : 'ALL');
                        }
                      }} style={secondaryButton}>
                      <Users size={14} /> شرکت‌کنندگان
                    </button>
                  </div>
                </div>

                {participantExamId === exam.id && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 14 }}>
                    <div style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
                      انتخاب هنرجویان ثبت‌نام‌شده در این آزمون
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        {([
                          ['ALL', 'همه'],
                          ['MASTER', 'ارشد'],
                          ['DOCTORATE', 'دکتری'],
                        ] as const).map(([value, label]) => {
                          const count = value === 'ALL'
                            ? students.length
                            : students.filter(student => student.academicLevel === value).length;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setParticipantGroup(value)}
                              style={{
                                border: participantGroup === value ? '1px solid #6D001A' : '1px solid rgba(255,255,255,.08)',
                                background: participantGroup === value ? 'rgba(109,0,26,.3)' : 'rgba(255,255,255,.04)',
                                color: '#fff',
                                padding: '7px 11px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 10,
                                fontWeight: 800,
                              }}
                            >
                              {label} ({count})
                            </button>
                          );
                        })}
                      </div>
                      <span style={{ color: '#34d399', fontSize: 11, fontWeight: 800 }}>
                        {exam.participants.length} نفر انتخاب شده
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8 }}>
                      {students
                        .filter(student => {
                          if (participantGroup === 'ALL') return true;
                          return student.academicLevel === participantGroup;
                        })
                        .map((student) => {
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
                              <div>{student.fullName}</div>
                              <div style={{ color: '#64748b', fontSize: 9, marginTop: 4 }}>
                                {student.nationalId} · {student.academicLevel === 'MASTER' ? 'ارشد' : student.academicLevel === 'DOCTORATE' ? 'دکتری' : 'مقطع نامشخص'}
                              </div>
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

const calendarNavButton: React.CSSProperties = {
  background: '#1d1d24',
  color: '#fff',
  border: '1px solid #333',
  borderRadius: 8,
  width: 38,
  height: 38,
  cursor: 'pointer',
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
