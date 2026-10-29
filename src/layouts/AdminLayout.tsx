import React, { useState } from 'react';
import type { Admin } from '../types';
import { useStore } from '../store/useStore';
import '../styles/AdminLegacy.css';
import { LayoutDashboard, BookOpen, Users, MessageSquare, ShieldAlert, FileText, LogOut, Sun, Moon, Menu, X, CheckSquare, ClipboardList, Bell, Wallet, ShieldCheck, KeyRound, ShoppingBag } from 'lucide-react';

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
    { id: 'managementContact', label: 'انتقادات و پیشنهادات', icon: MessageSquare },
    { id: 'notifications', label: 'ارسال اطلاعیه', icon: Bell },
    { id: 'rules', label: 'قوانین و تحلیل کنکور', icon: FileText },
    { id: 'registrations', label: 'مدیریت مالی، ثبت‌نام و بازپرداخت', icon: Wallet },
    { id: 'books', label: 'مدیریت کتاب‌ها و سفارش‌ها', icon: ShoppingBag },
    { id: 'logs', label: 'گزارش‌های سیستمی', icon: ShieldAlert },
  ];
  const menuItems = allMenuItems.filter((item) => {
    if (item.id === 'dashboard') return true;
    if (item.id === 'admins' || item.id === 'managementContact' || item.id === 'messages') return admin?.role === 'super_admin';
    if (item.id === 'registrations') return admin?.role === 'super_admin' || Boolean(admin?.permissions?.includes('finance'));
    if (admin?.role === 'super_admin') return true;
    return Boolean(admin?.permissions?.includes(item.id));
  });
  const activeItem = menuItems.find((item) => item.id === activeTab || (activeTab === 'finance' && item.id === 'registrations')) ?? menuItems[0];
  const vars = {
    '--admin-bg': isDark ? 'var(--shamseh-charcoal)' : '#F4EFE8',
    '--admin-card': isDark ? '#1D1B1B' : '#F7F1E8',
    '--admin-inner': isDark ? '#302D2D' : '#E5D9CB',
    '--admin-text': isDark ? 'var(--shamseh-almond)' : 'var(--shamseh-charcoal)',
    '--admin-sub': isDark ? '#B9B0A6' : '#655D55',
    '--admin-border': isDark ? 'rgba(238,229,218,.13)' : 'rgba(38,36,36,.14)',
    '--admin-accent': isDark ? 'var(--shamseh-turquoise)' : 'var(--shamseh-teal)',
    '--admin-accent-soft': isDark ? 'rgba(72,209,204,.13)' : 'rgba(0,128,128,.10)',
    '--admin-brand-soft': isDark ? 'rgba(0,128,128,.18)' : 'rgba(0,128,128,.08)',
    '--admin-brand-border': isDark ? 'rgba(72,209,204,.30)' : 'rgba(0,128,128,.25)',
    '--admin-control': isDark ? '#211F1F' : '#F7F1E8',
    '--admin-gold': 'var(--shamseh-gold)',
    '--admin-burgundy': 'var(--shamseh-burgundy)',
    '--admin-shadow': isDark ? '0 16px 38px rgba(0,0,0,.22)' : '0 10px 28px rgba(38,36,36,.07)',
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
        <div className="admin-page-content">{children}</div>
      </main>
    </div>
  );
};
