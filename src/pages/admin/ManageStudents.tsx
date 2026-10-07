import React, { useEffect, useState } from 'react';
import type { Student, Course } from '../../types';
import { UserPlus, Trash2, Users, CheckCircle, Pencil, X, Download } from 'lucide-react';

interface ManageStudentsProps {
  students: Student[];
  courses: Course[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
}

export const ManageStudents: React.FC<ManageStudentsProps> = ({
  students: _students,
  courses: _courses,
  onAddStudent: _onAddStudent,
  onDeleteStudent: _onDeleteStudent,
}) => {
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [academicLevel, setAcademicLevel] = useState<'MASTER' | 'DOCTORATE' | ''>('');
  const [apiStudents, setApiStudents] = useState<Student[]>([]);
  const [apiCourses, setApiCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentGroup, setStudentGroup] = useState<'ALL' | 'MASTER' | 'DOCTORATE'>('ALL');

  const handleDelete = async (studentId: string) => {
    const student = apiStudents.find(item => item.id === studentId);
    if (!student) return;
    if (!window.confirm(`آیا از حذف «${student.fullName}» مطمئن هستید؟ این عملیات اطلاعات حساب و دسترسی‌های هنرجو را حذف می‌کند.`)) return;
    setError('');
    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'حذف هنرجو انجام نشد.');
      }
      if (editingStudentId === studentId) resetForm();
      await loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف هنرجو انجام نشد.');
    }
  };

  const handleCheckboxChange = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter(id => id !== courseId));
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsResponse, coursesResponse] = await Promise.all([
        fetch('/api/admin/students', { credentials: 'include' }),
        fetch('/api/courses', { credentials: 'include' }),
      ]);
      if (!studentsResponse.ok || !coursesResponse.ok) throw new Error('load');
      const [data, courseData] = await Promise.all([
        studentsResponse.json(),
        coursesResponse.json(),
      ]);
      setApiCourses(courseData.map((course: any) => ({
        id: course.id,
        title: course.title,
        professor: course.professor ?? '',
        level: course.level ?? '',
        schedule: '',
        startDate: '',
        description: course.description ?? '',
        term: course.term,
        price: course.price ? Number(course.price) : 0,
        category: course.category,
        coverImage: course.coverImage,
      })));
      setApiStudents(data.map((student: any) => ({
        id: student.id,
        fullName: student.fullName,
        nationalId: student.nationalId,
        academicLevel: student.academicLevel ?? '',
        enrolledCourseIds: student.enrollments
          .filter((enrollment: any) => enrollment.status === 'ACTIVE')
          .map((enrollment: any) => enrollment.courseId),
        levels: Array.from(new Set(
          student.enrollments
            .filter((enrollment: any) => enrollment.status === 'ACTIVE' && enrollment.course?.level)
            .map((enrollment: any) => enrollment.course.level),
        )),
      })));
    } catch {
      setError('دریافت فهرست هنرجویان انجام نشد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents();
  }, []);


  const exportStudents = async () => {
    const response = await fetch('/api/admin/students/export', { credentials: 'include' });
    if (!response.ok) { setError('خروجی Excel دانشجویان دریافت نشد.'); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'students.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFullName('');
    setNationalId('');
    setPhone('');
    setSelectedCourses([]);
    setEditingStudentId(null);
  };

  const handleEdit = (student: Student) => {
    setEditingStudentId(student.id);
    setFullName(student.fullName);
    setNationalId(student.nationalId);
    setSelectedCourses(student.enrolledCourseIds);
    setAcademicLevel(student.academicLevel ?? '');
    setPhone('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !nationalId || !academicLevel || (!editingStudentId && !phone)) return;

    void (async () => {
      setError('');
      try {
        if (editingStudentId) {
          const response = await fetch(`/api/admin/students/${editingStudentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fullName, nationalId, academicLevel, ...(phone ? { phone } : {}), courseIds: selectedCourses }),
          });
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.message || 'ویرایش هنرجو انجام نشد.');
          }
        } else {
          const response = await fetch('/api/admin/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fullName, nationalId, phone, academicLevel }),
          });
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.message || 'ثبت هنرجو انجام نشد.');
          }

          const created = await response.json();
          for (const courseId of selectedCourses) {
            const enrollmentResponse = await fetch(
              `/api/admin/students/${created.student.id}/enrollments/${courseId}`,
              { method: 'POST', credentials: 'include' },
            );
            if (!enrollmentResponse.ok) {
              const body = await enrollmentResponse.json().catch(() => null);
              throw new Error(body?.message || 'ثبت دسترسی دوره برای هنرجو انجام نشد.');
            }
          }
        }

        resetForm();
        await loadStudents();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'عملیات هنرجو انجام نشد.');
      }
    })();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* هدر صفحه */}
      <div style={{ background: 'linear-gradient(135deg, rgba(109, 0, 26, 0.2) 0%, rgba(10, 10, 10, 0.8) 100%)', border: '1px solid rgba(109, 0, 26, 0.4)', padding: '24px 32px', borderRadius: '20px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={20} color="#ff3366" /> مدیریت دانشجویان و دسترسی دوره‌ها
        </h2><button type="button" onClick={() => void exportStudents()} style={{ padding: '10px 14px', background: 'rgba(255,255,255,.06)', color: '#fff', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><Download size={14} /> خروجی Excel</button></div>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>ثبت‌نام دانشجویان جدید و تخصیص دسترسی به دوره‌های ارشد و دکتری</p>
      </div>

      {/* فرم ثبت‌نام شیشه‌ای */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} color="#ff3366" /> {editingStudentId ? 'ویرایش هنرجو' : 'ثبت هنرجو جدید'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>نام و نام خانوادگی هنرجو *</label>
            <input 
              type="text" 
              placeholder="مثال: علی رضایی" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              required 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>کد ملی (نام کاربری) *</label>
            <input 
              type="text" 
              placeholder="مثال: 0012345678" 
              value={nationalId} 
              onChange={e => setNationalId(e.target.value)} 
              required 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>مقطع تحصیلی *</label>
            <select
              value={academicLevel}
              onChange={e => setAcademicLevel(e.target.value as 'MASTER' | 'DOCTORATE' | '')}
              required
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="">انتخاب مقطع</option>
              <option value="MASTER">ارشد</option>
              <option value="DOCTORATE">دکتری</option>
            </select>
          </div>
        </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>شماره موبایل (رمز عبور) *</label>
            <input
              type="tel"
              placeholder={editingStudentId ? "برای تغییر رمز عبور، شماره موبایل جدید را وارد کنید" : "مثال: 09121234567"}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required={!editingStudentId}
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

        {/* انتخاب دوره‌ها */}
        <div>
          <label style={{ fontSize: '11px', color: '#ff3366', display: 'block', marginBottom: '10px', fontWeight: 700 }}>انتخاب دوره‌های مجاز برای هنرجو</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {apiCourses.map(course => {
              const isSelected = selectedCourses.includes(course.id);
              return (
                <div className="admin-legacy-page admin-students-page" className="admin-legacy-page admin-students-page" 
                  key={course.id} 
                  onClick={() => handleCheckboxChange(course.id)}
                  style={{ backgroundColor: isSelected ? 'rgba(109, 0, 26, 0.25)' : 'rgba(20, 20, 25, 0.6)', border: `1px solid ${isSelected ? '#6D001A' : 'rgba(255,255,255,0.06)'}`, padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '12px', color: '#fff', fontWeight: 700 }}>{course.title}</span>
                  {isSelected && <CheckCircle size={16} color="#ff3366" />}
                </div>
              );
            })}
          </div>
        </div>

        <button type="submit" style={{ padding: '14px', background: 'linear-gradient(135deg, #6D001A 0%, #a21c3a 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(109, 0, 26, 0.4)' }}>
          {editingStudentId ? 'ذخیره تغییرات' : 'ثبت هنرجو در سیستم'}
        </button>
        {editingStudentId && (
          <button type="button" onClick={resetForm} style={{ padding: '12px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <X size={14} /> انصراف از ویرایش
          </button>
        )}
      </form>

      {/* لیست دانشجویان */}
      <div style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', padding: '24px 32px', borderRadius: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 16px 0' }}>هنرجویان ثبت‌شده ({apiStudents.length})</h3>
        {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '10px 12px', borderRadius: '10px', fontSize: '11px', marginBottom: '14px' }}>{error}</div>}
        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>در حال دریافت فهرست هنرجویان...</p>
        ) : apiStudents.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {([
                ['ALL', 'همه'],
                ['MASTER', 'ارشد'],
                ['DOCTORATE', 'دکتری'],
              ] as const).map(([value, label]) => {
                const count = value === 'ALL'
                  ? apiStudents.length
                  : apiStudents.filter(student => student.academicLevel === (value === 'DOCTORATE' ? 'DOCTORATE' : 'MASTER')).length;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStudentGroup(value)}
                    style={{
                      border: studentGroup === value ? '1px solid #6D001A' : '1px solid rgba(255,255,255,.08)',
                      background: studentGroup === value ? 'rgba(109,0,26,.3)' : 'rgba(255,255,255,.04)',
                      color: '#fff',
                      padding: '8px 13px',
                      borderRadius: 9,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {apiStudents
                .filter(student => {
                  if (studentGroup === 'ALL') return true;
                  return student.academicLevel === (studentGroup === 'DOCTORATE' ? 'DOCTORATE' : 'MASTER');
                })
                .map(st => (
                  <div key={st.id} style={{ backgroundColor: 'rgba(20, 20, 25, 0.9)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: '0 0 4px 0' }}>{st.fullName}</h4>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>کد ملی: {st.nationalId} | دوره‌های فعال: {st.enrolledCourseIds.length} دوره</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(st)} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Pencil size={12} /> ویرایش
                      </button>
                      <button onClick={() => void handleDelete(st.id)} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trash2 size={12} /> حذف
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>هنوز هیچ دانشجویی ثبت نشده است.</p>
        )}
      </div>

    </div>
  );
};