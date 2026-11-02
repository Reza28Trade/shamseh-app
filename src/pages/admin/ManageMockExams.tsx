import React, { useEffect, useState } from 'react';
import { compareJalali, getTehranTodayJalali, jalaliMonthLength, jalaliToTehranDate, toGregorian } from '../../utils/jalali';
import { CalendarDays, Check, Download, ExternalLink, Link2, Pencil, Plus, Search, Users } from 'lucide-react';
import '../../styles/admin/pages/ManageMockExams.css';

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
  const [participantSearch, setParticipantSearch] = useState('');
  const [pendingParticipantIds, setPendingParticipantIds] = useState<string[]>([]);
  const [participantSaving, setParticipantSaving] = useState(false);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
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

  const toggleParticipant = (studentId: string, selected: boolean) => {
    setPendingParticipantIds(current =>
      selected ? current.filter(id => id !== studentId) : current.includes(studentId) ? current : [...current, studentId],
    );
  };

  const saveParticipantChanges = async (exam: MockExam) => {
    const originalIds = new Set(exam.participants.map(item => item.student.id));
    const pendingIds = new Set(pendingParticipantIds);
    const additions = [...pendingIds].filter(id => !originalIds.has(id));
    const removals = [...originalIds].filter(id => !pendingIds.has(id));
    const changes = [
      ...additions.map(id => ({ id, method: 'POST' as const })),
      ...removals.map(id => ({ id, method: 'DELETE' as const })),
    ];
    if (!changes.length) {
      setParticipantExamId(null);
      return;
    }
    setParticipantSaving(true);
    setError('');
    const failures: string[] = [];
    try {
      for (let i = 0; i < changes.length; i += 8) {
        const batch = changes.slice(i, i + 8);
        const results = await Promise.all(batch.map(async change => {
          try {
            const response = await fetch(
              `/api/admin/mock-exams/${exam.id}/participants/${change.id}`,
              { method: change.method, credentials: 'include' },
            );
            if (!response.ok) throw new Error('request failed');
            return { id: change.id, ok: true };
          } catch {
            return { id: change.id, ok: false };
          }
        }));
        failures.push(...results.filter(result => !result.ok).map(result => result.id));
      }
      await load();
      if (failures.length) {
        setPendingParticipantIds([...pendingIds].filter(id => !failures.includes(id)));
        setError(`ذخیره کامل نشد؛ تغییرات ${failures.length} هنرجو ثبت نشد. وضعیت را بررسی و دوباره ذخیره کن.`);
      } else {
        setParticipantExamId(null);
      }
    } finally {
      setParticipantSaving(false);
    }
  };

  const getVisibleParticipantStudents = () => students.filter(student => {
    const levelMatches = participantGroup === 'ALL' || student.academicLevel === participantGroup;
    const query = participantSearch.trim().toLocaleLowerCase();
    const searchMatches = !query || student.fullName.toLocaleLowerCase().includes(query) || student.nationalId.includes(query);
    const selected = pendingParticipantIds.includes(student.id);
    return levelMatches && searchMatches && (!showSelectedOnly || selected);
  });

  const bulkSetParticipants = (shouldSelect: boolean) => {
    const targets = getVisibleParticipantStudents().map(student => student.id);
    if (!targets.length) return;
    setPendingParticipantIds(current => {
      if (shouldSelect) return [...new Set([...current, ...targets])];
      const targetSet = new Set(targets);
      return current.filter(id => !targetSet.has(id));
    });
  };

  return (
    <div className="admin-legacy-page admin-mock-exams-page admin-extracted-managemockexams-1">
      {error && <div className="admin-mock-error">{error}</div>}

      <div className="mock-exam-dashboard">
        <div className="mock-exam-stats">
          <div className="mock-exam-stat"><span>کل آزمون‌ها</span><strong>{exams.length}</strong></div>
          <div className="mock-exam-stat"><span>برگزارشده</span><strong>{completedCount}</strong></div>
          <div className="mock-exam-stat"><span>باقی‌مانده</span><strong>{remainingCount}</strong></div>
          <div className="mock-exam-stat"><span>لغوشده</span><strong>{cancelledCount}</strong></div>
        </div>
      </div>

      <form onSubmit={submit} className="admin-mock-card">
        <div className="admin-mock-section-title">
          <Plus size={17} color="var(--admin-accent)" />
          {editingId ? 'ویرایش آزمون' : 'تعریف آزمون جدید'}
        </div>

        <div className="admin-mock-form-grid">
          <Field label="عنوان آزمون *">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: آزمون آزمایشی مهر" className="admin-mock-input" required />
          </Field>
          <Field label="مقطع *">
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="admin-mock-input" required>
              <option value="">انتخاب مقطع</option>
              <option value="ارشد">ارشد</option>
              <option value="دکتری">دکتری</option>
            </select>
          </Field>
          <Field label="رشته *">
            <input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="مثال: پژوهش هنر" className="admin-mock-input" required />
          </Field>
          <Field label="تاریخ و ساعت آزمون *">
            <div className="admin-extracted-managemockexams-2">
              <button
                type="button"
                onClick={openCalendar}
                className="admin-mock-input admin-mock-input--date"
              >
                {selectedDate ? `${selectedDate.jd} ${monthNames[selectedDate.jm - 1]} ${selectedDate.jy}` : 'انتخاب تاریخ شمسی'}
              </button>
              <div className="admin-extracted-managemockexams-3">
                <select value={hour} onChange={e => setHour(e.target.value)} className="admin-mock-input admin-mock-input--time">
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i).padStart(2,'0')}>{String(i).padStart(2,'0')}</option>)}
                </select>
                <span className="admin-extracted-managemockexams-4">:</span>
                <select value={minute} onChange={e => setMinute(e.target.value)} className="admin-mock-input admin-mock-input--time">
                  {['00','15','30','45'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </Field>
          <Field label="وضعیت">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MockExamStatus })} className="admin-mock-input">
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="لینک سایت آزمون">
            <input type="url" value={form.examUrl} onChange={(e) => setForm({ ...form, examUrl: e.target.value })} placeholder="https://exam.example.ir/..." className="admin-mock-input" />
          </Field>
        </div>

        <div className="admin-extracted-managemockexams-5">
          {editingId && <button type="button" onClick={resetForm} className="admin-mock-secondary-button">انصراف</button>}
          <button type="submit" disabled={saving} className="admin-mock-primary-button">
            {saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ثبت آزمون'}
          </button>
        </div>
      </form>

      {calendarOpen && (
        <div
          className="admin-extracted-managemockexams-6"
          onClick={() => setCalendarOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="admin-extracted-managemockexams-7"
          >
            <div className="admin-extracted-managemockexams-8">
              <button type="button" onClick={() => shiftMonth(1)} className="admin-mock-calendar-nav">‹</button>
              <strong className="admin-extracted-managemockexams-9">{monthNames[calendarMonth.jm - 1]} {calendarMonth.jy}</strong>
              <button type="button" onClick={() => shiftMonth(-1)} className="admin-mock-calendar-nav">›</button>
            </div>
            <div className="admin-extracted-managemockexams-10">
              {weekdays.map(day => <div key={day} className="admin-extracted-managemockexams-11">{day}</div>)}
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
            <div className="admin-extracted-managemockexams-12">
              <span className="admin-extracted-managemockexams-13">روزهای گذشته قابل انتخاب نیستند</span>
              <button type="button" onClick={() => setCalendarOpen(false)} className="admin-extracted-managemockexams-14">تأیید تاریخ</button>
            </div>
          </div>
        </div>
      )}

      <div className="mock-exam-dashboard">

        <div className="admin-mock-card" className="mock-exam-list-card">
          <div className="mock-exam-list-head">
            <div className="admin-mock-section-title">
              <CalendarDays size={17} color="var(--admin-accent)" />
              آزمون‌های ثبت‌شده ({filteredExams.length} از {exams.length})
            </div>
            <button type="button" onClick={exportExams} className="admin-mock-secondary-button" disabled={filteredExams.length === 0}>
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
            <p className="admin-mock-muted">در حال دریافت اطلاعات...</p>
          ) : exams.length === 0 ? (
            <p className="admin-mock-muted">هنوز آزمونی تعریف نشده است.</p>
          ) : filteredExams.length === 0 ? (
            <p className="admin-mock-muted">با فیلترهای انتخاب‌شده آزمونی پیدا نشد.</p>
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
                <div className="admin-extracted-managemockexams-15">
                  <div>
                    <div className="admin-extracted-managemockexams-16">
                      <strong className="admin-extracted-managemockexams-17">{exam.title}</strong>
                      <span className="admin-mock-badge">{statusLabels[exam.status]}</span>
                    </div>
                    <div className="admin-extracted-managemockexams-18">
                      {exam.level} · {exam.field} · {new Date(exam.examDate).toLocaleString('fa-IR')}
                    </div>
                    <div className="admin-extracted-managemockexams-19">
                      <Users size={13} />
                      {exam.participants.length} هنرجوی ثبت‌نام‌شده
                    </div>
                    {exam.examUrl && (
                      <a href={exam.examUrl} target="_blank" rel="noreferrer" className="admin-extracted-managemockexams-20">
                        <Link2 size={13} /> لینک سایت آزمون <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <div className="admin-extracted-managemockexams-21">
                    <button onClick={() => editExam(exam)} className="admin-mock-secondary-button">
                      <Pencil size={14} /> ویرایش
                    </button>
                    <button onClick={() => {
                        if (participantExamId === exam.id) {
                          setParticipantExamId(null);
                        } else {
                          setParticipantExamId(exam.id);
                          setParticipantGroup(/دکتری|دکترا/i.test(exam.level) ? 'DOCTORATE' : /ارشد/i.test(exam.level) ? 'MASTER' : 'ALL');
                          setParticipantSearch('');
                          setShowSelectedOnly(false);
                          setPendingParticipantIds(exam.participants.map(item => item.student.id));
                        }
                      }} className="admin-mock-secondary-button">
                      <Users size={14} /> شرکت‌کنندگان
                    </button>
                  </div>
                </div>

                {participantExamId === exam.id && (
                  <div className="admin-extracted-managemockexams-22">
                    <div className="admin-extracted-managemockexams-23">
                      انتخاب هنرجویان ثبت‌نام‌شده در این آزمون
                    </div>
                    <div className="mock-participant-toolbar">
                      <div className="mock-participant-levels">
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
                              className={participantGroup === value ? 'is-active' : ''}
                              onClick={() => setParticipantGroup(value)}
                            >
                              {label} <span>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mock-participant-summary">
                        <strong>{exam.participants.length}</strong>
                        <span>از {students.length} هنرجو انتخاب شده</span>
                      </div>
                    </div>
                    <div className="mock-participant-bulk-actions">
                      <button
                        type="button"
                        disabled={participantSaving || getVisibleParticipantStudents().every(student => pendingParticipantIds.includes(student.id))}
                        onClick={() => void bulkSetParticipants(true)}
                      >
                        <Check size={15} /> انتخاب همهٔ نتایج
                      </button>
                      <button
                        type="button"
                        disabled={participantSaving || !getVisibleParticipantStudents().some(student => pendingParticipantIds.includes(student.id))}
                        onClick={() => void bulkSetParticipants(false)}
                      >
                        پاک‌کردن انتخاب نتایج
                      </button>
                      <span>تغییرات ذخیره‌نشده: {pendingParticipantIds.filter(id => !exam.participants.some(item => item.student.id === id)).length + exam.participants.filter(item => !pendingParticipantIds.includes(item.student.id)).length}</span>
                    </div>
                    <div className="mock-participant-search-row">
                      <label className="mock-participant-search">
                        <Search size={16} />
                        <input
                          type="search"
                          value={participantSearch}
                          onChange={event => setParticipantSearch(event.target.value)}
                          placeholder="جست‌وجوی نام، نام خانوادگی یا کد ملی..."
                          aria-label="جست‌وجوی هنرجو"
                        />
                      </label>
                      <button
                        type="button"
                        className={showSelectedOnly ? 'mock-participant-selected-toggle is-active' : 'mock-participant-selected-toggle'}
                        onClick={() => setShowSelectedOnly(value => !value)}
                      >
                        <Check size={15} />
                        فقط انتخاب‌شده‌ها
                      </button>
                    </div>
                    <div className="mock-participant-results-count">
                      {students.filter(student => {
                        const levelMatches = participantGroup === 'ALL' || student.academicLevel === participantGroup;
                        const query = participantSearch.trim().toLocaleLowerCase();
                        const searchMatches = !query || student.fullName.toLocaleLowerCase().includes(query) || student.nationalId.includes(query);
                        const selected = pendingParticipantIds.includes(student.id);
                        return levelMatches && searchMatches && (!showSelectedOnly || selected);
                      }).length} هنرجو در نتایج
                    </div>
                    <div className="mock-participant-table-wrap">
                      <table className="mock-participant-table">
                        <thead>
                          <tr>
                            <th>انتخاب</th>
                            <th>نام و نام خانوادگی</th>
                            <th>کد ملی</th>
                            <th>مقطع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students
                            .filter(student => {
                              const levelMatches = participantGroup === 'ALL' || student.academicLevel === participantGroup;
                              const query = participantSearch.trim().toLocaleLowerCase();
                              const searchMatches = !query || student.fullName.toLocaleLowerCase().includes(query) || student.nationalId.includes(query);
                              const selected = pendingParticipantIds.includes(student.id);
                              return levelMatches && searchMatches && (!showSelectedOnly || selected);
                            })
                            .map(student => {
                              const selected = pendingParticipantIds.includes(student.id);
                              return (
                                <tr key={student.id} className={selected ? 'is-selected' : ''}>
                                  <td>
                                    <button
                                      type="button"
                                      className={selected ? 'mock-participant-row-toggle is-selected' : 'mock-participant-row-toggle'}
                                      aria-label={selected ? `حذف ${student.fullName} از آزمون` : `افزودن ${student.fullName} به آزمون`}
                                      aria-pressed={selected}
                                      onClick={() => toggleParticipant(student.id, selected)}
                                    >
                                      {selected && <Check size={14} />}
                                    </button>
                                  </td>
                                  <td className="mock-participant-name">{student.fullName}</td>
                                  <td className="mock-participant-national-id" dir="ltr">{student.nationalId}</td>
                                  <td>
                                    <span className="mock-participant-level">
                                      {student.academicLevel === 'MASTER' ? 'ارشد' : student.academicLevel === 'DOCTORATE' ? 'دکتری' : 'نامشخص'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          {getVisibleParticipantStudents().length === 0 && (
                            <tr><td colSpan={4} className="mock-participant-empty">هنرجویی با این مشخصات پیدا نشد.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mock-participant-savebar">
                      <button type="button" className="mock-participant-cancel" disabled={participantSaving} onClick={() => {
                        setPendingParticipantIds(exam.participants.map(item => item.student.id));
                        setParticipantExamId(null);
                      }}>انصراف</button>
                      <button type="button" className="mock-participant-save" disabled={participantSaving} onClick={() => void saveParticipantChanges(exam)}>
                        {participantSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="admin-mock-field-label">{label}</label>
    {children}
  </div>
);


