import React from 'react';
import { useStore } from '../../store/useStore';
import { BookOpen, Users, ClipboardList, Bell, ArrowLeft, Activity } from 'lucide-react';

interface AdminDashboardProps {
  adminName?: string;
  onNavigate: (tab: 'dashboard' | 'courses' | 'students' | 'admins' | 'logs' | 'messages' | 'notifications' | 'rules' | 'offlineRequests' | 'mockExams' | 'counseling') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminName = 'مدیر سیستم', onNavigate }) => {
  const { courses, students } = useStore();
  const activeCourses = courses.filter((course: typeof courses[number]) => (course as any).status !== 'ARCHIVED');
  const stats = [
    { label: 'دوره‌های آموزشی', value: activeCourses.length, note: 'دوره فعال', icon: BookOpen, tab: 'courses' },
    { label: 'هنرجویان', value: students.length, note: 'حساب ثبت‌شده', icon: Users, tab: 'students' },
    { label: 'آزمون‌های آزمایشی', value: '—', note: 'مدیریت آزمون‌ها', icon: ClipboardList, tab: 'mockExams' },
    { label: 'اطلاعیه‌ها', value: '—', note: 'مرکز اطلاع‌رسانی', icon: Bell, tab: 'notifications' },
  ] as const;
  return <div className="admin-dashboard-page">
    <section className="admin-welcome">
      <div>
        <div className="admin-eyebrow"><span /> مرکز مدیریت شمسه</div>
        <h1>خوش آمدید، {adminName}</h1>
        <p>مدیریت دوره‌ها، هنرجویان و ارتباطات آموزشی از یک مرکز واحد.</p>
      </div>
      <div className="admin-welcome-mark"><Activity size={30}/></div>
    </section>
    <div className="admin-stat-grid">
      {stats.map(item => { const Icon=item.icon; return <button key={item.label} className="admin-stat" onClick={()=>onNavigate(item.tab)}>
        <span className="admin-stat-icon"><Icon size={18}/></span>
        <span className="admin-stat-copy"><strong>{item.value}</strong><span>{item.label}</span><small>{item.note}</small></span>
        <ArrowLeft size={15} className="admin-stat-arrow"/>
      </button>; })}
    </div>
    <div className="admin-dashboard-grid">
      <section className="admin-panel-card">
        <div className="admin-panel-heading"><div><span>دسترسی سریع</span><h2>مدیریت روزانه</h2></div></div>
        <div className="admin-quick-grid">
          <button onClick={()=>onNavigate('courses')}><BookOpen size={17}/><span>دوره‌ها</span><small>محتوای آموزشی و جلسات</small></button>
          <button onClick={()=>onNavigate('students')}><Users size={17}/><span>هنرجویان</span><small>حساب‌ها و ثبت‌نام‌ها</small></button>
          <button onClick={()=>onNavigate('mockExams')}><ClipboardList size={17}/><span>آزمون‌ها</span><small>آزمون‌های آزمایشی</small></button>
          <button onClick={()=>onNavigate('notifications')}><Bell size={17}/><span>اطلاعیه‌ها</span><small>ارسال خبر و اعلان</small></button>
        </div>
      </section>
      <section className="admin-panel-card">
        <div className="admin-panel-heading"><div><span>نمای کلی</span><h2>آخرین دوره‌ها</h2></div><button onClick={()=>onNavigate('courses')}>مشاهده همه <ArrowLeft size={13}/></button></div>
        {activeCourses.length===0 ? <div className="admin-empty">هنوز دوره‌ای ثبت نشده است.</div> :
          <div className="admin-course-list">{activeCourses.slice(0,5).map((course: typeof courses[number])=><button key={course.id} onClick={()=>onNavigate('courses')}><span className="admin-course-dot"/><span><strong>{course.title}</strong><small>{course.professor || 'مدرس مشخص نشده'}</small></span><ArrowLeft size={13}/></button>)}</div>}
      </section>
    </div>
    <style>{`
      .admin-dashboard-page{max-width:1240px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
      .admin-welcome{min-height:150px;border:1px solid var(--admin-border);background:var(--admin-card);border-radius:20px;padding:24px 26px;display:flex;align-items:center;justify-content:space-between;overflow:hidden;position:relative;box-shadow:var(--admin-shadow)}
      .admin-welcome:after{content:"";position:absolute;width:300px;height:300px;border:1px solid var(--admin-accent-soft);border-radius:50%;left:-100px;bottom:-180px}
      .admin-eyebrow{color:var(--admin-accent);font-size:10px;font-weight:900;display:flex;align-items:center;gap:7px;margin-bottom:7px}
      .admin-eyebrow span{width:7px;height:7px;border-radius:50%;background:var(--admin-accent);box-shadow:0 0 0 4px var(--admin-accent-soft)}
      .admin-welcome h1{font-size:24px;margin:0 0 7px;font-weight:900;letter-spacing:-.3px}
      .admin-welcome p{margin:0;color:var(--admin-sub);font-size:11px;line-height:1.8}
      .admin-welcome-mark{width:58px;height:58px;border-radius:16px;display:grid;place-items:center;color:var(--admin-accent);background:var(--admin-accent-soft);z-index:1}
      .admin-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .admin-stat{border:1px solid var(--admin-border);background:var(--admin-card);color:var(--admin-text);border-radius:15px;padding:14px;display:flex;align-items:center;gap:10px;text-align:right;cursor:pointer;transition:.18s;box-shadow:var(--admin-shadow)}
      .admin-stat:hover{transform:translateY(-2px);border-color:var(--admin-accent)!important}
      .admin-stat-icon{width:35px;height:35px;border-radius:11px;display:grid;place-items:center;color:var(--admin-accent);background:var(--admin-accent-soft);flex:none}
      .admin-stat-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}.admin-stat-copy strong{font-size:21px;line-height:1;font-weight:900}.admin-stat-copy span{font-size:10px;font-weight:800}.admin-stat-copy small{font-size:8px;color:var(--admin-sub)}.admin-stat-arrow{color:var(--admin-sub)}
      .admin-dashboard-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:12px}.admin-panel-card{border:1px solid var(--admin-border);background:var(--admin-card);border-radius:17px;padding:18px;box-shadow:var(--admin-shadow)}
      .admin-panel-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.admin-panel-heading span{font-size:9px;color:var(--admin-accent);font-weight:900}.admin-panel-heading h2{font-size:17px;margin:3px 0 0;font-weight:900}.admin-panel-heading button{border:0;background:none;color:var(--admin-accent);font-size:9px;font-weight:900;cursor:pointer;display:flex;gap:5px;align-items:center}
      .admin-quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.admin-quick-grid button{border:1px solid var(--admin-border);background:var(--admin-inner);color:var(--admin-text);border-radius:12px;padding:12px;text-align:right;cursor:pointer;display:grid;grid-template-columns:auto 1fr;gap:3px 9px;align-items:center}.admin-quick-grid button svg{grid-row:span 2;color:var(--admin-accent)}.admin-quick-grid span{font-size:10px;font-weight:900}.admin-quick-grid small{font-size:8px;color:var(--admin-sub)}
      .admin-course-list{display:flex;flex-direction:column;gap:7px}.admin-course-list button{border:1px solid var(--admin-border);background:var(--admin-inner);color:var(--admin-text);border-radius:11px;padding:10px 11px;display:flex;align-items:center;gap:9px;text-align:right;cursor:pointer}.admin-course-list button>span:nth-child(2){flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.admin-course-list strong{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.admin-course-list small{font-size:8px;color:var(--admin-sub)}.admin-course-dot{width:7px;height:7px;border-radius:50%;background:var(--admin-accent);flex:none}.admin-empty{padding:28px;text-align:center;color:var(--admin-sub);font-size:10px;background:var(--admin-inner);border-radius:11px}
      @media(max-width:900px){.admin-stat-grid{grid-template-columns:1fr 1fr}.admin-dashboard-grid{grid-template-columns:1fr}}
      @media(max-width:560px){.admin-welcome{padding:20px}.admin-welcome h1{font-size:21px}.admin-stat-grid{grid-template-columns:1fr}.admin-quick-grid{grid-template-columns:1fr}}
    `}</style>
  </div>;
};
