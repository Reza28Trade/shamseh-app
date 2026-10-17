import { useEffect, useState, type CSSProperties } from 'react';
import { useStore } from './store/useStore';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageCourses } from './pages/admin/ManageCourses';
import { ManageStudents } from './pages/admin/ManageStudents';
import { AuditLogs } from './pages/admin/AuditLogs';
import { ManageMessages } from './pages/admin/ManageMessages';
import { ManageManagementContact } from './pages/admin/ManageManagementContact';
import { ManageOfflineRequests } from './pages/admin/ManageOfflineRequests';
import { ManageMockExams } from './pages/admin/ManageMockExams';
import { ManageCounseling } from './pages/admin/ManageCounseling';
import { ManageNotifications } from './pages/admin/ManageNotifications';
import { ManagePublicContent } from './pages/admin/ManagePublicContent';
import { Login } from './pages/user/Login';
import { UserDashboard } from './pages/user/UserDashboard';
import { CounselorPortal } from './pages/counselor/CounselorPortal';
import { RegistrationPage } from './pages/public/RegistrationPage';
import { ManageRegistrations } from './pages/admin/ManageRegistrations';
import type { Student, Admin } from './types';

type AuthUser = { id: string; username: string; role: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT' | 'COUNSELOR'; studentId: string | null; permissions?: string[]; student?: { fullName: string; nationalId: string } | null };


const ADMIN_PERMISSION_OPTIONS = [
  ['courses', 'مدیریت دوره‌ها'],
  ['students', 'مدیریت هنرجویان'],
  ['offlineRequests', 'درخواست‌های آفلاین'],
  ['mockExams', 'آزمون‌های آزمایشی'],
  ['counseling', 'مدیریت مشاوران و گفتگوها'],
  ['messages', 'پیام‌ها و پرسش‌ها'],
  ['notifications', 'ارسال اطلاعیه'],
  ['rules', 'قوانین و تحلیل کنکور'],
  ['finance', 'مدیریت مالی، ثبت‌نام و بازپرداخت'],
  ['logs', 'گزارش‌های سیستمی'],
] as const;

function AdminAccounts() {
  const [admins, setAdmins] = useState<Array<{id:string;username:string;status:'ACTIVE'|'INACTIVE';permissions:string[];lastLoginAt?:string|null}>>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const response = await fetch('/api/auth/admin/admins', { credentials: 'include' });
    if (!response.ok) throw new Error('دریافت فهرست مدیران ناموفق بود.');
    setAdmins(await response.json());
  };
  useEffect(() => { void load().catch((e) => setError(e.message)); }, []);
  const create = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/admin/admins', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password,permissions}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'ساخت حساب ناموفق بود.');
      setUsername(''); setPassword(''); setPermissions([]); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا در ساخت حساب'); }
    finally { setBusy(false); }
  };
  const update = async (id:string, patch:Record<string,unknown>) => {
    setError('');
    try {
      const response = await fetch('/api/auth/admin/admins/'+encodeURIComponent(id), { method:'PATCH', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(patch) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'ذخیره تغییرات ناموفق بود.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا در ذخیره'); }
  };
  return <section className="admin-legacy-page admin-accounts-page admin-accounts-redesign">
    <style>{`
      .admin-accounts-redesign{max-width:1240px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.92fr);gap:12px;align-items:start;direction:rtl;color:var(--admin-text);font-family:Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif}
      .admin-accounts-redesign *{box-sizing:border-box}
      .admin-accounts-redesign .accounts-create-card{background:var(--admin-card)!important;background-color:var(--admin-card)!important;background-image:none!important}
      .admin-accounts-redesign .accounts-card{min-width:0;padding:17px;border:1px solid var(--admin-border);border-radius:17px;background:var(--admin-card);box-shadow:var(--admin-shadow)}
      .admin-accounts-redesign .accounts-card-head{display:flex;flex-direction:column;gap:4px;margin-bottom:13px}
      .admin-accounts-redesign .accounts-eyebrow{font-size:9px;font-weight:900;color:var(--admin-accent);letter-spacing:0}
      .admin-accounts-redesign .accounts-card-head h2{margin:0;font-size:15px;line-height:1.6;font-weight:900;color:var(--admin-text)}
      .admin-accounts-redesign .accounts-description{margin:0 0 13px;color:var(--admin-sub);font-size:10px;line-height:1.9}
      .admin-accounts-redesign .accounts-fields{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:12px}
      .admin-accounts-redesign .accounts-fields label{color:var(--admin-sub);font-size:10px!important;font-weight:800;line-height:1.8}
      .admin-accounts-redesign .accounts-fields input{width:100%;box-sizing:border-box;margin-top:4px;border-radius:9px!important;font-size:11px!important}
      .admin-accounts-redesign .accounts-permission-picker{position:relative;margin-bottom:12px}
      .admin-accounts-redesign .accounts-permission-toggle{display:flex;justify-content:space-between;align-items:center;width:100%;padding:10px 11px;border:1px solid var(--admin-border);border-radius:11px;background:var(--admin-inner);color:var(--admin-text);font:inherit;font-size:10px;cursor:pointer}
      .admin-accounts-redesign .accounts-permission-menu{display:grid;grid-template-columns:1fr;gap:8px;margin-top:7px;padding:11px;border:1px solid var(--admin-border);border-radius:11px;background:var(--admin-inner)}
      .admin-accounts-redesign .accounts-permission-menu label,.admin-accounts-redesign .accounts-saved-permissions label{display:flex;gap:8px;align-items:center;color:var(--admin-text);font-size:10px!important;line-height:1.7}
      .admin-accounts-redesign input[type=checkbox]{width:14px;height:14px;accent-color:var(--admin-accent);flex:none}
      .admin-accounts-redesign .accounts-primary-action{width:100%;margin-top:2px;border-radius:10px!important;padding:10px 13px!important;background:var(--admin-accent-soft)!important;border:1px solid var(--admin-brand-border)!important;color:var(--admin-text)!important;font-size:10px!important;font-weight:900!important}
      .admin-accounts-redesign .accounts-admin-row{padding:12px 0;border-top:1px solid var(--admin-border)}
      .admin-accounts-redesign .accounts-admin-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-bottom:11px}
      .admin-accounts-redesign .accounts-admin-toolbar strong{font-size:12px;color:var(--admin-text);margin-left:auto}
      .admin-accounts-redesign .accounts-admin-toolbar button{font-size:9px!important;padding:7px 9px!important;border-radius:9px!important}
      .admin-accounts-redesign .accounts-saved-permissions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .admin-accounts-redesign .accounts-list-card>p{font-size:10px!important}
      @media(max-width:900px){.admin-accounts-redesign{grid-template-columns:1fr}.admin-accounts-redesign .accounts-create-card{grid-row:1}.admin-accounts-redesign .accounts-list-card{grid-row:2}}
      @media(max-width:520px){.admin-accounts-redesign .accounts-card{padding:14px;border-radius:13px}.admin-accounts-redesign .accounts-saved-permissions{grid-template-columns:1fr}}
    `}</style>
    <div className="accounts-card accounts-create-card">
      <header className="accounts-card-head"><span className="accounts-eyebrow">مدیریت دسترسی‌ها</span><h2>ایجاد حساب مدیر</h2></header>
      <p className="accounts-description">نام کاربری و رمز عبور مستقل تعیین کنید و دسترسی‌های موردنیاز را انتخاب کنید.</p>
      <div className="accounts-fields">
        <label>نام کاربری<input value={username} onChange={e=>setUsername(e.target.value)} minLength={3} style={adminInputStyle} autoComplete="off"/></label>
        <label>رمز عبور اولیه (حداقل ۱۲ کاراکتر)<input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={adminInputStyle} autoComplete="new-password"/></label>
      </div>
      <div className="accounts-permission-picker">
        <button type="button" className="accounts-permission-toggle" onClick={()=>setPermissionsOpen(open=>!open)} aria-expanded={permissionsOpen}>
          <span>انتخاب دسترسی‌ها ({permissions.length})</span><span>{permissionsOpen?'−':'＋'}</span>
        </button>
        {permissionsOpen && <div className="accounts-permission-menu">
          {ADMIN_PERMISSION_OPTIONS.map(([key,label])=><label key={key}><input type="checkbox" checked={permissions.includes(key)} onChange={e=>setPermissions(p=>e.target.checked?[...p,key]:p.filter(x=>x!==key))}/>{label}</label>)}
        </div>}
      </div>
      <button className="accounts-primary-action" disabled={busy||username.trim().length<3||password.length<12} onClick={()=>void create()} style={adminButtonStyle}>{busy?'در حال ذخیره…':'ایجاد حساب مدیر'}</button>
      {error && <p role="alert" style={{color:'#ff8585',fontSize:11,marginTop:10}}>{error}</p>}
    </div>
    <div className="accounts-card accounts-list-card">
      <header className="accounts-card-head"><span className="accounts-eyebrow">حساب‌های کاربری</span><h2>مدیران تعریف‌شده</h2></header>
      {admins.length===0 ? <p style={{color:'var(--admin-sub)',fontSize:11}}>هنوز حساب مدیر عادی ایجاد نشده است.</p> : admins.map(a=><div key={a.id} className="accounts-admin-row">
        <div className="accounts-admin-toolbar">
          <strong>{a.username}</strong><span style={{fontSize:10,color:a.status==='ACTIVE'?'#43f0a4':'#ff8585'}}>{a.status==='ACTIVE'?'فعال':'غیرفعال'}</span>
          <button onClick={()=>void update(a.id,{status:a.status==='ACTIVE'?'INACTIVE':'ACTIVE'})} style={adminButtonStyle}>{a.status==='ACTIVE'?'غیرفعال‌سازی':'فعال‌سازی'}</button>
          <button onClick={()=>{const next=window.prompt('نام کاربری جدید',a.username);if(next&&next.trim()!==a.username)void update(a.id,{username:next.trim()});}} style={adminButtonStyle}>تغییر نام کاربری</button>
          <button onClick={()=>{const next=window.prompt('رمز عبور جدید (حداقل ۱۲ کاراکتر)');if(next)void update(a.id,{password:next});}} style={adminButtonStyle}>بازنشانی رمز</button>
        </div>
        <div className="accounts-permissions accounts-saved-permissions">
          {ADMIN_PERMISSION_OPTIONS.map(([key,label])=><label key={key}><input type="checkbox" checked={a.permissions.includes(key)} onChange={e=>void update(a.id,{permissions:e.target.checked?[...a.permissions,key]:a.permissions.filter(x=>x!==key)})}/>{label}</label>)}
        </div>
      </div>)}
    </div>
  </section>;
}
const adminInputStyle: CSSProperties = {padding:'11px 12px',border:'1px solid var(--admin-border)',borderRadius:9,background:'var(--admin-control)',color:'var(--admin-text)',font:'inherit'};
const adminButtonStyle: React.CSSProperties = {padding:'9px 13px',border:'1px solid var(--admin-brand-border)',borderRadius:9,background:'var(--admin-accent-soft)',color:'var(--admin-text)',font:'inherit',fontSize:12,fontWeight:700,cursor:'pointer'};

