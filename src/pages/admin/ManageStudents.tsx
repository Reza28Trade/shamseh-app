import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, Filter, Pencil, Search, Trash2, Upload, UserPlus, Users, X } from 'lucide-react';
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
  enrollments: EnrollmentView[];
};

const levelLabel = (level?: string | null) => level === 'MASTER' ? 'ارشد' : level === 'DOCTORATE' ? 'دکتری' : 'نامشخص';
const termLabel = (term?: string | null) => term || 'بدون ترم';
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
  const [studentLevelFilter, setStudentLevelFilter] = useState<'ALL' | 'MASTER' | 'DOCTORATE'>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | string>('ALL');
  const [termFilter, setTermFilter] = useState<'ALL' | string>('ALL');
  const [search, setSearch] = useState('');
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
        schedule: '', startDate: '', description: course.description ?? '', term: course.term, price: course.price ? Number(course.price) : 0,
        category: course.category, coverImage: course.coverImage, academicYear: course.academicYear, classDays: course.classDays ?? [],
        classStartTime: course.classStartTime, classEndTime: course.classEndTime,
      })));
      setApiStudents(data.map((student: any) => ({
        id: student.id, fullName: student.fullName, nationalId: student.nationalId, academicLevel: student.academicLevel ?? '',
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
    if (studentLevelFilter !== 'ALL' && student.academicLevel !== studentLevelFilter) return false;
    if (search && ![student.fullName, student.nationalId, student.phone || ''].some(v => v.toLowerCase().includes(search.toLowerCase()))) return false;
    const matching = student.enrollments.filter(e => e.status === 'ACTIVE').filter(e => {
      if (yearFilter !== 'ALL' && String(e.course.academicYear ?? '') !== yearFilter) return false;
      if (termFilter !== 'ALL' && e.course.term !== termFilter) return false;
      return true;
    });
    return yearFilter === 'ALL' && termFilter === 'ALL' ? true : matching.length > 0;
  }), [apiStudents, studentLevelFilter, yearFilter, termFilter, search]);

  const activeEnrollments = apiStudents.reduce((n,s) => n + s.enrollments.filter(e => e.status === 'ACTIVE').length, 0);
  const masterCount = apiStudents.filter(s => s.academicLevel === 'MASTER').length;
  const doctorateCount = apiStudents.filter(s => s.academicLevel === 'DOCTORATE').length;
  const termCounts = availableTerms.map(term => ({ term, count: apiStudents.filter(s => s.enrollments.some(e => e.status === 'ACTIVE' && e.course.term === term)).length }));
  const maxTermCount = Math.max(1, ...termCounts.map(x => x.count));

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
          <span className="students-eyebrow">STUDENT MANAGEMENT</span>
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
          <div className="section-title"><BarChart3 size={17}/><h3>توزیع هنرجویان بر اساس ترم</h3></div>
          <div className="term-bars">
            {termCounts.length ? termCounts.map(item => <div className="term-bar-row" key={item.term}><span>{item.term}</span><div><i style={{width: `${Math.max(7, item.count / maxTermCount * 100)}%`}}/></div><b>{item.count}</b></div>) : <p>هنوز داده‌ای برای نمایش آماری ثبت نشده است.</p>}
          </div>
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
            <button className="primary-action" type="submit">{editingStudentId ? 'ذخیره تغییرات' : 'ثبت هنرجو'}</button>
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
        <div className="list-head"><div><div className="section-title"><Users size={17}/><h3>فهرست هنرجویان</h3></div><span>{filteredStudents.length} نفر نمایش داده می‌شود</span></div><div className="student-search"><Search size={15}/><input placeholder="جستجوی نام، کد ملی یا موبایل" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
        <div className="student-filters"><Filter size={15}/><select value={studentLevelFilter} onChange={e=>setStudentLevelFilter(e.target.value as any)}><option value="ALL">همه مقاطع</option><option value="MASTER">ارشد</option><option value="DOCTORATE">دکتری</option></select><select value={yearFilter} onChange={e=>setYearFilter(e.target.value)}><option value="ALL">همه سال‌ها</option>{availableYears.map(y=><option key={y} value={y}>{y}</option>)}</select><select value={termFilter} onChange={e=>setTermFilter(e.target.value)}><option value="ALL">همه ترم‌ها</option>{availableTerms.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        {error && <div className="students-error">{error}</div>}
        {loading ? <div className="students-empty">در حال دریافت فهرست هنرجویان...</div> : <div className="student-table-wrap"><table><thead><tr><th>هنرجو</th><th>مقطع</th><th>دوره‌های فعال</th><th>آخرین ثبت‌نام</th><th>عملیات</th></tr></thead><tbody>{filteredStudents.map(student=><tr key={student.id}><td><strong>{student.fullName}</strong><small>{student.nationalId} · {student.phone || '—'}</small></td><td><span className="level-badge">{levelLabel(student.academicLevel)}</span></td><td><div className="enrollment-chips">{student.enrollments.filter(e=>e.status==='ACTIVE').slice(0,3).map(e=><span key={e.id}>{e.course.title}</span>)}{student.enrollments.filter(e=>e.status==='ACTIVE').length>3 && <span>+{student.enrollments.filter(e=>e.status==='ACTIVE').length-3}</span>}</div></td><td>{student.enrollments.length ? new Date(student.enrollments[0].enrolledAt).toLocaleDateString('fa-IR') : '—'}</td><td><div className="row-actions"><button type="button" onClick={()=>handleEdit(student)} title="ویرایش"><Pencil size={14}/></button><button type="button" className="danger" title="حذف" onClick={()=>void (async()=>{if(!window.confirm(`حذف «${student.fullName}»؟`)) return; const response=await fetch(`/api/admin/students/${student.id}`,{method:'DELETE',credentials:'include'}); if(!response.ok){setError((await response.json().catch(()=>null))?.message||'حذف انجام نشد.');return;} await loadStudents();})()}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table>{!filteredStudents.length && <div className="students-empty">هنرجویی با این فیلتر پیدا نشد.</div>}</div>}
      </section>
    </div>
  );
};
