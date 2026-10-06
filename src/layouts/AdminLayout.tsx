import React, { useState } from 'react';
import type { Admin } from '../types';
import { useStore } from '../store/useStore';
import { LayoutDashboard, BookOpen, Users, MessageSquare, ShieldAlert, FileText, LogOut, Sun, Moon, Menu, X, CheckSquare, ClipboardList } from 'lucide-react';

interface AdminLayoutProps {
  admin?: Admin;
  onLogout: () => void;
  activeTab: any;
  setActiveTab: any;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  admin,
  onLogout,
  activeTab,
  setActiveTab,
  children,
}) => {
  const { theme, toggleTheme } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isDark = theme === 'dark';
  const bgColors = isDark ? '#050505' : '#f8fafc';
  const cardBg = isDark ? '#111116' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const subText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';

  const menuItems = [
    { id: 'dashboard', label: 'داشبورد مدیریت', icon: LayoutDashboard },
    { id: 'courses', label: 'مدیریت دوره‌ها', icon: BookOpen },
    { id: 'students', label: 'مدیریت هنرجویان', icon: Users },
    { id: 'offlineRequests', label: 'درخواست‌های آفلاین', icon: CheckSquare },
    { id: 'mockExams', label: 'آزمون‌های آزمایشی', icon: ClipboardList },
    { id: 'messages', label: 'پیام‌ها و پرسش‌ها', icon: MessageSquare },
    { id: 'rules', label: 'مدیریت قوانین', icon: FileText },
    { id: 'logs', label: 'گزارش‌های سیستمی', icon: ShieldAlert },
  ];

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: bgColors,
      color: textColor,
      display: 'flex',
      flexDirection: 'column',
      direction: 'rtl',
      fontFamily: 'system-ui, sans-serif',
      boxSizing: 'border-box',
      margin: 0,
      padding: 0
    }}>
      
      {/* هدر بالای صفحه در موبایل */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: cardBg,
        borderBottom: `1px solid ${borderColor}`,
        boxSizing: 'border-box',
        zIndex: 100
      }}>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: isDark ? '#1a1a20' : '#f1f5f9',
            color: textColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <span>منوی مدیریت</span>
          {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 900, margin: 0 }}>پنل مدیریت شمسه</h2>
          <p style={{ fontSize: '10px', color: subText, margin: '2px 0 0 0' }}>{admin?.fullName || 'مدیر سیستم'}</p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        width: '100%',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        <aside style={{
          width: '260px',
          backgroundColor: cardBg,
          borderLeft: `1px solid ${borderColor}`,
          display: isSidebarOpen ? 'flex' : 'none',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 16px',
          position: window.innerWidth < 1024 ? 'absolute' : 'relative',
          top: 0,
          right: 0,
          height: '100%',
          minHeight: window.innerWidth < 1024 ? 'calc(100vh - 70px)' : 'auto',
          boxSizing: 'border-box',
          zIndex: 99,
          boxShadow: window.innerWidth < 1024 ? '-5px 0 25px rgba(0,0,0,0.5)' : 'none'
        }}>
          <div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: isActive ? 'rgba(109, 0, 26, 0.15)' : 'transparent',
                      color: isActive ? '#ff3366' : textColor,
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      textAlign: 'right',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', borderTop: `1px solid ${borderColor}`, paddingTop: '16px' }}>
            <button 
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                backgroundColor: isDark ? '#1a1a20' : '#f1f5f9',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isDark ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#64748b" />}
              {isDark ? 'حالت روز' : 'حالت شب'}
            </button>

            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
              خروج از حساب
            </button>
          </div>
        </aside>

        <main style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          width: '100%'
        }}>
          {children}
        </main>
      </div>

    </div>
  );
};