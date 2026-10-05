import React, { useState } from 'react';
import type { Course } from '../../types';
import { Search, BookOpen, User, Calendar, Video } from 'lucide-react';

interface CourseCatalogProps {
  courses: Course[];
  onEnrollCourse?: (courseId: string) => void;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({ courses }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  // فیلتر کردن دوره‌ها بر اساس جستجو، ترم و مقطع
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.professor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTerm = selectedTerm === 'all' || course.term === selectedTerm;
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;

    return matchesSearch && matchesTerm && matchesLevel;
  });

  return (
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#050505', color: '#f8fafc', direction: 'rtl', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box', padding: '40px' }}>
      
      {/* هدر صفحه کاتالوگ */}
      <div style={{ maxWidth: '1100px', margin: '0 auto 30px auto', background: 'linear-gradient(135deg, rgba(109, 0, 26, 0.25) 0%, rgba(10, 10, 10, 0.85) 100%)', border: '1px solid rgba(109, 0, 26, 0.4)', padding: '32px', borderRadius: '24px', backdropFilter: 'blur(16px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={22} color="#ff3366" /> کاتالوگ دوره‌های آموزشی آکادمی شمسه
        </h1>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>مجموعه‌ای از تخصصی‌ترین دوره‌های آمادگی آزمون ارشد و دکتری پژوهش هنر و تاریخ هنر</p>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* بخش فیلترها و جستجو */}
        <div style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px 24px', borderRadius: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ flex: 1, minWidth: '260px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '14px' }} />
            <input 
              type="text" 
              placeholder="جستجو بر اساس نام دوره یا استاد..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 14px 12px 40px', borderRadius: '12px', fontSize: '12px', outline: 'none' }} 
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select 
              value={selectedTerm} 
              onChange={e => setSelectedTerm(e.target.value)} 
              style={{ backgroundColor: 'rgba(20, 20, 25, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">همه ترم‌ها</option>
              <option value="پاییز">ترم پاییز</option>
              <option value="زمستان">ترم زمستان</option>
              <option value="تابستان">ترم تابستان</option>
            </select>

            <select 
              value={selectedLevel} 
              onChange={e => setSelectedLevel(e.target.value)} 
              style={{ backgroundColor: 'rgba(20, 20, 25, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">همه مقاطع</option>
              <option value="ارشد">مقطع ارشد</option>
              <option value="دکتری">مقطع دکتری</option>
            </select>
          </div>

        </div>

        {/* لیست دوره‌ها */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredCourses.length > 0 ? (
            filteredCourses.map(course => (
              <div key={course.id} style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#fff', margin: 0 }}>{course.title}</h3>
                  <span style={{ fontSize: '10px', backgroundColor: 'rgba(109, 0, 26, 0.25)', color: '#ff3366', padding: '4px 10px', borderRadius: '8px', fontWeight: 800 }}>
                    {course.level} {course.term ? `- ${course.term}` : ''}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} color="#38bdf8" /> استاد مدرس: <strong>{course.professor}</strong>
                </p>

                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="#fbbf24" /> زمان: {course.schedule || 'تعیین نشده'} (شروع: {course.startDate || 'به زودی'})
                </p>

                <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0', lineHeight: 1.6 }}>{course.description}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#34d399' }}>
                    {course.price ? `${course.price.toLocaleString()} تومان` : 'تماس با پشتیبانی'}
                  </span>
                  
                  {course.adobeConnectUrl && (
                    <a href={course.adobeConnectUrl} target="_blank" rel="noreferrer" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Video size={14} /> کلاس آنلاین
                    </a>
                  )}
                </div>

              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', backgroundColor: 'rgba(14, 14, 17, 0.75)', borderRadius: '24px', color: '#94a3b8', fontSize: '13px' }}>
              هیچ دوره‌ای با معیارهای جستجوی شما یافت نشد.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};