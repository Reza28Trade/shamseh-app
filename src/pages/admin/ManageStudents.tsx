import React, { useEffect, useState } from 'react';
import type { Student, Course } from '../../types';
import { UserPlus, Trash2, Users, CheckCircle } from 'lucide-react';

interface ManageStudentsProps {
  students: Student[];
  courses: Course[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
}

export const ManageStudents: React.FC<ManageStudentsProps> = ({
  students,
  courses,
  onAddStudent: _onAddStudent,
  onDeleteStudent: _onDeleteStudent,
}) => {
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [apiStudents, setApiStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

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
      const response = await fetch('/api/admin/students', { credentials: 'include' });
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      setApiStudents(data.map((student: any) => ({
        id: student.id,
        fullName: student.fullName,
        nationalId: student.nationalId,
        enrolledCourseIds: student.enrollments
          .filter((enrollment: any) => enrollment.status === 'ACTIVE')
          .map((enrollment: any) => enrollment.courseId),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !nationalId || !phone) return;

    void (async () => {
      setError('');
      try {
        const response = await fetch('/api/admin/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ fullName, nationalId, phone }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.message || 'create');
        }

        const created = await response.json();

        for (const courseId of selectedCourses) {
          const enrollmentResponse = await fetch(
            `/api/admin/students/${created.student.id}/enrollments/${courseId}`,
            { method: 'POST', credentials: 'include' },
          );
          if (!enrollmentResponse.ok) throw new Error('enroll');
        }

        setFullName('');
        setNationalId('');
        setPhone('');
        setSelectedCourses([]);
        await loadStudents();
      } catch (err) {
        setError(err instanceof Error && err.message !== 'create' && err.message !== 'enroll'
          ? err.message
          : 'ثبت هنرجو انجام نشد. کد ملی یا اطلاعات واردشده ممکن است تکراری باشد.');
      }
    })();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* هدر صفحه */}
      <div style={{ background: 'linear-gradient(135deg, rgba(109, 0, 26, 0.2) 0%, rgba(10, 10, 10, 0.8) 100%)', border: '1px solid rgba(109, 0, 26, 0.4)', padding: '24px 32px', borderRadius: '20px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={20} color="#ff3366" /> مدیریت دانشجویان و دسترسی دوره‌ها
        </h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>ثبت‌نام دانشجویان جدید و تخصیص دسترسی به دوره‌های ارشد و دکتری</p>
      </div>

      {/* فرم ثبت‌نام شیشه‌ای */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} color="#ff3366" /> ثبت دانشجو جدید
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
        </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>شماره موبایل (رمز عبور) *</label>
            <input
              type="tel"
              placeholder="مثال: 09121234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

        {/* انتخاب دوره‌ها */}
        <div>
          <label style={{ fontSize: '11px', color: '#ff3366', display: 'block', marginBottom: '10px', fontWeight: 700 }}>انتخاب دوره‌های مجاز برای هنرجو</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {courses.map(course => {
              const isSelected = selectedCourses.includes(course.id);
              return (
                <div 
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
          ثبت هنرجو در سیستم
        </button>
      </form>

      {/* لیست دانشجویان */}
      <div style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', padding: '24px 32px', borderRadius: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 16px 0' }}>هنرجویان ثبت‌شده ({apiStudents.length})</h3>
        {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '10px 12px', borderRadius: '10px', fontSize: '11px', marginBottom: '14px' }}>{error}</div>}
        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>در حال دریافت فهرست هنرجویان...</p>
        ) : apiStudents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {apiStudents.map(st => (
              <div key={st.id} style={{ backgroundColor: 'rgba(20, 20, 25, 0.9)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: '0 0 4px 0' }}>{st.fullName}</h4>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>کد ملی: {st.nationalId} | دوره‌های فعال: {st.enrolledCourseIds.length} دوره</span>
                </div>
                <button onClick={() => void _onDeleteStudent(st.id)} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Trash2 size={12} /> حذف
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>هنوز هیچ دانشجویی ثبت نشده است.</p>
        )}
      </div>

    </div>
  );
};