export function App() {
  const {
    currentAdmin,
    admins,
    setCurrentAdmin,
    courses,
    students,
    addStudent,
    updateStudent,
    deleteStudent,
  } = useStore();

  const [view, setView] = useState<'checking' | 'login' | 'admin' | 'user' | 'counselor'>('checking');
  type AdminTab = 'dashboard' | 'courses' | 'students' | 'admins' | 'logs' | 'messages' | 'managementContact' | 'notifications' | 'rules' | 'offlineRequests' | 'mockExams' | 'counseling' | 'finance' | 'registrations';
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) {
          if (active) setView('login');
          return;
        }
        const data = await response.json();
        const user: AuthUser | undefined = data.user;
        if (!user || !active) {
          if (active) setView('login');
          return;
        }
        if (user.role === 'SUPER_ADMIN' || user.role === 'STAFF') {
          const admin: Admin = {
            id: user.id,
            fullName: user.username,
            username: user.username,
            password: '',
            role: user.role === 'SUPER_ADMIN' ? 'super_admin' : 'staff',
            permissions: user.permissions || [],
          };
          setCurrentAdmin(admin);
          setView('admin');
        } else if (user.role === 'COUNSELOR') {
          setView('counselor');
        } else if (user.role === 'STUDENT' && user.studentId && user.student) {
          setCurrentStudent({
            id: user.studentId,
            fullName: user.student.fullName,
            nationalId: user.student.nationalId,
            enrolledCourseIds: [],
          });
          setView('user');
        } else {
          setView('login');
        }
      } catch {
        if (active) setView('login');
      }
    })();
    return () => { active = false; };
  }, []);

  const handleStudentLogin = (user: AuthUser) => {
    if (!user.studentId || !user.student) return;
    const student: Student = { id: user.studentId, fullName: user.student.fullName, nationalId: user.student.nationalId, enrolledCourseIds: [] };
    setCurrentStudent(student);
    setView('user');
  };

  const handleAdminLoginSuccess = (user: AuthUser) => {
    if (user.role === 'COUNSELOR') { setView('counselor'); return; }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') return;
    const admin: Admin = { id: user.id, fullName: user.username, username: user.username, password: '', role: user.role === 'SUPER_ADMIN' ? 'super_admin' : 'staff', permissions: user.permissions || [] };
    setCurrentAdmin(admin);
    setView('admin');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Always clear the local UI even if the server cannot be reached.
    } finally {
      setCurrentStudent(null);
      setCurrentAdmin(null);
      setView('login');
    }
  };

  const adminName = currentAdmin?.fullName || 'مدیر کل سیستم';

  if (window.location.pathname === '/register' || window.location.pathname === '/register/') {
    return <RegistrationPage />;
  }

  if (view === 'checking') {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#11181b', color: '#eef5f6', fontFamily: 'system-ui, sans-serif' }}>در حال بررسی نشست کاربری...</div>;
  }

  if (view === 'admin') {
    return (
      <AdminLayout
        admin={currentAdmin || undefined}
        activeTab={adminTab}
        setActiveTab={setAdminTab}
        onLogout={handleLogout}
      >
        {adminTab === 'dashboard' ? (
          <AdminDashboard adminName={adminName} admin={currentAdmin || undefined} onNavigate={setAdminTab} />
        ) : adminTab === 'courses' ? (
          <ManageCourses />
        ) : adminTab === 'students' ? (
          <ManageStudents
            students={students}
            courses={courses}
            onAddStudent={(student) => addStudent(student, adminName)}
            onUpdateStudent={(student) => updateStudent(student, adminName)}
            onDeleteStudent={(id) => deleteStudent(id, adminName)}
          />
        ) : adminTab === 'offlineRequests' ? (
          <ManageOfflineRequests />
        ) : adminTab === 'mockExams' ? (
          <ManageMockExams />
        ) : adminTab === 'counseling' ? (
          <ManageCounseling />
        ) : adminTab === 'logs' ? (
          <AuditLogs />
         ) : adminTab === 'messages' ? (
          <ManageMessages />
        ) : adminTab === 'managementContact' && currentAdmin?.role === 'super_admin' ? (
          <ManageManagementContact />
        ) : adminTab === 'notifications' ? (
          <ManageNotifications />
        ) : adminTab === 'rules' ? (
          <ManagePublicContent />
        ) : adminTab === 'finance' || adminTab === 'registrations' ? (
          <ManageRegistrations />
        ) : adminTab === 'admins' && currentAdmin?.role === 'super_admin' ? (
          <AdminAccounts />
        ) : (
          <div style={{ backgroundColor: '#0e0e11', padding: '32px', borderRadius: '20px', border: '1px solid #222228' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>مدیریت سطوح دسترسی ادمین‌ها</h2>
            <p style={{ color: '#888', fontSize: '12px' }}>تنظیمات دسترسی کاربران ارشد فعال است.</p>
          </div>
        )}
      </AdminLayout>
    );
  }

  if (view === 'counselor') {
    return <CounselorPortal onLogout={handleLogout} />;
  }

  if (view === 'user' && currentStudent) {
    return (
      <UserDashboard
        student={currentStudent}
        courses={courses}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <>
      <Login
        students={students}
        admins={admins}
        onLoginSuccess={handleStudentLogin}
        onAdminLoginSuccess={handleAdminLoginSuccess}
      />
      <a href="/register" style={{ position: 'fixed', right: 20, bottom: 18, zIndex: 1000, padding: '12px 18px', borderRadius: 12, background: '#398A90', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 850, boxShadow: '0 8px 24px rgba(0,0,0,.18)' }}>
        ثبت‌نام دوره‌ها و ارسال رسید
      </a>
    </>
  );
}

export default App;