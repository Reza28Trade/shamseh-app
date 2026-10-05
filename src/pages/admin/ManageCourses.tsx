import React, { useState } from 'react';
import type { Course } from '../../types';
import { Plus, Trash2, FileText, Sparkles } from 'lucide-react';

interface ManageCoursesProps {
  courses: Course[];
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (course: Course) => void;
  onDeleteCourse: (id: string) => void;
}

export const ManageCourses: React.FC<ManageCoursesProps> = ({
  courses,
  onAddCourse,
  onDeleteCourse,
}) => {
  const [title, setTitle] = useState('');
  const [professor, setProfessor] = useState('');
  const [term, setTerm] = useState<'تابستان' | 'پاییز' | 'زمستان'>('پاییز');
  const [level, setLevel] = useState<'ارشد' | 'دکتری'>('ارشد');
  const [schedule, setSchedule] = useState('');
  const [startDate, setStartDate] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [adobeConnectUrl, setAdobeConnectUrl] = useState('');
  const [syllabusInput, setSyllabusInput] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachments, setAttachments] = useState<{ id: string; name: string; url: string; type: 'pdf' | 'video' | 'link' }[]>([]);

  const handleAddAttachment = () => {
    if (!attachmentName || !attachmentUrl) return;
    setAttachments([
      ...attachments,
      { id: `att-${Date.now()}`, name: attachmentName, url: attachmentUrl, type: 'link' }
    ]);
    setAttachmentName('');
    setAttachmentUrl('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !professor) return;

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      term,
      level,
      title,
      professor,
      schedule,
      startDate,
      price,
      category: category || 'عمومی',
      coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60',
      description,
      syllabus: syllabusInput ? syllabusInput.split('\n').filter(Boolean) : [],
      adobeConnectUrl,
      attachments,
    };

    onAddCourse(newCourse);
    setTitle('');
    setProfessor('');
    setSchedule('');
    setStartDate('');
    setPrice(0);
    setCategory('');
    setDescription('');
    setAdobeConnectUrl('');
    setSyllabusInput('');
    setAttachments([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', boxSizing: 'border-box' }}>
      
      <div style={{ background: 'linear-gradient(135deg, rgba(109, 0, 26, 0.2) 0%, rgba(10, 10, 10, 0.8) 100%)', border: '1px solid rgba(109, 0, 26, 0.4)', padding: '24px 32px', borderRadius: '20px', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="#ff3366" /> مدیریت و تعریف دوره‌های آموزشی
          </h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>تعریف تخصصی دوره‌های آمادگی آزمون ارشد و دکتری با امکانات کامل پیوست و لینک کلاس</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} color="#ff3366" /> فرم ایجاد دوره جدید
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>عنوان دوره آموزشی *</label>
            <input 
              type="text" 
              placeholder="مثال: متون هنری ارشد" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>نام استاد مدرس *</label>
            <input 
              type="text" 
              placeholder="مثال: دکتر احمدی" 
              value={professor} 
              onChange={e => setProfessor(e.target.value)} 
              required 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>لینک کلاس ادوبی کانکت</label>
            <input 
              type="url" 
              placeholder="https://connect.shamseh.ir/class1" 
              value={adobeConnectUrl} 
              onChange={e => setAdobeConnectUrl(e.target.value)} 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>مبلغ دوره (تومان)</label>
            <input 
              type="number" 
              placeholder="مثال: 1500000" 
              value={price} 
              onChange={e => setPrice(Number(e.target.value))} 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>ترم تحصیلی</label>
            <select 
              value={term} 
              onChange={e => setTerm(e.target.value as any)} 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="تابستان">تابستان</option>
              <option value="پاییز">پاییز</option>
              <option value="زمستان">زمستان</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>مقطع تحصیلی</label>
            <select 
              value={level} 
              onChange={e => setLevel(e.target.value as any)} 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="ارشد">ارشد</option>
              <option value="دکتری">دکتری</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>روز و ساعت برگزاری</label>
            <input 
              type="text" 
              placeholder="مثال: پنجشنبه ۱۹-۱۵" 
              value={schedule} 
              onChange={e => setSchedule(e.target.value)} 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>تاریخ شروع دوره</label>
            <input 
              type="text" 
              placeholder="مثال: ۱۴۰۵/۰۷/۲۵" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>

        </div>

        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 700 }}>توضیحات کامل دوره</label>
          <textarea 
            placeholder="توضیحات تکمیلی و سرفصل‌ها..." 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            rows={3} 
            style={{ width: '100%', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} 
          />
        </div>

        <div style={{ backgroundColor: 'rgba(10, 10, 12, 0.5)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ fontSize: '11px', color: '#ff3366', display: 'block', marginBottom: '10px', fontWeight: 700 }}>افزودن جزوات و فایل‌های جلسات</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="نام فایل (مثلا جزوه جلسه اول)" 
              value={attachmentName} 
              onChange={e => setAttachmentName(e.target.value)} 
              style={{ flex: 1, minWidth: '200px', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', outline: 'none' }} 
            />
            <input 
              type="url" 
              placeholder="لینک دانلود فایل" 
              value={attachmentUrl} 
              onChange={e => setAttachmentUrl(e.target.value)} 
              style={{ flex: 1, minWidth: '200px', backgroundColor: 'rgba(20, 20, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', outline: 'none' }} 
            />
            <button type="button" onClick={handleAddAttachment} style={{ backgroundColor: 'rgba(109, 0, 26, 0.4)', border: '1px solid #6D001A', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
              افزودن فایل
            </button>
          </div>
          {attachments.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {attachments.map(att => (
                <span key={att.id} style={{ backgroundColor: 'rgba(109,0,26,0.2)', border: '1px solid rgba(109,0,26,0.4)', color: '#f87171', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={12} /> {att.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <button type="submit" style={{ padding: '14px', background: 'linear-gradient(135deg, #6D001A 0%, #a21c3a 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(109, 0, 26, 0.4)', transition: 'transform 0.1s' }}>
          ثبت نهایی دوره در سیستم
        </button>
      </form>

      <div style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', padding: '24px 32px', borderRadius: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 16px 0' }}>دوره‌های ثبت‌شده در سیستم ({courses.length})</h3>
        {courses.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {courses.map(course => (
              <div key={course.id} style={{ backgroundColor: 'rgba(20, 20, 25, 0.9)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: 0 }}>{course.title}</h4>
                  <span style={{ fontSize: '10px', backgroundColor: 'rgba(109, 0, 26, 0.2)', color: '#ff3366', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{course.level} - {course.term}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>استاد: {course.professor}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#38bdf8' }}>{course.price ? `${course.price.toLocaleString()} تومان` : 'رایگان'}</span>
                  <button onClick={() => onDeleteCourse(course.id)} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Trash2 size={12} /> حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>هنوز هیچ دوره‌ای ثبت نشده است. از فرم بالا اولین دوره را اضافه کنید.</p>
        )}
      </div>

    </div>
  );
};