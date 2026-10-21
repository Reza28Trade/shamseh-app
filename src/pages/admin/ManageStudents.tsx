import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, BarChart3, CheckCircle2, Download, Trash2, FileSpreadsheet, Filter, Pencil, Search, Upload, UserPlus, Users, X, Wallet } from 'lucide-react';
import type { Student, Course } from '../../types';
import '../../styles/AdminStudents.css';

interface ManageStudentsProps {
  students: Student[];
  courses: Course[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
}

type EnrollmentView = {
  id: string;
  status: string;
  courseId: string;
  enrolledAt: string;
  course: { id: string; title: string; level: string | null; term?: string | null; academicYear?: number | null };
};

type ApiStudent = Student & {
  phone?: string;
  isArchived: boolean;
  enrollments: EnrollmentView[];
};

const levelLabel = (level?: string | null) => level === 'MASTER' ? 'ارشد' : level === 'DOCTORATE' ? 'دکتری' : 'نامشخص';
const termLabel = (term?: string | null) => term || 'بدون ترم';
// Convert Jalali dates to ISO Gregorian dates without relying on the browser's Gregorian date picker.
const jalaliFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
const jalaliParts = (date: Date) => {
  const parts = jalaliFormatter.formatToParts(date);
  return { year: Number(parts.find(p => p.type === 'year')?.value), month: Number(parts.find(p => p.type === 'month')?.value), day: Number(parts.find(p => p.type === 'day')?.value) };
};
const isoToJalali = (iso?: string) => {
  if (!iso) return '';
  const match = iso.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const p = jalaliParts(date);
  return `${p.year}/${String(p.month).padStart(2, '0')}/${String(p.day).padStart(2, '0')}`;
};
const jalaliToIso = (value: string) => {
  const match = value.trim().match(/^(\\d{4})[/-](\\d{1,2})[/-](\\d{1,2})$/);
  if (!match) return '';
  const wanted = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (wanted.month < 1 || wanted.month > 12 || wanted.day < 1 || wanted.day > 31) return '';
  const start = Date.UTC(wanted.year + 621, 2, 15);
  for (let offset = 0; offset <= 30; offset++) {
    for (const sign of [1, -1]) {
      const date = new Date(start + sign * offset * 86400000);
      const p = jalaliParts(date);
      if (p.year === wanted.year && p.month === wanted.month && p.day === wanted.day) {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T12:00:00.000Z`;
      }
    }
  }
  return '';
};
const years = (courses: Course[]) => Array.from(new Set(courses.map(c => c.academicYear).filter((v): v is number => typeof v === 'number'))).sort((a,b) => b-a);

export const ManageStudents: React.FC<ManageStudentsProps> = ({
  students: _students,
  courses: _courses,
  onAddStudent: _onAddStudent,
  onUpdateStudent: _onUpdateStudent,
  onDeleteStudent: _onDeleteStudent,
}) => {
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [academicLevel, setAcademicLevel] = useState<'MASTER' | 'DOCTORATE' | ''>('');
  const [apiStudents, setApiStudents] = useState<ApiStudent[]>([]);
  const [apiCourses, setApiCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<ApiStudent | null>(null);
  const [financeStudent, setFinanceStudent] = useState<ApiStudent | null>(null);
  const [financeData, setFinanceData] = useState<any | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState('');
  const [manualFinanceOpen, setManualFinanceOpen] = useState(false);
  const [editingFinanceRegistrationId, setEditingFinanceRegistrationId] = useState<string | null>(null);
  const [manualCourseIds, setManualCourseIds] = useState<string[]>([]);
  const [manualOriginalTuition, setManualOriginalTuition] = useState('');
  const [manualDiscount, setManualDiscount] = useState('0');
  const [manualDiscountReason, setManualDiscountReason] = useState('');
  const [manualPayments, setManualPayments] = useState<Array<{amount:string;paymentDate:string;method:string;reference:string}>>([]);
  const [manualInstallments, setManualInstallments] = useState<Array<{id?:string;amount:string;dueDate:string}>>([{amount:'',dueDate:''}]);
  const [manualFinanceSaving, setManualFinanceSaving] = useState(false);


  const [studentLevelFilter, setStudentLevelFilter] = useState<'ALL' | 'MASTER' | 'DOCTORATE'>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | string>('ALL');
  const [termFilter, setTermFilter] = useState<'ALL' | string>('ALL');
  const [termChartRange, setTermChartRange] = useState<'latest' | 'all'>('latest');
  const [search, setSearch] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState('ALL');
  const [studentEnrollmentFilter, setStudentEnrollmentFilter] = useState<'ALL' | 'ENROLLED' | 'NONE'>('ALL');
  const [studentSection, setStudentSection] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [coursePickerLevel, setCoursePickerLevel] = useState<'MASTER' | 'DOCTORATE' | ''>('');
  const [coursePickerYear, setCoursePickerYear] = useState<'ALL' | string>('ALL');
  const [coursePickerTerm, setCoursePickerTerm] = useState<'ALL' | string>('ALL');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{ total: number; valid: number; skipped: number; errors: string[]; rows: Array<Record<string,string>> } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const loadStudents = async () => {
    setLoading(true); setError('');
    try {
      const [studentsResponse, coursesResponse] = await Promise.all([
        fetch('/api/admin/students', { credentials: 'include' }),
        fetch('/api/courses', { credentials: 'include' }),
      ]);
      if (!studentsResponse.ok || !coursesResponse.ok) throw new Error('دریافت اطلاعات انجام نشد.');
      const [data, courseData] = await Promise.all([studentsResponse.json(), coursesResponse.json()]);
      setApiCourses(courseData.map((course: any) => ({
        id: course.id, title: course.title, professor: course.professor ?? '', level: course.level ?? '',
        schedule: course.schedule ?? '', startDate: course.startDate ?? '', description: course.description ?? '', term: course.term, price: course.price ? Number(course.price) : 0,
        category: course.category, coverImage: course.coverImage, academicYear: course.academicYear, classDays: course.classDays ?? [],
        classStartTime: course.classStartTime, classEndTime: course.classEndTime,
      })));
      setApiStudents(data.map((student: any) => ({
        id: student.id, fullName: student.fullName, nationalId: student.nationalId, academicLevel: student.academicLevel ?? '', isArchived: Boolean(student.isArchived),
        enrolledCourseIds: student.enrollments.filter((e: any) => e.status === 'ACTIVE').map((e: any) => e.courseId),
        levels: [], phone: student.phone,
        enrollments: student.enrollments,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت فهرست هنرجویان انجام نشد.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadStudents(); }, []);

  const availableYears = useMemo(() => years(apiCourses), [apiCourses]);
  const availableTerms = useMemo(() => Array.from(new Set(apiCourses.map(c => c.term).filter(Boolean) as string[])), [apiCourses]);

  const filteredStudents = useMemo(() => apiStudents.filter(student => {
    if (student.isArchived !== (studentSection === 'ARCHIVED')) return false;
    if (studentLevelFilter !== 'ALL' && student.academicLevel !== studentLevelFilter) return false;
    if (search && ![student.fullName, student.nationalId, student.phone || ''].some(v => v.toLowerCase().includes(search.toLowerCase()))) return false;
    if (studentCourseFilter !== 'ALL' && !student.enrollments.some(e => e.courseId === studentCourseFilter)) return false;
    const hasActiveEnrollment = student.enrollments.some(e => e.status === 'ACTIVE');
    if (studentEnrollmentFilter === 'ENROLLED' && !hasActiveEnrollment) return false;
    if (studentEnrollmentFilter === 'NONE' && hasActiveEnrollment) return false;
    const matching = student.enrollments.filter(e => e.status === 'ACTIVE').filter(e => {
      if (yearFilter !== 'ALL' && String(e.course.academicYear ?? '') !== yearFilter) return false;
      if (termFilter !== 'ALL' && e.course.term !== termFilter) return false;
      return true;
    });
    return yearFilter === 'ALL' && termFilter === 'ALL' ? true : matching.length > 0;
  }), [apiStudents, studentLevelFilter, yearFilter, termFilter, search, studentCourseFilter, studentEnrollmentFilter, studentSection]);

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(current => current.includes(studentId) ? current.filter(id => id !== studentId) : [...current, studentId]);
  };

  const toggleAllVisibleStudents = () => {
    const visibleIds = filteredStudents.map(student => student.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedStudentIds.includes(id));
    setSelectedStudentIds(current => allSelected
      ? current.filter(id => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const bulkArchiveStudents = async (isArchived: boolean) => {
    const targets = apiStudents.filter(student => selectedStudentIds.includes(student.id));
    if (!targets.length) return;
    const action = isArchived ? 'بایگانی' : 'بازگردانی به فهرست فعال';
    if (!window.confirm(`${targets.length} هنرجوی انتخاب‌شده ${action} شوند؟ سوابق آن‌ها حفظ می‌شود.`)) return;
    setBulkProcessing(true);
    setError('');
    const failures: string[] = [];
    for (const student of targets) {
      try {
        const response = await fetch(`/api/admin/students/${student.id}/archive`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isArchived }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          failures.push(`${student.fullName}: ${body?.message || 'خطا'}`);
        }
      } catch {
        failures.push(student.fullName);
      }
    }
    setSelectedStudentIds([]);
    await loadStudents();
    if (failures.length) setError(`عملیات برای ${targets.length - failures.length} نفر انجام شد؛ ناموفق: ${failures.join('، ')}`);
    setBulkProcessing(false);
  };

  const openStudentFinance = async (student: ApiStudent) => {
    setManualFinanceOpen(false); setEditingFinanceRegistrationId(null); setManualCourseIds([]); setManualOriginalTuition('');
    setManualDiscount('0'); setManualDiscountReason(''); setManualPayments([]);
    setManualInstallments([{amount:'',dueDate:''}]);
    setFinanceStudent(student); setFinanceData(null); setFinanceError(''); setFinanceLoading(true);
    try {
      const response = await fetch(`/api/admin/students/${student.id}/finance`, { credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'دریافت پرونده مالی انجام نشد.');
      setFinanceData(body);
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : 'دریافت پرونده مالی انجام نشد.');
    } finally { setFinanceLoading(false); }
  };


  const saveManualFinance = async () => {
    if (!financeStudent) return;
    if (!manualCourseIds.length || !manualOriginalTuition || !manualInstallments.length || manualInstallments.some(i => !i.amount || !jalaliToIso(i.dueDate)) || manualPayments.some(p => !p.amount || !p.paymentDate)) {
      setFinanceError('دوره، شهریه، مبلغ و تاریخ سررسید تمام اقساط و مبلغ/تاریخ پرداخت‌های ثبت‌شده را کامل کنید.'); return;
    }
    setManualFinanceSaving(true); setFinanceError('');
    try {
      const editing = Boolean(editingFinanceRegistrationId);
      const response = await fetch(editing
        ? '/api/admin/students/' + financeStudent.id + '/finance/' + editingFinanceRegistrationId
        : '/api/admin/students/' + financeStudent.id + '/finance', {
        method: editing ? 'PATCH' : 'POST', credentials: 'include', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          courseIds: manualCourseIds, originalTuition: Number(manualOriginalTuition), discountAmount: Number(manualDiscount || 0),
          discountReason: manualDiscountReason,
          payments: manualPayments.map(p=>({...p,amount:Number(p.amount),paymentDate:jalaliToIso(p.paymentDate)})),
          installments: manualInstallments.map(i=>({...i,amount:Number(i.amount),dueDate:jalaliToIso(i.dueDate)})),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(Array.isArray(body?.message) ? body.message.join('، ') : body?.message || 'ثبت پرونده مالی انجام نشد.');
      setManualFinanceOpen(false); setEditingFinanceRegistrationId(null); setManualCourseIds([]); setManualOriginalTuition(''); setManualDiscount('0'); setManualDiscountReason('');
      setManualPayments([]); setManualInstallments([{amount:'',dueDate:''}]);
      await openStudentFinance(financeStudent);
      await loadStudents();
    } catch(err) { setFinanceError(err instanceof Error ? err.message : 'ثبت پرونده مالی انجام نشد.'); }
    finally { setManualFinanceSaving(false); }
  };

  const permanentlyDeleteArchivedStudent = async (student: ApiStudent) => {
    if (!student.isArchived) return;
    if (!window.confirm(`هنرجوی «${student.fullName}» برای همیشه حذف شود؟ این کار فقط برای هنرجوی اشتباهیِ بدون سوابق مالی/فعالیت قابل انجام است و قابل بازگشت نیست.`)) return;
    setError('');
    try {
      const response = await fetch(`/api/admin/students/${student.id}`, { method: 'DELETE', credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'حذف دائمی انجام نشد.');
      setSelectedStudentIds(current => current.filter(id => id !== student.id));
      if (selectedStudent?.id === student.id) setSelectedStudent(null);
      await loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف دائمی انجام نشد.');
    }
  };

  const changeStudentArchive = async (student: ApiStudent) => {
    const isArchived = !student.isArchived;
    const action = isArchived ? 'بایگانی' : 'بازگردانی به فهرست فعال';
    if (!window.confirm(`هنرجوی «${student.fullName}» ${action} شود؟ سوابق او حفظ می‌شود.`)) return;
    setError('');
    try {
      const response = await fetch(`/api/admin/students/${student.id}/archive`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isArchived }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'تغییر وضعیت بایگانی انجام نشد.');
      if (selectedStudent?.id === student.id) setSelectedStudent({ ...selectedStudent, isArchived });
      await loadStudents();
    } catch (e) { setError(e instanceof Error ? e.message : 'تغییر وضعیت بایگانی انجام نشد.'); }
  };

  const activeEnrollments = apiStudents.reduce((n,s) => n + s.enrollments.filter(e => e.status === 'ACTIVE').length, 0);
  const masterCount = apiStudents.filter(s => s.academicLevel === 'MASTER').length;
  const doctorateCount = apiStudents.filter(s => s.academicLevel === 'DOCTORATE').length;
  const latestAcademicYear = availableYears[0];
  const termCounts = useMemo(() => {
    const colors = ['#FF6838', '#FFC820', '#97C95C', '#1CB2F6', '#9B7BDE', '#1685B8'];
    const grouped = new Map<string, Set<string>>();
    apiStudents.forEach(student => {
      student.enrollments.filter(enrollment => {
        if (enrollment.status !== 'ACTIVE') return false;
        if (termChartRange === 'latest' && latestAcademicYear !== undefined && enrollment.course.academicYear !== latestAcademicYear) return false;
        return true;
      }).forEach(enrollment => {
        const term = termLabel(enrollment.course.term);
        if (!grouped.has(term)) grouped.set(term, new Set<string>());
        grouped.get(term)!.add(student.id);
      });
    });
    const rows = [...grouped.entries()].map(([term, ids], index) => ({ term, count: ids.size, color: colors[index % colors.length] })).filter(row => row.count > 0);
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    let offset = 0;
    const slices = rows.map(row => {
      const next = offset + (total ? row.count / total * 100 : 0);
      const slice = row.color + ' ' + offset + '% ' + next + '%';
      offset = next;
      return slice;
    });
    return { rows, total, gradient: slices.length ? 'conic-gradient(' + slices.join(', ') + ')' : 'conic-gradient(var(--admin-inner) 0% 100%)' };
  }, [apiStudents, termChartRange, latestAcademicYear]);

  const pickerCourses = useMemo(() => apiCourses.filter(course => {
    if (coursePickerLevel && course.level !== coursePickerLevel) return false;
    if (coursePickerYear !== 'ALL' && String(course.academicYear ?? '') !== coursePickerYear) return false;
    if (coursePickerTerm !== 'ALL' && course.term !== coursePickerTerm) return false;
    return true;
  }), [apiCourses, coursePickerLevel, coursePickerYear, coursePickerTerm]);

  const handleCheckboxChange = (courseId: string) => setSelectedCourses(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);

  const resetForm = () => { setFullName(''); setNationalId(''); setPhone(''); setAcademicLevel(''); setSelectedCourses([]); setEditingStudentId(null); };

  const handleEdit = (student: ApiStudent) => {
    setEditingStudentId(student.id); setFullName(student.fullName); setNationalId(student.nationalId); setPhone(''); setAcademicLevel(student.academicLevel ?? '');
    setSelectedCourses(student.enrollments.filter(e => e.status === 'ACTIVE').map(e => e.courseId)); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !nationalId || !academicLevel || (!editingStudentId && !phone)) return;
    void (async () => {
      try {
        setError('');
        if (editingStudentId) {
          const response = await fetch(`/api/admin/students/${editingStudentId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ fullName, nationalId, academicLevel, ...(phone ? { phone } : {}), courseIds: selectedCourses }),
          });
          if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || 'ویرایش هنرجو انجام نشد.');
        } else {
          const response = await fetch('/api/admin/students', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ fullName, nationalId, phone, academicLevel }),
          });
          if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || 'ثبت هنرجو انجام نشد.');
          const created = await response.json();
          for (const courseId of selectedCourses) {
            const enrollment = await fetch(`/api/admin/students/${created.student.id}/enrollments/${courseId}`, { method: 'POST', credentials: 'include' });
            if (!enrollment.ok) throw new Error((await enrollment.json().catch(() => null))?.message || 'ثبت دوره انجام نشد.');
          }
          const createdStudent: ApiStudent = {
            id: created.student.id,
            fullName,
            nationalId,
            phone,
            academicLevel,
            isArchived: false,
            enrolledCourseIds: [...selectedCourses],
            levels: [],
            enrollments: [],
          };
          resetForm();
          await loadStudents();
          await openStudentFinance(createdStudent);
          setManualCourseIds([...selectedCourses]);
          setManualFinanceOpen(true);
          return;
        }
        resetForm(); await loadStudents();
      } catch (err) { setError(err instanceof Error ? err.message : 'عملیات هنرجو انجام نشد.'); }
    })();
  };

  const exportStudents = async () => {
    const response = await fetch('/api/admin/students/export', { credentials: 'include' });
    if (!response.ok) { setError('خروجی Excel دریافت نشد.'); return; }
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'students.xlsx'; anchor.click(); URL.revokeObjectURL(url);
  };

  const downloadTemplate = async () => {
    const response = await fetch('/api/admin/students/template', { credentials: 'include' });
    if (!response.ok) { setError('فایل نمونه دریافت نشد.'); return; }
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'students-template.xlsx'; anchor.click(); URL.revokeObjectURL(url);
  };

  const importFile = async (file: File, preview: boolean) => {
    setImporting(true); setError('');
    try {
      const form = new FormData(); form.append('file', file);
      const response = await fetch(`/api/admin/students/import?preview=${preview ? 'true' : 'false'}`, { method: 'POST', body: form, credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Import انجام نشد.');
      if (preview) setImportPreview(body);
      else { setImportPreview(null); if (importRef.current) importRef.current.value = ''; await loadStudents(); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Import انجام نشد.'); }
    finally { setImporting(false); }
  };

  return (
    <div className="admin-legacy-page admin-students-page">
      <section className="students-page-head">
        <div>
          <h2><Users size={19} /> مدیریت هنرجویان</h2>
          <p>مدیریت هنرجویان، دوره‌ها و ثبت‌نام‌ها بر اساس مقطع و ترم تحصیلی</p>
        </div>
        <div className="students-head-actions">
          <button type="button" onClick={() => void exportStudents()}><Download size={15}/> خروجی Excel</button>
          <button type="button" onClick={downloadTemplate}><FileSpreadsheet size={15}/> فایل نمونه</button>
        </div>
      </section>

      <section className="students-stats">
        <div className="student-stat"><span>کل هنرجویان</span><strong>{apiStudents.length}</strong></div>
        <div className="student-stat"><span>ارشد</span><strong>{masterCount}</strong></div>
        <div className="student-stat"><span>دکتری</span><strong>{doctorateCount}</strong></div>
        <div className="student-stat"><span>ثبت‌نام فعال</span><strong>{activeEnrollments}</strong></div>
      </section>

      <div className="students-main-grid">
        <section className="student-chart-card">
          <div className="student-chart-heading">
            <div className="section-title"><BarChart3 size={17}/><h3>توزیع هنرجویان بر اساس ترم</h3></div>
            <div className="student-term-switch">
              <button type="button" className={termChartRange === 'latest' ? 'active' : ''} onClick={() => setTermChartRange('latest')}>امسال{latestAcademicYear !== undefined ? ` (${latestAcademicYear})` : ''}</button>
              <button type="button" className={termChartRange === 'all' ? 'active' : ''} onClick={() => setTermChartRange('all')}>همه سال‌ها</button>
            </div>
          </div>
          <div className="student-term-chart-layout">
            <div className="student-term-donut" style={{background: termCounts.gradient}}>
              <div className="student-term-donut-center"><strong>{termCounts.total}</strong><span>هنرجو</span></div>
            </div>
            <div className="student-term-legend">
              {termCounts.rows.length ? termCounts.rows.map(item => <div className="student-term-legend-row" key={item.term}>
                <i style={{background:item.color}}/><span>{item.term}</span><strong>{item.count}</strong><small>{termCounts.total ? Math.round(item.count / termCounts.total * 100) : 0}٪</small>
              </div>) : <p className="student-term-empty">هنوز داده‌ای برای نمایش آماری ثبت نشده است.</p>}
            </div>
          </div>
          <p className="student-term-note">هر هنرجو در هر ترم فقط یک‌بار شمرده می‌شود.</p>
        </section>

        <section className="student-form-card">
          <div className="section-title"><UserPlus size={17}/><h3>{editingStudentId ? 'ویرایش هنرجو' : 'ثبت هنرجوی جدید'}</h3></div>
          <form onSubmit={handleSubmit} className="student-form">
            <input placeholder="نام و نام خانوادگی" value={fullName} onChange={e=>setFullName(e.target.value)} required/>
            <input placeholder="کد ملی" value={nationalId} onChange={e=>setNationalId(e.target.value)} required/>
            <input placeholder={editingStudentId ? 'موبایل جدید (اختیاری)' : 'شماره موبایل'} value={phone} onChange={e=>setPhone(e.target.value)} required={!editingStudentId}/>
            <select value={academicLevel} onChange={e=>setAcademicLevel(e.target.value as any)} required><option value="">مقطع تحصیلی</option><option value="MASTER">ارشد</option><option value="DOCTORATE">دکتری</option></select>
            <div className="course-picker">
              <div className="picker-title">انتخاب دوره‌های مجاز</div>
              <div className="picker-filters">
                <select value={coursePickerLevel} onChange={e=>setCoursePickerLevel(e.target.value as any)}><option value="">همه مقاطع</option><option value="MASTER">ارشد</option><option value="DOCTORATE">دکتری</option></select>
                <select value={coursePickerYear} onChange={e=>setCoursePickerYear(e.target.value)}><option value="ALL">همه سال‌ها</option>{availableYears.map(y=><option key={y} value={y}>{y}</option>)}</select>
                <select value={coursePickerTerm} onChange={e=>setCoursePickerTerm(e.target.value)}><option value="ALL">همه ترم‌ها</option>{availableTerms.map(t=><option key={t} value={t}>{t}</option>)}</select>
              </div>
              <div className="course-list">{pickerCourses.map(course=><button type="button" className={selectedCourses.includes(course.id) ? 'course-choice selected' : 'course-choice'} key={course.id} onClick={()=>handleCheckboxChange(course.id)}><span>{course.title}</span><small>{levelLabel(course.level)} · {course.academicYear ?? '—'} · {termLabel(course.term)}</small></button>)}</div>
              {!pickerCourses.length && <div className="empty-mini">دوره‌ای با این فیلتر پیدا نشد.</div>}
            </div>
            <button className="primary-action" type="submit">{editingStudentId ? 'ذخیره تغییرات' : 'ثبت هنرجو و ورود به ثبت مالی'}</button>
            {editingStudentId && <button className="secondary-action" type="button" onClick={resetForm}><X size={14}/> انصراف</button>}
          </form>
        </section>
      </div>

      <section className="student-import-card">
        <div className="import-copy"><div className="section-title"><Upload size={17}/><h3>ورود گروهی از Excel</h3></div><p>فرمت نمونه را دانلود کنید، سپس فایل را انتخاب کنید. ابتدا پیش‌نمایش انجام می‌شود و بعد ثبت نهایی.</p></div>
        <div className="import-actions"><input ref={importRef} type="file" accept=".xlsx" onChange={e=>{const file=e.target.files?.[0]; if(file) void importFile(file,true);}}/><span>{importing ? 'در حال بررسی...' : 'فایل .xlsx را انتخاب کنید'}</span></div>
        {importPreview && <div className="import-preview"><strong>{importPreview.valid} ردیف آماده ثبت از {importPreview.total}</strong>{importPreview.skipped>0 && <span className="warning-text">{importPreview.skipped} ردیف دارای خطا</span>}<div className="preview-list">{importPreview.rows.slice(0,8).map(row=><div key={row.row}><span>{row.name}</span><span>{row.course}</span><span>{row.term} {row.academicYear}</span><b>{row.status}</b></div>)}</div>{importPreview.errors.length>0 && <div className="import-errors">{importPreview.errors.slice(0,5).map((e,i)=><span key={i}>{e}</span>)}</div>}<div className="preview-actions"><button type="button" className="primary-action" disabled={importing || !importPreview.valid} onClick={()=>{const file=importRef.current?.files?.[0]; if(file) void importFile(file,false);}}>ثبت نهایی</button><button type="button" className="secondary-action" onClick={()=>setImportPreview(null)}>بستن</button></div></div>}
      </section>

      <section className="student-list-card">
        <div className="list-head"><div><div className="section-title"><Users size={17}/><h3>{studentSection==='ACTIVE'?'فهرست هنرجویان فعال':'بایگانی هنرجویان'}</h3></div><span>{filteredStudents.length} نفر نمایش داده می‌شود</span></div><div className="student-search"><Search size={15}/><input placeholder="جستجوی نام، کد ملی یا موبایل" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}><button type="button" className={studentSection==='ACTIVE'?'primary-action':'secondary-action'} onClick={()=>{setStudentSection('ACTIVE');setSelectedStudentIds([]);}}><Users size={14}/> هنرجویان فعال ({apiStudents.filter(s=>!s.isArchived).length})</button><button type="button" className={studentSection==='ARCHIVED'?'primary-action':'secondary-action'} onClick={()=>{setStudentSection('ARCHIVED');setSelectedStudentIds([]);}}><Archive size={14}/> بایگانی ({apiStudents.filter(s=>s.isArchived).length})</button></div><div className="student-filters"><Filter size={15}/><select value={studentLevelFilter} onChange={e=>setStudentLevelFilter(e.target.value as any)}><option value="ALL">همه مقاطع</option><option value="MASTER">ارشد</option><option value="DOCTORATE">دکتری</option></select><select value={yearFilter} onChange={e=>setYearFilter(e.target.value)}><option value="ALL">همه سال‌ها</option>{availableYears.map(y=><option key={y} value={y}>{y}</option>)}</select><select value={termFilter} onChange={e=>setTermFilter(e.target.value)}><option value="ALL">همه ترم‌ها</option>{availableTerms.map(t=><option key={t} value={t}>{t}</option>)}</select><select value={studentCourseFilter} onChange={e=>setStudentCourseFilter(e.target.value)}><option value="ALL">همه دوره‌ها</option>{apiCourses.map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select><select value={studentEnrollmentFilter} onChange={e=>setStudentEnrollmentFilter(e.target.value as 'ALL'|'ENROLLED'|'NONE')}><option value="ALL">همه وضعیت ثبت‌نام</option><option value="ENROLLED">دارای دوره فعال</option><option value="NONE">بدون دوره فعال</option></select></div>
        {error && <div className="students-error">{error}</div>}
        {selectedStudentIds.length > 0 && <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',padding:'10px 12px',marginBottom:12,border:'1px solid var(--admin-border)',borderRadius:12,background:'var(--admin-inner)'}}>
          <strong>{selectedStudentIds.length} نفر انتخاب شده</strong>
          <button type="button" className="secondary-action" disabled={bulkProcessing} onClick={()=>void bulkArchiveStudents(! (studentSection === 'ARCHIVED'))}><Archive size={14}/>{studentSection==='ARCHIVED'?'بازگردانی انتخاب‌شده‌ها':'بایگانی انتخاب‌شده‌ها'}</button>
          <button type="button" className="secondary-action" disabled={bulkProcessing} onClick={()=>setSelectedStudentIds([])}><X size={14}/> لغو انتخاب</button>
          {bulkProcessing && <span>در حال انجام عملیات گروهی…</span>}
        </div>}
        {loading ? <div className="students-empty">در حال دریافت فهرست هنرجویان...</div> : <div className="student-table-wrap"><table><thead><tr><th><input type="checkbox" className="student-select-checkbox" aria-label="انتخاب همه هنرجویان نمایش‌داده‌شده" checked={filteredStudents.length > 0 && filteredStudents.every(student => selectedStudentIds.includes(student.id))} onChange={toggleAllVisibleStudents} /></th><th>هنرجو</th><th>مقطع</th><th>دوره‌های فعال</th><th>آخرین ثبت‌نام</th><th>عملیات</th></tr></thead><tbody>{filteredStudents.map(student=><tr key={student.id} className="student-clickable-row" tabIndex={0} aria-label={`مشاهده جزئیات ${student.fullName}`} onClick={()=>setSelectedStudent(student)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedStudent(student);}}}><td><input type="checkbox" className="student-select-checkbox" aria-label={`انتخاب ${student.fullName}`} checked={selectedStudentIds.includes(student.id)} onClick={e=>e.stopPropagation()} onChange={()=>toggleStudentSelection(student.id)} /></td><td><strong>{student.fullName}</strong><small>{student.nationalId} · {student.phone || '—'}</small></td><td><span className="level-badge">{levelLabel(student.academicLevel)}</span></td><td><div className="enrollment-chips">{student.enrollments.filter(e=>e.status==='ACTIVE').slice(0,3).map(e=><span key={e.id}>{e.course.title}</span>)}{student.enrollments.filter(e=>e.status==='ACTIVE').length>3 && <span>+{student.enrollments.filter(e=>e.status==='ACTIVE').length-3}</span>}</div></td><td>{student.enrollments.length ? isoToJalali(student.enrollments[0].enrolledAt) : '—'}</td><td><div className="row-actions"><button type="button" onClick={e=>{e.stopPropagation();handleEdit(student);}} title="ویرایش" aria-label="ویرایش هنرجو"><Pencil size={14}/></button><button type="button" onClick={e=>{e.stopPropagation();void changeStudentArchive(student);}} title={student.isArchived?'بازگردانی به فهرست فعال':'بایگانی هنرجو'} aria-label={student.isArchived?'بازگردانی هنرجو':'بایگانی هنرجو'}>{student.isArchived?<CheckCircle2 size={14}/>:<Archive size={14}/>}</button>{student.isArchived && <button type="button" onClick={e=>{e.stopPropagation();void permanentlyDeleteArchivedStudent(student);}} title="حذف دائمی هنرجوی اشتباهی" aria-label="حذف دائمی هنرجو"><Trash2 size={14}/></button>}</div></td></tr>)}</tbody></table>{!filteredStudents.length && <div className="students-empty">هنرجویی با این فیلتر پیدا نشد.</div>}</div>}
      </section>
      {selectedStudent && <div className="student-detail-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedStudent(null);}}>
        <section className="student-detail-modal" role="dialog" aria-modal="true" aria-labelledby="student-detail-title">
          <header className="student-detail-header"><div><span className="student-detail-kicker">پرونده هنرجو</span><h3 id="student-detail-title">{selectedStudent.fullName}</h3><p>اطلاعات فردی و سوابق ثبت‌نام</p></div><button type="button" className="student-detail-close" onClick={()=>setSelectedStudent(null)} aria-label="بستن پنجره"><X size={18}/></button></header>
          <div className="student-detail-facts">
            <div><span>کد ملی</span><strong>{selectedStudent.nationalId || '—'}</strong></div>
            <div><span>شماره موبایل</span><strong>{selectedStudent.phone || 'ثبت نشده'}</strong></div>
            <div><span>مقطع تحصیلی</span><strong className={selectedStudent.academicLevel==='DOCTORATE'?'detail-doctorate':'detail-master'}>{levelLabel(selectedStudent.academicLevel)}</strong></div>
            <div><span>تعداد دوره‌های فعال</span><strong>{selectedStudent.enrollments.filter(e=>e.status==='ACTIVE').length}</strong></div>
          </div>
          <div className="student-detail-enrollments"><div className="student-detail-section-title"><h4>سوابق دوره‌ها و ثبت‌نام‌ها</h4><span>{selectedStudent.enrollments.length} مورد</span></div>
            {selectedStudent.enrollments.length ? <div className="student-detail-course-list">{selectedStudent.enrollments.map(enrollment=><article key={enrollment.id} className={enrollment.status==='ACTIVE'?'detail-course-active':'detail-course-inactive'}>
              <div className="detail-course-top"><strong>{enrollment.course.title}</strong><span className={enrollment.status==='ACTIVE'?'detail-status-active':'detail-status-inactive'}>{enrollment.status==='ACTIVE'?'فعال':enrollment.status==='CANCELLED'?'لغوشده':enrollment.status==='COMPLETED'?'تکمیل‌شده':enrollment.status}</span></div>
              <div className="detail-course-meta"><span>مقطع دوره: {levelLabel(enrollment.course.level)}</span><span>سال تحصیلی: {enrollment.course.academicYear ?? '—'}</span><span>ترم: {termLabel(enrollment.course.term)}</span><span>تاریخ ثبت‌نام: {enrollment.enrolledAt ? isoToJalali(enrollment.enrolledAt) : '—'}</span></div>
            </article>)}</div> : <div className="students-empty">برای این هنرجو سابقه ثبت‌نامی وجود ندارد.</div>}
          </div>
          <footer className="student-detail-footer"><button type="button" className="secondary-action" onClick={()=>void openStudentFinance(selectedStudent)}><Wallet size={14}/> پرونده مالی</button><button type="button" className="secondary-action" onClick={()=>setSelectedStudent(null)}>بستن</button><button type="button" className="secondary-action" onClick={()=>void changeStudentArchive(selectedStudent)}>{selectedStudent.isArchived?<CheckCircle2 size={14}/>:<Archive size={14}/>} {selectedStudent.isArchived?'بازگردانی به فهرست فعال':'بایگانی هنرجو'}</button><button type="button" className="primary-action" onClick={()=>{const student=selectedStudent;setSelectedStudent(null);handleEdit(student);}}><Pencil size={14}/> ویرایش اطلاعات هنرجو</button></footer>
        </section>
      </div>}
      {financeStudent && <div className="student-detail-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setFinanceStudent(null);setFinanceData(null);}}}>
        <section className="student-detail-modal" role="dialog" aria-modal="true" aria-labelledby="student-finance-title">
          <header className="student-detail-header"><div><span className="student-detail-kicker">سوابق شهریه و پرداخت</span><h3 id="student-finance-title">{financeStudent.fullName}</h3><p>نمایش اطلاعات مالی ثبت‌شده در سامانه</p></div><button type="button" className="student-detail-close" onClick={()=>{setFinanceStudent(null);setFinanceData(null);}} aria-label="بستن پنجره"><X size={18}/></button></header>
          <div className="student-detail-enrollments">
            <div className="student-detail-section-title"><h4>{editingFinanceRegistrationId?'ویرایش پرونده مالی':'ثبت دستی پرونده مالی'}</h4><button type="button" className="secondary-action" onClick={()=>{setManualFinanceOpen(v=>!v);if(manualFinanceOpen)setEditingFinanceRegistrationId(null);}}>{manualFinanceOpen?'بستن فرم': 'ثبت پرونده جدید'}</button></div>
            {manualFinanceOpen && <div className="detail-course-active" style={{marginBottom:12,display:'grid',gap:10}}>
              <strong>دوره‌های مشمول این پرونده</strong>
              <div style={{display:'grid',gap:6}}>{apiCourses.filter(course=>course.level===financeStudent.academicLevel).map(course=><label key={course.id} style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={manualCourseIds.includes(course.id)} onChange={()=>setManualCourseIds(current=>current.includes(course.id)?current.filter(id=>id!==course.id):[...current,course.id])}/>{course.title} · {course.academicYear??'—'} · {termLabel(course.term)}</label>)}</div>
              <label>شهریه اولیه (تومان)<input type="number" min="1" value={manualOriginalTuition} onChange={e=>setManualOriginalTuition(e.target.value)}/></label>
              <label>تخفیف (تومان)<input type="number" min="0" value={manualDiscount} onChange={e=>setManualDiscount(e.target.value)}/></label>
              <label>دلیل تخفیف (اختیاری)<input value={manualDiscountReason} onChange={e=>setManualDiscountReason(e.target.value)}/></label>
              <h4>پرداخت‌های قبلی ثبت‌شده</h4>
              {manualPayments.map((payment,index)=><div key={index} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8}}>
                <input aria-label="مبلغ پرداخت قبلی" type="number" min="1" placeholder="مبلغ پرداخت (تومان)" value={payment.amount} onChange={e=>setManualPayments(rows=>rows.map((row,i)=>i===index?{...row,amount:e.target.value}:row))}/>
                <input aria-label="تاریخ پرداخت قبلی" type="text" inputMode="numeric" placeholder="۱۴۰۵/۰۷/۳۰" value={payment.paymentDate} onChange={e=>setManualPayments(rows=>rows.map((row,i)=>i===index?{...row,paymentDate:e.target.value.replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))}:row))}/>
                <select aria-label="روش پرداخت قبلی" value={payment.method} onChange={e=>setManualPayments(rows=>rows.map((row,i)=>i===index?{...row,method:e.target.value}:row))}><option value="BANK_TRANSFER">بانکی</option><option value="CASH">نقدی</option><option value="CARD">کارت‌خوان</option><option value="OTHER">سایر</option></select>
                <input aria-label="شناسه پرداخت قبلی" placeholder="شماره پیگیری/توضیح" value={payment.reference} onChange={e=>setManualPayments(rows=>rows.map((row,i)=>i===index?{...row,reference:e.target.value}:row))}/>
                <button type="button" className="secondary-action" onClick={()=>setManualPayments(rows=>rows.filter((_,i)=>i!==index))}>حذف پرداخت</button>
              </div>)}
              <button type="button" className="secondary-action" onClick={()=>setManualPayments(rows=>[...rows,{amount:'',paymentDate:'',method:'BANK_TRANSFER',reference:''}])}>افزودن پرداخت قبلی</button>
              <h4>برنامه اقساط (جمع اقساط برابر شهریه نهایی باشد)</h4>
              {manualInstallments.map((installment,index)=><div key={index} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
                <input aria-label={'مبلغ قسط '+(index+1)} type="number" min="1" placeholder={'مبلغ قسط '+(index+1)+' (تومان)'} value={installment.amount} onChange={e=>setManualInstallments(rows=>rows.map((row,i)=>i===index?{...row,amount:e.target.value}:row))}/>
                <label>سررسید قسط {index+1}<input aria-label={'سررسید قسط '+(index+1)} type="text" inputMode="numeric" placeholder="۱۴۰۵/۰۷/۳۰" value={installment.dueDate} onChange={e=>setManualInstallments(rows=>rows.map((row,i)=>i===index?{...row,dueDate:e.target.value.replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))}:row))}/></label>
                {manualInstallments.length>1 && <button type="button" className="secondary-action" onClick={()=>setManualInstallments(rows=>rows.filter((_,i)=>i!==index))}>حذف قسط</button>}
              </div>)}
              <button type="button" className="secondary-action" onClick={()=>setManualInstallments(rows=>[...rows,{amount:'',dueDate:''}])}>افزودن قسط با سررسید دستی</button>
              <p>جمع پرداخت‌های قبلی: {manualPayments.reduce((sum,p)=>sum+(Number(p.amount)||0),0).toLocaleString('fa-IR')} تومان · شهریه نهایی: {Math.max(0,(Number(manualOriginalTuition)||0)-(Number(manualDiscount)||0)).toLocaleString('fa-IR')} تومان · جمع اقساط: {manualInstallments.reduce((sum,i)=>sum+(Number(i.amount)||0),0).toLocaleString('fa-IR')} تومان</p>
              <button type="button" className="primary-action" disabled={manualFinanceSaving} onClick={()=>void saveManualFinance()}>{manualFinanceSaving?'در حال ثبت…':editingFinanceRegistrationId?'ذخیره اصلاحات مالی':'ثبت پرونده مالی دستی'}</button>
            </div>}
          </div>{financeLoading ? <div className="students-empty">در حال دریافت پرونده مالی…</div> : financeError ? <div className="students-error">{financeError}</div> : financeData && <div className="student-detail-enrollments">
            {!financeData.registrations?.length && <div className="students-empty">برای این هنرجو هنوز پرونده مالی از مسیر ثبت‌نام ایجاد نشده است.</div>}
            {(financeData.registrations || []).map((registration:any)=><article key={registration.id} className="detail-course-active" style={{marginBottom:12}}>
              <div className="detail-course-top"><strong>{registration.courses?.map((course:any)=>course.courseTitleSnapshot).join('، ') || 'ثبت‌نام بدون عنوان دوره'}</strong><span className="detail-status-active">{registration.status==='APPROVED'?'تأییدشده':registration.status}</span><button type="button" className="secondary-action" onClick={()=>{setEditingFinanceRegistrationId(registration.id);setManualCourseIds([]);setManualOriginalTuition(String(registration.originalTuition));setManualDiscount(String(registration.discountAmount));setManualDiscountReason('');setManualPayments([]);setManualInstallments((registration.installments||[]).map((i:any)=>({id:i.id,amount:String(i.amount),dueDate:isoToJalali(i.dueDate)})));setManualFinanceOpen(true);}}>ویرایش مالی</button></div>
              <div className="student-detail-facts">
                <div><span>شهریه اولیه</span><strong>{Number(registration.originalTuition).toLocaleString('fa-IR')} تومان</strong></div>
                <div><span>تخفیف</span><strong>{Number(registration.discountAmount).toLocaleString('fa-IR')} تومان</strong></div>
                <div><span>شهریه نهایی</span><strong>{Number(registration.finalTuition).toLocaleString('fa-IR')} تومان</strong></div>
              </div>
              <h4>پرداخت‌ها</h4>
              {registration.payments?.length ? registration.payments.map((payment:any)=><div key={payment.id} className="detail-course-meta"><span>{payment.purpose==='INITIAL'?'پرداخت اولیه':'پرداخت قسط'}</span><span>{Number(payment.approvedAmount ?? payment.claimedAmount).toLocaleString('fa-IR')} تومان</span><span>{payment.paymentDate ? isoToJalali(payment.paymentDate) : '—'}</span><span>{payment.status==='APPROVED'?'تأییدشده':payment.status==='PENDING'?'در انتظار تأیید':payment.status}</span></div>) : <p>پرداختی ثبت نشده است.</p>}
              <h4>اقساط و سررسیدها</h4>
              <div className="student-detail-facts">
                <div><span>پرداخت تأییدشده</span><strong>{Number(registration.paidTotal || 0).toLocaleString('fa-IR')} تومان</strong></div>
                <div><span>مانده بدهی</span><strong>{Number(registration.balance ?? registration.finalTuition).toLocaleString('fa-IR')} تومان</strong></div>
              </div>
              {registration.installments?.length ? registration.installments.map((installment:any)=><div key={installment.id} className="detail-course-meta"><span>قسط {installment.sequence}</span><span>مبلغ: {Number(installment.amount).toLocaleString('fa-IR')} تومان</span><span>پرداخت: {Number(installment.paid || 0).toLocaleString('fa-IR')} تومان</span><span>مانده: {Number(installment.balance ?? installment.amount).toLocaleString('fa-IR')} تومان</span><span>سررسید: {isoToJalali(installment.dueDate)}</span><span>{installment.status==='PAID'?'پرداخت‌شده':installment.status==='OVERDUE'?'معوق':installment.status==='PARTIALLY_PAID'?'پرداخت ناقص':'در انتظار پرداخت'}</span></div>) : <p>قسطی ثبت نشده است.</p>}
            </article>)}
          </div>}
          <footer className="student-detail-footer"><button type="button" className="secondary-action" onClick={()=>{setFinanceStudent(null);setFinanceData(null);}}>بستن</button></footer>
        </section>
      </div>}
    </div>
  );
};
