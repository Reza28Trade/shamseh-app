import React, { useState } from 'react';
import type { Admin } from '../types';
import { useStore } from '../store/useStore';
import '../styles/AdminLegacy.css';
import { LayoutDashboard, BookOpen, Users, MessageSquare, ShieldAlert, FileText, LogOut, Sun, Moon, Menu, X, CheckSquare, ClipboardList, Bell, Wallet, ShieldCheck, KeyRound } from 'lucide-react';

interface AdminLayoutProps { admin?: Admin; onLogout: () => void; activeTab: string; setActiveTab: any; children: React.ReactNode; }

export const AdminLayout: React.FC<AdminLayoutProps> = ({ admin, onLogout, activeTab, setActiveTab, children }) => {
  const { theme, toggleTheme } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isDark = theme === 'dark';
  const changePassword = async () => {
    const currentPassword = window.prompt('رمز عبور فعلی');
    if (!currentPassword) return;
    const newPassword = window.prompt('رمز عبور جدید (حداقل ۱۲ کاراکتر)');
    if (!newPassword) return;
    if (newPassword.length < 12) { window.alert('رمز عبور باید حداقل ۱۲ کاراکتر باشد.'); return; }
    try {
      const response = await fetch('/api/auth/admin/account/password', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
      if (!response.ok) throw new Error('تغییر رمز عبور ناموفق بود.');
      window.alert('رمز عبور تغییر کرد. لطفاً دوباره وارد شوید.');
      onLogout();
    } catch (error) { window.alert(error instanceof Error ? error.message : 'خطا در تغییر رمز عبور'); }
  };

  const allMenuItems = [
    { id: 'dashboard', label: 'داشبورد مدیریت', icon: LayoutDashboard },
    { id: 'admins', label: 'مدیریت مدیران و دسترسی‌ها', icon: ShieldCheck },
    { id: 'courses', label: 'مدیریت دوره‌ها', icon: BookOpen },
    { id: 'students', label: 'مدیریت هنرجویان', icon: Users },
    { id: 'offlineRequests', label: 'درخواست‌های آفلاین', icon: CheckSquare },
    { id: 'mockExams', label: 'آزمون‌های آزمایشی', icon: ClipboardList },
    { id: 'counseling', label: 'مدیریت مشاوران و گفتگوها', icon: MessageSquare },
    { id: 'messages', label: 'پیام‌ها و پرسش‌ها', icon: MessageSquare },
    { id: 'managementContact', label: 'انتقادات و پیشنهادات - ارتباط مستقیم با مدیریت', icon: ShieldCheck },
    { id: 'notifications', label: 'ارسال اطلاعیه', icon: Bell },
    { id: 'rules', label: 'قوانین و تحلیل کنکور', icon: FileText },
    { id: 'registrations', label: 'مدیریت مالی، ثبت‌نام و بازپرداخت', icon: Wallet },
    { id: 'logs', label: 'گزارش‌های سیستمی', icon: ShieldAlert },
  ];
  const menuItems = allMenuItems.filter((item) => {
    if (item.id === 'dashboard') return true;
    if (item.id === 'admins' || item.id === 'managementContact') return admin?.role === 'super_admin';
    if (item.id === 'registrations') return admin?.role === 'super_admin' || Boolean(admin?.permissions?.includes('finance'));
    if (admin?.role === 'super_admin') return true;
    return Boolean(admin?.permissions?.includes(item.id));
  });
  const activeItem = menuItems.find((item) => item.id === activeTab || (activeTab === 'finance' && item.id === 'registrations')) ?? menuItems[0];
  const vars = {
    '--admin-bg': isDark ? '#1e1c1c' : '#EAE0D3',
    '--admin-card': isDark ? '#262424' : '#F5EFE6',
    '--admin-inner': isDark ? '#302d2d' : '#FFF9F0',
    '--admin-text': isDark ? '#EEE5DA' : '#1c1a19',
    '--admin-sub': isDark ? '#B8AEA5' : '#615953',
    '--admin-border': isDark ? 'rgba(255,255,255,.10)' : '#D6C7B2',
    '--admin-accent': isDark ? '#48D1CC' : '#005959',
    '--admin-accent-soft': isDark ? 'rgba(72,209,204,.13)' : 'rgba(0,89,89,.10)',
    '--admin-brand-soft': isDark ? 'rgba(0,128,128,.16)' : 'rgba(0,89,89,.08)',
    '--admin-brand-border': isDark ? 'rgba(72,209,204,.30)' : 'rgba(0,89,89,.25)',
    '--admin-control': isDark ? '#211f1f' : '#FFFCF7',
    '--admin-shadow': isDark ? '0 16px 38px rgba(0,0,0,.18)' : '0 10px 28px rgba(71,49,28,.06)',
  } as React.CSSProperties;

  return (
    <div className={'admin-shell ' + (isDark ? 'admin-theme-dark' : 'admin-theme-light')} style={vars} dir="rtl">
      <aside className={'admin-sidebar ' + (isSidebarOpen ? 'open' : '')}>
        <div className="admin-sidebar-main">
          <div className="admin-sidebar-brand">
            <img src="/logo.png" alt="لوگوی آکادمی شمسه" className="admin-brand-logo" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} />
            <div className="admin-brand-copy"><strong>آکادمی شمسه</strong><span>مرکز مدیریت جامع</span></div>
            <button className="admin-theme-toggle" onClick={toggleTheme} title={isDark ? 'فعال‌سازی تم روشن' : 'فعال‌سازی تم تیره'} aria-label="تغییر تم">
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
          <section className="admin-sidebar-profile" aria-label="مشخصات مدیر">
            <div className="admin-profile-copy"><strong>{admin?.fullName || 'مدیر سیستم'}</strong><span>{admin?.role === 'super_admin' ? 'مدیر ارشد سامانه' : 'مدیر سامانه'}</span></div>
            <span className="admin-role-badge">{admin?.role === 'super_admin' ? 'SUPER ADMIN' : 'STAFF'}</span>
          </section>
          <div className="admin-sidebar-heading"><span>بخش‌های سامانه</span><span className="admin-sidebar-dot" /></div>
          <nav className="admin-nav" aria-label="منوی مدیریت">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = activeItem.id === item.id;
              return <button key={item.id} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}>
                <span className="admin-nav-icon"><Icon size={18} strokeWidth={1.9} /></span><span className="admin-nav-label">{item.label}</span>{active && <span className="admin-nav-indicator" />}
              </button>;
            })}
          </nav>
        </div>
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-actions">
            <button className="admin-change-password" onClick={() => void changePassword()}><KeyRound size={15} /><span>تغییر رمز عبور</span></button>
            <button className="admin-logout" onClick={onLogout}><LogOut size={15} /><span>خروج از حساب</span></button>
          </div>
          <div className="admin-sidebar-status"><span /> ورود از طریق پنل مدیریت</div>
        </div>
      </aside>
      {isSidebarOpen && <button className="admin-sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="بستن منو" />}
      <main className="admin-main">
        <header className="admin-mobile-topbar">
          <button className="admin-mobile-menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label={isSidebarOpen ? 'بستن منو' : 'باز کردن منو'}>{isSidebarOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <img src="/logo.png" alt="" /><strong>آکادمی شمسه</strong><span>{admin?.fullName || 'مدیر سیستم'}</span>
        </header>
        <div className={'admin-page-heading ' + (activeTab === 'dashboard' ? 'is-dashboard' : '')}>
          <div><span className="admin-page-eyebrow">مرکز مدیریت شمسه</span><h1>{activeItem.label}</h1></div>
        </div>
        <div className="admin-page-content">{children}</div>
      </main>
      <style>{`
        .admin-shell{min-height:100vh;display:flex;background:var(--admin-bg);color:var(--admin-text);font-family:Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif;box-sizing:border-box;transition:background .2s,color .2s}
        .admin-shell *{box-sizing:border-box}
        .admin-sidebar{width:350px;flex:0 0 350px;height:100vh;position:sticky;top:0;padding:20px 16px 15px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;background:var(--admin-bg);border-left:1px solid var(--admin-border);z-index:80}
        .admin-sidebar-main{display:flex;flex-direction:column;min-height:0;flex:1}
        .admin-sidebar-brand{display:flex;align-items:center;gap:11px;padding:0 6px 16px;border-bottom:1px solid var(--admin-border)}
        .admin-brand-logo{display:block;width:76px;height:76px;flex:0 0 76px;object-fit:contain;border-radius:15px}
        .admin-brand-copy{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1}
        .admin-brand-copy strong{font-size:14px;font-weight:900;white-space:nowrap;letter-spacing:-.2px}
        .admin-brand-copy span{font-size:10px;color:var(--admin-sub)}
        .admin-theme-toggle{width:38px;height:38px;flex:0 0 38px;border:1px solid var(--admin-border);background:var(--admin-card);color:var(--admin-accent);border-radius:12px;display:grid;place-items:center;cursor:pointer;transition:background .18s,border-color .18s}
        .admin-theme-toggle:hover{background:var(--admin-accent-soft);border-color:var(--admin-brand-border)}
        .admin-sidebar-profile{margin:13px 0 15px;padding:13px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--admin-border);border-radius:15px;background:var(--admin-card);box-shadow:var(--admin-shadow)}
        .admin-profile-copy{display:flex;flex-direction:column;gap:5px;min-width:0}
        .admin-profile-copy strong{font-size:12px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .admin-profile-copy span{font-size:10px;color:var(--admin-sub)}
        .admin-role-badge{font-size:8px;font-weight:900;letter-spacing:.2px;color:var(--admin-accent);background:var(--admin-accent-soft);border:1px solid var(--admin-brand-border);padding:5px 7px;border-radius:7px;white-space:nowrap}
        .admin-sidebar-heading{display:flex;align-items:center;justify-content:space-between;padding:0 10px 10px;color:var(--admin-sub);font-size:10px;font-weight:850}
        .admin-sidebar-dot{width:7px;height:7px;border-radius:50%;background:var(--admin-accent);box-shadow:0 0 0 4px var(--admin-accent-soft)}
        .admin-nav{display:flex;flex-direction:column;gap:3px;overflow-y:auto;overflow-x:hidden;padding:1px 1px 8px;scrollbar-width:thin;scrollbar-color:var(--admin-border) transparent}
        .admin-nav button{position:relative;width:100%;min-height:43px;border:1px solid transparent;background:transparent;color:var(--admin-sub);border-radius:11px;padding:7px 12px;display:flex;align-items:center;gap:10px;text-align:right;cursor:pointer;font-size:12px;font-weight:750;line-height:1.65;transition:background .18s,border-color .18s,color .18s;overflow:hidden}
        .admin-nav button:hover{background:var(--admin-card);color:var(--admin-text)}
        .admin-nav-icon{width:29px;height:29px;flex:0 0 29px;border-radius:9px;display:grid;place-items:center;color:inherit}
        .admin-nav-label{flex:1;text-align:right}
        .admin-nav button.active{color:var(--admin-accent);font-weight:900;background:linear-gradient(270deg,var(--admin-accent-soft),transparent);border-color:transparent}
        .admin-nav button.active .admin-nav-icon{color:var(--admin-accent)}
        .admin-nav-indicator{position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:4px;background:var(--admin-accent);box-shadow:0 0 12px var(--admin-accent-soft)}
        .admin-sidebar-footer{padding-top:12px;border-top:1px solid var(--admin-border);flex:none}
        .admin-sidebar-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .admin-change-password,.admin-logout{min-width:0;border:1px solid var(--admin-border);background:var(--admin-card);color:var(--admin-sub);border-radius:10px;padding:10px 7px;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;font-size:10px;font-weight:850;white-space:nowrap}
        .admin-change-password:hover{border-color:var(--admin-brand-border);color:var(--admin-accent)}
        .admin-logout{border-color:rgba(255,107,0,.28);background:rgba(255,107,0,.06);color:#E58A4B}
        .admin-logout:hover{background:rgba(255,107,0,.13)}
        .admin-sidebar-status{display:flex;align-items:center;justify-content:center;gap:7px;padding-top:12px;font-size:9px;color:var(--admin-sub);opacity:.8}
        .admin-sidebar-status span{width:6px;height:6px;border-radius:50%;background:var(--admin-accent)}
        .admin-main{min-width:0;flex:1;padding:30px 32px 42px;overflow-x:hidden}
        .admin-page-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 auto 22px;max-width:1480px}
        .admin-page-heading.is-dashboard{display:none}
        .admin-page-eyebrow{display:block;color:var(--admin-accent);font-size:10px;font-weight:900;margin-bottom:6px}
        .admin-page-heading h1{margin:0;font-size:21px;line-height:1.5;font-weight:900;letter-spacing:-.4px;color:var(--admin-text)}
        .admin-page-content{max-width:1480px;margin:0 auto;min-width:0}
        .admin-sidebar-backdrop{display:none}.admin-mobile-topbar{display:none}
        @media(max-width:1200px){.admin-sidebar{width:300px;flex-basis:300px;padding-inline:13px}.admin-main{padding:25px 23px 36px}.admin-brand-logo{width:65px;height:65px;flex-basis:65px}}
        @media(max-width:900px){.admin-shell{display:block}.admin-sidebar{display:none;position:fixed;top:0;right:0;bottom:0;width:min(350px,88vw);height:100dvh;max-height:100dvh;min-height:0;overflow:hidden;z-index:100;box-shadow:-18px 0 48px rgba(0,0,0,.28)}.admin-sidebar.open{display:flex}.admin-sidebar-backdrop{display:block;position:fixed;inset:0;border:0;background:rgba(0,0,0,.48);z-index:90}.admin-main{padding:0 18px 30px}.admin-mobile-topbar{height:64px;display:flex;align-items:center;gap:9px;margin:0 -18px 22px;padding:0 16px;background:var(--admin-card);border-bottom:1px solid var(--admin-border)}.admin-mobile-menu{display:grid;place-items:center;width:38px;height:38px;border:1px solid var(--admin-border);border-radius:11px;background:var(--admin-inner);color:var(--admin-text);cursor:pointer}.admin-mobile-topbar img{width:37px;height:37px;object-fit:contain}.admin-mobile-topbar strong{font-size:12px;font-weight:900}.admin-mobile-topbar span{margin-right:auto;color:var(--admin-sub);font-size:10px;max-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
        @media(max-width:560px){.admin-main{padding-inline:12px}.admin-mobile-topbar{margin-inline:-12px;padding-inline:11px}.admin-page-heading h1{font-size:18px}.admin-sidebar{padding:15px 12px}.admin-brand-logo{width:65px;height:65px;flex-basis:65px}.admin-sidebar-actions{grid-template-columns:1fr}.admin-change-password,.admin-logout{padding:9px}}
        @media(prefers-reduced-motion:reduce){.admin-shell *{transition:none!important;scroll-behavior:auto!important}}
      `}
    </div>
  );
};
