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
import { Login, InformationPage } from './pages/user/Login';
import { UserDashboard } from './pages/user/UserDashboard';
import { CounselorPortal } from './pages/counselor/CounselorPortal';
import { RegistrationPage } from './pages/public/RegistrationPage';
import { ManageRegistrations } from './pages/admin/ManageRegistrations';
import { ManageBookstore } from './pages/admin/ManageBookstore';
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
  ['books', 'مدیریت کتاب‌ها و سفارش‌ها'],
  ['logs', 'گزارش‌های سیستمی'],
] as const;

function AdminAccounts() {
  const [admins, setAdmins] = useState<Array<{id:string;username:string;status:'ACTIVE'|'INACTIVE';permissions:string[];lastLoginAt?:string|null}>>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionMenuOpen, setPermissionMenuOpen] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/admin/admins', { credentials: 'include' });
      if (!response.ok) throw new Error('دریافت فهرست مدیران ناموفق بود.');
      setAdmins(await response.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { void load().catch((e) => setError(e.message)); }, []);
  const togglePermission = (key:string, checked:boolean) => setPermissions(current => checked ? [...current,key] : current.filter(item=>item!==key));
  const create = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/admin/admins', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password,permissions}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'ساخت حساب ناموفق بود.');
      setUsername(''); setPassword(''); setPermissions([]); setPermissionMenuOpen(false); await load();
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
  const permissionLabel = (key:string) => ADMIN_PERMISSION_OPTIONS.find(([option])=>option===key)?.[1] || key;
  return <section className="admin-legacy-page admin-accounts-page">
    {error && <div className="accounts-feedback" role="alert">{error}</div>}
    <div className="accounts-workspace">
      <div className="accounts-card accounts-create-card admin-panel-card admin-master-panel">
        <header className="accounts-card-head"><span className="accounts-eyebrow">حساب جدید</span><h2>ایجاد حساب مدیر</h2></header>
        <p className="accounts-description">برای مدیر جدید نام کاربری و رمز مستقل تعیین کنید؛ سپس دسترسی بخش‌های موردنیاز را انتخاب کنید.</p>
        <div className="accounts-fields">
          <label>نام کاربری<input value={username} onChange={e=>setUsername(e.target.value)} minLength={3} autoComplete="off" placeholder="حداقل ۳ نویسه" style={adminInputStyle}/></label>
          <label>رمز عبور اولیه<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" placeholder="حداقل ۱۲ کاراکتر" style={adminInputStyle}/></label>
        </div>
        <div className="accounts-permission-picker">
          <div className="accounts-picker-heading"><div><strong>دسترسی‌های مدیر</strong><small>فقط بخش‌های انتخاب‌شده در پنل او نمایش داده می‌شوند.</small></div><span>{permissions.length.toLocaleString('fa-IR')} انتخاب</span></div>
          <details className="accounts-permission-disclosure" open={permissionMenuOpen} onToggle={e=>setPermissionMenuOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary><span>{permissions.length ? 'ویرایش دسترسی‌های انتخاب‌شده' : 'انتخاب بخش‌های مجاز'}</span><span className="accounts-disclosure-arrow">⌄</span></summary>
            <div className="accounts-permission-menu">
              <input className="accounts-permission-search" value={permissionSearch} onChange={e=>setPermissionSearch(e.target.value)} placeholder="جست‌وجوی بخش..." aria-label="جست‌وجوی دسترسی‌ها"/>
              <div className="accounts-permission-options">
                {ADMIN_PERMISSION_OPTIONS.filter(([,label])=>label.includes(permissionSearch.trim())).map(([key,label])=><label key={key}><input type="checkbox" checked={permissions.includes(key)} onChange={e=>togglePermission(key,e.target.checked)}/><span>{label}</span></label>)}
              </div>
            </div>
          </details>
          <div className="accounts-selected-permissions">{permissions.length===0 ? <span className="accounts-no-selection">هنوز دسترسی‌ای انتخاب نشده است.</span> : permissions.map(key=><span key={key}>{permissionLabel(key)}</span>)}</div>
        </div>
        <div className="accounts-primary-action-wrap"><button className="accounts-primary-action" disabled={busy||username.trim().length<3||password.length<12} onClick={()=>void create()}>{busy?'در حال ذخیره…':'ایجاد حساب مدیر'}</button></div>
        <small className="accounts-form-hint">رمز عبور باید حداقل ۱۲ کاراکتر داشته باشد.</small>
      </div>
      <div className="accounts-card accounts-list-card admin-panel-card admin-master-panel">
        <header className="accounts-card-head accounts-list-head"><div><span className="accounts-eyebrow">حساب‌های موجود</span><h2>مدیران تعریف‌شده</h2></div><span className="accounts-list-total">{admins.length.toLocaleString('fa-IR')} مدیر</span></header>
        {loading ? <div className="accounts-list-empty">در حال دریافت فهرست مدیران…</div> : admins.length===0 ? <div className="accounts-list-empty">هنوز حساب مدیر عادی ایجاد نشده است.</div> : <div className="accounts-admin-list">{admins.map(a=><article key={a.id} className="accounts-admin-row">
          <div className="accounts-admin-toolbar">
            <div className="accounts-admin-identity"><strong>{a.username}</strong><span className={a.status==='ACTIVE'?'is-active':'is-inactive'}><i/>{a.status==='ACTIVE'?'فعال':'غیرفعال'}</span></div>
            <div className="accounts-admin-actions">
              <button onClick={()=>void update(a.id,{status:a.status==='ACTIVE'?'INACTIVE':'ACTIVE'})}>{a.status==='ACTIVE'?'غیرفعال‌سازی':'فعال‌سازی'}</button>
              <button onClick={()=>{const next=window.prompt('نام کاربری جدید',a.username);if(next&&next.trim()!==a.username)void update(a.id,{username:next.trim()});}}>تغییر نام کاربری</button>
              <button onClick={()=>{const next=window.prompt('رمز عبور جدید (حداقل ۱۲ کاراکتر)');if(next&&next.length>=12)void update(a.id,{password:next});else if(next) setError('رمز عبور جدید باید حداقل ۱۲ کاراکتر باشد.');}}>بازنشانی رمز</button>
            </div>
          </div>
          <details className="accounts-saved-permission-details">
            <summary><span>دسترسی‌های این مدیر</span><b>{a.permissions.length.toLocaleString('fa-IR')} بخش</b><span className="accounts-disclosure-arrow">⌄</span></summary>
            <div className="accounts-saved-permissions">{ADMIN_PERMISSION_OPTIONS.map(([key,label])=><label key={key}><input type="checkbox" checked={a.permissions.includes(key)} onChange={e=>void update(a.id,{permissions:e.target.checked?[...a.permissions,key]:a.permissions.filter(x=>x!==key)})}/><span>{label}</span></label>)}</div>
          </details>
        </article>)}</div>}
      </div>
    </div>
  </section>;
}
const adminInputStyle: CSSProperties = {padding:'11px 12px',border:'1px solid var(--admin-border)',borderRadius:9,background:'var(--admin-control)',color:'var(--admin-text)',font:'inherit'};

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
  type AdminTab = 'dashboard' | 'courses' | 'students' | 'admins' | 'logs' | 'messages' | 'managementContact' | 'notifications' | 'rules' | 'offlineRequests' | 'mockExams' | 'counseling' | 'finance' | 'registrations' | 'books';
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

  if (window.location.pathname === '/public' || window.location.pathname === '/public/') {
    return <InformationPage onBack={() => { window.location.href = '/'; }} />;
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
        ) : adminTab === 'books' ? (
          <ManageBookstore />
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
    </>
  );
}

export default App;