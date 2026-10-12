import React, { useState } from 'react';
import type { Admin } from '../types';
import { useStore } from '../store/useStore';
import '../styles/AdminLegacy.css';
import { LayoutDashboard, BookOpen, Users, MessageSquare, ShieldAlert, FileText, LogOut, Sun, Moon, Menu, X, CheckSquare, ClipboardList, Bell, Wallet, ChevronLeft, ShieldCheck } from 'lucide-react';

interface AdminLayoutProps { admin?: Admin; onLogout: () => void; activeTab: any; setActiveTab: any; children: React.ReactNode; }

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
    { id: 'notifications', label: 'ارسال اطلاعیه', icon: Bell },
    { id: 'rules', label: 'قوانین و تحلیل کنکور', icon: FileText },
    { id: 'finance', label: 'وضعیت مالی هنرجویان', icon: Wallet },
    { id: 'logs', label: 'گزارش‌های سیستمی', icon: ShieldAlert },
  ];
  const menuItems = allMenuItems.filter((item) => {
    if (item.id === 'dashboard') return true;
    if (item.id === 'admins') return admin?.role === 'super_admin';
    if (admin?.role === 'super_admin') return true;
    return Boolean(admin?.permissions?.includes(item.id));
  });
  const activeItem = menuItems.find((item) => item.id === activeTab) ?? menuItems[0];

  const vars: any = {
    '--admin-bg': isDark ? '#101416' : '#F0F5F4',
    '--admin-card': isDark ? '#191F21' : '#FFFFFF',
    '--admin-inner': isDark ? '#202729' : '#E7EFED',
    '--admin-text': isDark ? '#F1F4F3' : '#202A2A',
    '--admin-sub': isDark ? '#A2AEAE' : '#667675',
    '--admin-border': isDark ? '#303A3C' : '#D8E3E0',
    '--admin-accent': '#398A90',
    '--admin-accent-soft': isDark ? 'rgba(57,138,144,.18)' : '#E0F0EE',
    '--admin-brand-soft': isDark ? 'rgba(57,138,144,.14)' : '#EAF5F3',
    '--admin-brand-border': isDark ? 'rgba(112,185,181,.35)' : '#B7DAD6',
    '--admin-control': isDark ? '#171D1F' : '#FBFDFC',
    '--admin-shadow': isDark ? '0 16px 38px rgba(0,0,0,.20)' : '0 12px 32px rgba(32,62,58,.07)',
  };

  return (
    <div className={`admin-shell ${isDark ? 'admin-theme-dark' : 'admin-theme-light'}`} style={vars}>
      <header className="admin-topbar">
        <div className="admin-brand-area">
          <button className="admin-mobile-menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label={isSidebarOpen ? 'بستن منو' : 'باز کردن منو'}>
            {isSidebarOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <img className="admin-brand-logo" src="/logo.png" alt="لوگوی شمسه" />
          <div className="admin-brand-copy">
            <strong>مرکز مدیریت شمسه</strong>
          </div>
        </div>

        <div className="admin-topbar-center">
          <span className="admin-breadcrumb-muted">پنل مدیریت</span>
          <ChevronLeft size={14} />
          <strong>{activeItem.label}</strong>
        </div>

        <div className="admin-top-actions">
          <button className="admin-logout admin-top-logout" onClick={() => void changePassword()}><ShieldCheck size={17} /><span>تغییر رمز</span></button>
          <button className="admin-logout admin-top-logout" onClick={onLogout}><LogOut size={17} /><span>خروج از حساب</span></button>
          <button className="admin-theme-toggle" onClick={toggleTheme} title={isDark ? 'فعال‌سازی تم روشن' : 'فعال‌سازی تم تیره'} aria-label="تغییر تم">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="admin-profile">
            <div className="admin-profile-avatar">{(admin?.fullName || 'م').trim().slice(0, 1)}</div>
            <div className="admin-profile-copy"><strong>{admin?.fullName || 'مدیر سیستم'}</strong><small>مدیر سامانه</small></div>
          </div>
        </div>
      </header>

      <div className="admin-body">
        <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="admin-sidebar-heading">
            <span>فضای کاری</span>
            <span className="admin-sidebar-dot" />
          </div>
          <nav className="admin-nav" aria-label="منوی مدیریت">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button key={item.id} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}
                  onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}>
                  <span className="admin-nav-icon"><Icon size={18} strokeWidth={1.9} /></span>
                  <span className="admin-nav-label">{item.label}</span>
                  {active && <span className="admin-nav-indicator" />}
                </button>
              );
            })}
          </nav>
          <div className="admin-sidebar-footer">
            <span className="admin-sidebar-footer-label">پنل مدیریت شمسه</span>
          </div>
        </aside>

        {isSidebarOpen && <button className="admin-sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="بستن منو" />}

        <main className="admin-main">
          <div className={`admin-page-heading ${activeTab === 'dashboard' ? 'is-dashboard' : ''}`}>
            <div><span className="admin-page-eyebrow">مرکز مدیریت شمسه</span><h1>{activeItem.label}</h1></div>
            </div>
          <div className="admin-page-content">{children}</div>
        </main>
      </div>

      <style>{`
        .admin-shell{min-height:100vh;background:var(--admin-bg);color:var(--admin-text);direction:rtl;font-family:Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif;box-sizing:border-box;transition:background .2s,color .2s}
        .admin-shell *{box-sizing:border-box}
        .admin-topbar{height:76px;border-bottom:1px solid var(--admin-border);background:var(--admin-card);display:flex;align-items:center;justify-content:space-between;gap:24px;padding:0 30px;position:sticky;top:0;z-index:60;box-shadow:0 4px 18px rgba(0,0,0,.025)}
        .admin-brand-area{display:flex;align-items:center;gap:14px;min-width:270px}
        .admin-brand-logo{display:block;width:58px;height:58px;object-fit:contain;flex:0 0 58px;border-radius:12px}
        .admin-brand-copy{display:flex;align-items:center;min-width:0}
        .admin-brand-copy strong{font-size:15px;font-weight:900;white-space:nowrap;color:var(--admin-text);letter-spacing:-.2px}
        .admin-topbar-center{display:flex;align-items:center;gap:9px;flex:1;font-size:12px;color:var(--admin-text)}
        .admin-breadcrumb-muted{color:var(--admin-sub)}
        .admin-topbar-center svg{color:var(--admin-sub)}
        .admin-topbar-center strong{font-size:12px;font-weight:800}
        .admin-top-actions{display:flex;align-items:center;gap:10px}
        .admin-top-logout{width:auto!important;padding:10px 13px!important;min-height:40px;white-space:nowrap}
        .admin-sidebar-footer-label{display:block;border-top:1px solid var(--admin-border);padding:14px 10px 4px;color:var(--admin-sub);font-size:10px;text-align:center}
        .admin-theme-toggle{width:40px;height:40px;border:1px solid var(--admin-border);background:var(--admin-inner);color:var(--admin-text);border-radius:13px;display:grid;place-items:center;cursor:pointer;transition:background .18s,border-color .18s,color .18s}
        .admin-theme-toggle:hover{background:var(--admin-accent-soft);border-color:var(--admin-brand-border);color:#70B9B5}
        .admin-profile{display:flex;align-items:center;gap:10px;padding-right:16px;border-right:1px solid var(--admin-border)}
        .admin-profile-avatar{width:38px;height:38px;border-radius:13px;background:linear-gradient(145deg,#398A90,#70B9B5);color:#fff;display:grid;place-items:center;font-weight:900;font-size:15px}
        .admin-profile-copy strong{display:block;font-size:11px;font-weight:800;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .admin-profile-copy small{display:block;font-size:10px;color:var(--admin-sub);margin-top:4px}
        .admin-mobile-menu{display:none;border:1px solid var(--admin-border);background:var(--admin-inner);color:var(--admin-text);border-radius:12px;width:40px;height:40px;place-items:center;cursor:pointer}
        .admin-body{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:calc(100vh - 76px);align-items:stretch}
        .admin-sidebar{border-left:1px solid var(--admin-border);background:var(--admin-card);padding:22px 15px 15px;display:flex;flex-direction:column;position:relative;top:auto;height:auto;min-height:calc(100vh - 76px);align-self:stretch;overflow:visible}
        .admin-sidebar-heading{display:flex;align-items:center;justify-content:space-between;padding:0 13px 14px;color:var(--admin-sub);font-size:10px;font-weight:800;letter-spacing:.2px}
        .admin-sidebar-dot{width:7px;height:7px;border-radius:50%;background:#70B9B5;box-shadow:0 0 0 4px var(--admin-accent-soft)}
        .admin-nav{display:flex;flex-direction:column;gap:5px}
        .admin-nav button{position:relative;width:100%;min-height:48px;border:1px solid transparent;background:transparent;color:var(--admin-sub);border-radius:13px;padding:11px 11px;display:flex;align-items:center;gap:11px;text-align:right;cursor:pointer;font-size:13px;font-weight:750;line-height:1.6;transition:background .18s,border-color .18s,color .18s}
        .admin-nav button:hover{background:var(--admin-inner);color:var(--admin-text)}
        .admin-nav-icon{width:32px;height:32px;flex:0 0 32px;border-radius:10px;display:grid;place-items:center;color:var(--admin-sub);background:transparent;transition:background .18s,color .18s}
        .admin-nav-label{flex:1}
        .admin-nav button.active{background:var(--admin-accent-soft);color:var(--admin-text);border-color:var(--admin-brand-border)}
        .admin-nav button.active .admin-nav-icon{background:var(--admin-accent);color:#fff}
        .admin-nav-indicator{width:5px;height:5px;border-radius:50%;background:#70B9B5}
        .admin-sidebar-footer{margin-top:auto;padding-top:18px}
        .admin-sidebar-brand-note{display:flex;align-items:center;gap:10px;padding:13px 10px 16px;border-top:1px solid var(--admin-border)}
        .admin-sidebar-brand-mark{width:34px;height:34px;border-radius:11px;background:var(--admin-accent-soft);color:#70B9B5;display:grid;place-items:center;font-weight:900;font-size:16px}
        .admin-sidebar-brand-note strong{display:block;font-size:11px}
        .admin-sidebar-brand-note small{display:block;font-size:9px;color:var(--admin-sub);margin-top:3px}
        .admin-logout{width:100%;border:1px solid rgba(190,75,85,.22);background:rgba(190,75,85,.07);color:#D4777D;border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px;cursor:pointer;font-size:11px;font-weight:800;transition:background .18s}
        .admin-logout:hover{background:rgba(190,75,85,.13)}
        .admin-main{min-width:0;padding:28px 32px 40px;box-sizing:border-box;overflow-x:hidden}
        .admin-page-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 auto 24px;max-width:1480px}
        .admin-page-eyebrow{display:block;color:#70B9B5;font-size:10px;font-weight:850;margin-bottom:7px;letter-spacing:.2px}
        .admin-page-heading h1{margin:0;font-size:22px;line-height:1.5;font-weight:900;letter-spacing:-.5px;color:var(--admin-text)}
        .admin-page-content{max-width:1480px;margin:0 auto;min-width:0}
        .admin-sidebar-backdrop{display:none}
        @media(max-width:1100px){.admin-topbar{padding:0 20px;gap:14px}.admin-brand-area{min-width:250px}.admin-body{grid-template-columns:228px minmax(0,1fr)}.admin-main{padding:24px 22px 34px}}
        @media(max-width:820px){.admin-topbar{height:66px;padding:0 14px;gap:10px}.admin-brand-area{min-width:0;gap:9px}.admin-brand-logo{width:46px;height:46px;flex-basis:46px;border-radius:11px}.admin-brand-copy strong{font-size:13px}.admin-mobile-menu{display:grid;order:0}.admin-topbar-center{display:none}.admin-top-actions{gap:9px;margin-right:auto}.admin-profile{padding-right:10px;gap:0}.admin-profile-copy{display:none}.admin-top-logout{padding:9px!important;min-width:38px;justify-content:center}.admin-top-logout span{display:none}.admin-profile-avatar{width:36px;height:36px}.admin-theme-toggle{width:38px;height:38px}.admin-body{display:block;min-height:calc(100vh - 66px)}.admin-sidebar{display:none;position:fixed;top:66px;right:0;bottom:0;width:min(290px,86vw);height:auto;min-height:0;max-height:calc(100vh - 66px);overflow-y:auto;overflow-x:hidden;z-index:80;box-shadow:-18px 0 48px rgba(0,0,0,.22)}.admin-sidebar.open{display:flex}.admin-sidebar-backdrop{display:block;position:fixed;inset:66px 0 0;border:0;background:rgba(0,0,0,.42);z-index:70}.admin-main{padding:20px 14px 28px}.admin-page-heading{align-items:flex-start;margin-bottom:18px}.admin-page-heading h1{font-size:19px}.admin-page-context{font-size:9px;padding:8px 10px}}
        @media(max-width:480px){.admin-topbar{padding:0 10px}.admin-brand-copy strong{font-size:11px}.admin-main{padding-inline:12px}.admin-page-heading h1{font-size:18px}}
        @media(prefers-reduced-motion:reduce){.admin-shell *{transition:none!important;scroll-behavior:auto!important}}
      `}</style>
    </div>
  );
};
