import React, { useState } from 'react';
import type { Admin } from '../types';
import { useStore } from '../store/useStore';
import { LayoutDashboard, BookOpen, Users, MessageSquare, ShieldAlert, FileText, LogOut, Sun, Moon, Menu, X, CheckSquare, ClipboardList, Bell, CalendarClock } from 'lucide-react';

interface AdminLayoutProps { admin?: Admin; onLogout:()=>void; activeTab:any; setActiveTab:any; children:React.ReactNode; }

export const AdminLayout: React.FC<AdminLayoutProps> = ({admin,onLogout,activeTab,setActiveTab,children}) => {
  const {theme,toggleTheme}=useStore(); const [isSidebarOpen,setIsSidebarOpen]=useState(false); const isDark=theme==='dark';
  const menuItems=[
    {id:'dashboard',label:'داشبورد مدیریت',icon:LayoutDashboard},{id:'courses',label:'مدیریت دوره‌ها',icon:BookOpen},{id:'students',label:'مدیریت هنرجویان',icon:Users},
    {id:'offlineRequests',label:'درخواست‌های آفلاین',icon:CheckSquare},{id:'mockExams',label:'آزمون‌های آزمایشی',icon:ClipboardList},{id:'counseling',label:'مدیریت مشاوره',icon:CalendarClock},
    {id:'messages',label:'پیام‌ها و پرسش‌ها',icon:MessageSquare},{id:'notifications',label:'ارسال اطلاعیه',icon:Bell},{id:'rules',label:'مدیریت قوانین',icon:FileText},{id:'logs',label:'گزارش‌های سیستمی',icon:ShieldAlert},
  ];
  const vars:any={ '--admin-bg':isDark?'#17191a':'#f5f7f6','--admin-card':isDark?'#222526':'#fff','--admin-inner':isDark?'#292d2e':'#f8faf9','--admin-text':isDark?'#f1f5f4':'#172022','--admin-sub':isDark?'#aab5b4':'#697675','--admin-border':isDark?'#343a3b':'#dfe7e5','--admin-accent':'#38838a','--admin-accent-soft':isDark?'rgba(56,131,138,.16)':'#e8f2f2','--admin-shadow':isDark?'0 14px 32px rgba(0,0,0,.12)':'0 10px 28px rgba(30,70,70,.06)'};
  return <div className="admin-shell" style={vars}>
    <header className="admin-topbar">
      <div className="admin-brand"><div className="admin-brand-mark">ش</div><div><strong>شمسه</strong><small>مرکز مدیریت آموزشی</small></div></div>
      <div className="admin-top-actions"><span className="admin-user">{admin?.fullName||'مدیر سیستم'}</span><button onClick={toggleTheme} title="تغییر تم">{isDark?<Sun size={17}/>:<Moon size={17}/>}</button><button className="admin-mobile-menu" onClick={()=>setIsSidebarOpen(!isSidebarOpen)}>{isSidebarOpen?<X size={18}/>:<Menu size={18}/>}</button></div>
    </header>
    <div className="admin-body">
      <aside className={`admin-sidebar ${isSidebarOpen?'open':''}`}>
        <div className="admin-nav">{menuItems.map(item=>{const Icon=item.icon;const active=activeTab===item.id;return <button key={item.id} className={active?'active':''} onClick={()=>{setActiveTab(item.id);setIsSidebarOpen(false)}}><Icon size={17}/><span>{item.label}</span></button>})}</div>
        <div className="admin-sidebar-bottom"><button className="admin-logout" onClick={onLogout}><LogOut size={16}/> خروج از حساب</button></div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
    <style>{`
      .admin-shell{min-height:100vh;background:var(--admin-bg);color:var(--admin-text);direction:rtl;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}
      .admin-topbar{height:72px;border-bottom:1px solid var(--admin-border);background:var(--admin-card);display:flex;align-items:center;justify-content:space-between;padding:0 22px;position:sticky;top:0;z-index:50;box-sizing:border-box}
      .admin-brand{display:flex;align-items:center;gap:10px}.admin-brand-mark{width:37px;height:37px;border-radius:12px;background:var(--admin-accent-soft);color:var(--admin-accent);display:grid;place-items:center;font-size:17px;font-weight:900}.admin-brand strong{display:block;font-size:14px}.admin-brand small{display:block;color:var(--admin-sub);font-size:8px;margin-top:2px}
      .admin-top-actions{display:flex;align-items:center;gap:8px}.admin-user{font-size:10px;color:var(--admin-sub);margin-left:4px}.admin-top-actions button{width:36px;height:36px;border:1px solid var(--admin-border);background:var(--admin-inner);color:var(--admin-text);border-radius:10px;display:grid;place-items:center;cursor:pointer}.admin-mobile-menu{display:none!important}
      .admin-body{display:grid;grid-template-columns:225px minmax(0,1fr);min-height:calc(100vh - 72px)}.admin-sidebar{border-left:1px solid var(--admin-border);background:var(--admin-card);padding:14px 11px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box}.admin-nav{display:flex;flex-direction:column;gap:4px}.admin-nav button{width:100%;min-height:42px;border:1px solid transparent;background:transparent;color:var(--admin-sub);border-radius:11px;padding:9px 11px;display:flex;align-items:center;gap:9px;text-align:right;cursor:pointer;font-size:10px;font-weight:800;transition:.18s}.admin-nav button:hover{background:var(--admin-inner);color:var(--admin-text)}.admin-nav button.active{background:var(--admin-accent-soft);color:var(--admin-accent);border-color:rgba(56,131,138,.16)}.admin-sidebar-bottom{border-top:1px solid var(--admin-border);padding-top:11px}.admin-logout{width:100%;border:1px solid rgba(190,60,70,.22);background:rgba(190,60,70,.06);color:#b24b55;border-radius:11px;padding:10px;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:10px;font-weight:800}
      .admin-main{min-width:0;padding:22px;box-sizing:border-box;overflow-x:hidden}
      @media(max-width:820px){.admin-topbar{height:64px;padding:0 14px}.admin-mobile-menu{display:grid!important}.admin-body{display:block;min-height:calc(100vh - 64px)}.admin-sidebar{display:none;position:fixed;top:64px;right:0;bottom:0;width:270px;z-index:45;box-shadow:-15px 0 40px rgba(0,0,0,.18)}.admin-sidebar.open{display:flex}.admin-main{padding:14px}}
    `}</style>
  </div>;
};
