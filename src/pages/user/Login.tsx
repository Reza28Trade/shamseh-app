import React, { useState, useEffect } from 'react';
import type { Student, Admin } from '../../types';
import { User, Shield, Lock, ArrowRight, Send, Globe, Camera, Play } from 'lucide-react';

interface AuthUser {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT';
  studentId: string | null;
  student?: { fullName: string; nationalId: string } | null;
}

interface LoginProps {
  students: Student[];
  admins: Admin[];
  onLoginSuccess: (user: AuthUser) => void;
  onAdminLoginSuccess: (user: AuthUser) => void;
  rulesText?: string;
}

export const Login: React.FC<LoginProps> = ({
  students,
  admins,
  onLoginSuccess,
  onAdminLoginSuccess,
  rulesText = '',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewState, setViewState] = useState<'welcome' | 'studentLogin' | 'adminLogin' | 'courses' | 'rules' | 'analysis'>('welcome');
  
  const [studentNationalId, setStudentNationalId] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogoClick = () => {
    setViewState(current => current === 'adminLogin' ? 'welcome' : 'adminLogin');
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    void students;
    void (async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: studentNationalId.trim(), password: studentNationalId.trim() }),
        });
        if (!response.ok) throw new Error('login');
        const data = await response.json();
        if (data.user?.role !== 'STUDENT') throw new Error('role');
        onLoginSuccess(data.user);
      } catch {
        setError('کد ملی وارد شده در سیستم ثبت نشده است.');
      }
    })();
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    void admins;
    void (async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: adminUsername.trim(), password: adminPassword }),
        });
        if (!response.ok) throw new Error('login');
        const data = await response.json();
        if (data.user?.role !== 'SUPER_ADMIN' && data.user?.role !== 'STAFF') throw new Error('role');
        onAdminLoginSuccess(data.user);
      } catch {
        setError('نام کاربری یا رمز عبور ادمین اشتباه است.');
      }
    })();
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#e4e4e7',
      color: '#18181b',
      display: 'flex',
      flexDirection: 'column',
      direction: 'rtl',
      fontFamily: 'system-ui, sans-serif',
      margin: 0,
      padding: 0,
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* بخش بالای مشکی با انحنای هلالی */}
      <div style={{
        width: '100%',
        height: (isLoaded && viewState === 'welcome') ? '52vh' : viewState === 'welcome' ? '100vh' : '28vh',
        backgroundColor: '#111116',
        borderBottomLeftRadius: '120px',
        borderBottomRightRadius: '0px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '30px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        zIndex: 2,
        position: 'relative',
        transition: 'all 1.6s cubic-bezier(0.25, 1, 0.5, 1)',
        boxSizing: 'border-box',
        flexShrink: 0
      }}>
        <div 
          onClick={handleLogoClick}
          style={{
            width: '55%',
            maxWidth: '220px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 1.2s ease',
            margin: '0 auto 10px auto'
          }}
          title="آکادمی شمسه"
        >
          <img 
            src="/logo.png" 
            alt="لوگو آکادمی شمسه" 
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {viewState === 'welcome' && (
          <div style={{
            opacity: isLoaded ? 1 : 0,
            transform: isLoaded ? 'translateY(0)' : 'translateY(15px)',
            transition: 'opacity 1.2s ease 0.4s, transform 1.2s cubic-bezier(0.25, 1, 0.5, 1) 0.4s'
          }}>
            <p style={{ fontSize: '12px', color: '#9CA3AF', maxWidth: '400px', lineHeight: '1.6', margin: '10px 0 0 0' }}>
              موسسه پژوهشی، آموزشی و مطالعاتی تخصصی هنر، معماری و پژوهش هنر
            </p>
          </div>
        )}
      </div>

      {/* بخش پایین صفحه */}
      <div style={{
        width: '100%',
        backgroundColor: '#e4e4e7',
        color: '#18181b',
        padding: '40px 20px 30px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
        zIndex: 1,
        opacity: isLoaded ? 1 : 0,
        transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 1.5s ease 0.3s, transform 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.3s',
        boxSizing: 'border-box'
      }}>
        
        {viewState === 'welcome' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '400px', margin: 'auto' }}>
            <button 
              onClick={() => setViewState('studentLogin')} 
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '30px',
                border: 'none',
                backgroundColor: '#18181b',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
              }}
            >
              ورود به پنل هنرجویی
            </button>

            <button 
              onClick={() => setViewState('courses')} 
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '30px',
                border: '1px solid #d4d4d8',
                backgroundColor: '#f4f4f5',
                color: '#18181b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              معرفی دوره‌ها
            </button>

            <button 
              onClick={() => setViewState('analysis')} 
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '30px',
                border: '1px solid rgba(124, 92, 252, 0.3)',
                backgroundColor: 'rgba(124, 92, 252, 0.08)',
                color: '#7c5cfc',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              آنالیز سؤالات کنکور ۱۴۰۵ (ارشد و دکتری)
            </button>

            <button 
              onClick={() => setViewState('rules')} 
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '30px',
                border: '1px solid #d4d4d8',
                backgroundColor: '#f4f4f5',
                color: '#18181b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              قوانین و مقررات آموزشی
            </button>
          </div>
        )}

        {viewState === 'studentLogin' && (
          <form onSubmit={handleStudentSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#18181b' }}>ورود هنرجو به سامانه</h3>
              <button type="button" onClick={() => { setViewState('welcome'); setError(''); }} style={{ background: 'none', border: 'none', color: '#6D001A', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowRight size={14} /> بازگشت
              </button>
            </div>

            {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '11px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}

            <div>
              <label style={{ fontSize: '11px', color: '#52525b', display: 'block', marginBottom: '6px', fontWeight: 700 }}>کد ملی هنرجو</label>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #d4d4d8', borderRadius: '12px', padding: '0 12px' }}>
                <User size={16} color="#71717a" />
                <input type="text" placeholder="کد ملی خود را وارد کنید" value={studentNationalId} onChange={e => setStudentNationalId(e.target.value)} required style={{ width: '100%', padding: '14px 10px', backgroundColor: 'transparent', border: 'none', color: '#18181b', fontSize: '13px', outline: 'none' }} />
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: '15px', borderRadius: '30px', border: 'none', backgroundColor: '#18181b', color: '#FFFFFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
              ورود به پنل کاربری
            </button>
          </form>
        )}

        {viewState === 'adminLogin' && (
          <form onSubmit={handleAdminSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#18181b' }}>ورود ادمین سیستم</h3>
              <button type="button" onClick={() => { setViewState('welcome'); setError(''); }} style={{ background: 'none', border: 'none', color: '#6D001A', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowRight size={14} /> بازگشت
              </button>
            </div>

            {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '11px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}

            <div>
              <label style={{ fontSize: '11px', color: '#52525b', display: 'block', marginBottom: '6px', fontWeight: 700 }}>نام کاربری ادمین</label>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #d4d4d8', borderRadius: '12px', padding: '0 12px' }}>
                <Shield size={16} color="#71717a" />
                <input type="text" placeholder="admin" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} required style={{ width: '100%', padding: '14px 10px', backgroundColor: 'transparent', border: 'none', color: '#18181b', fontSize: '13px', outline: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#52525b', display: 'block', marginBottom: '6px', fontWeight: 700 }}>رمز عبور</label>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #d4d4d8', borderRadius: '12px', padding: '0 12px' }}>
                <Lock size={16} color="#71717a" />
                <input type="password" placeholder="••••••••" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required style={{ width: '100%', padding: '14px 10px', backgroundColor: 'transparent', border: 'none', color: '#18181b', fontSize: '13px', outline: 'none' }} />
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: '15px', borderRadius: '30px', border: 'none', backgroundColor: '#18181b', color: '#FFFFFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
              ورود به مدیریت سیستم
            </button>
          </form>
        )}

        {viewState === 'courses' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: 'auto', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#18181b' }}>معرفی دوره‌ها</h3>
              <button type="button" onClick={() => setViewState('welcome')} style={{ background: 'none', border: 'none', color: '#6D001A', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowRight size={14} /> بازگشت
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#52525b', lineHeight: 1.8, margin: 0 }}>
              دوره‌های تخصصی آمادگی آزمون ارشد و دکتری هنر، پژوهش هنر و معماری با حضور اساتید برجسته، جزوات انحصاری و کلاس‌های آنلاین ادوبی کانکت.
            </p>
          </div>
        )}

        {viewState === 'rules' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: 'auto', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#18181b' }}>قوانین و مقررات آموزشی</h3>
              <button type="button" onClick={() => setViewState('welcome')} style={{ background: 'none', border: 'none', color: '#6D001A', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowRight size={14} /> بازگشت
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#52525b', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>
              {rulesText}
            </p>
          </div>
        )}

        {viewState === 'analysis' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: 'auto', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#18181b' }}>آنالیز کنکور سال قبل</h3>
              <button type="button" onClick={() => setViewState('welcome')} style={{ background: 'none', border: 'none', color: '#6D001A', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowRight size={14} /> بازگشت
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#52525b', lineHeight: 1.8, margin: 0 }}>
              بررسی آماری و تخصصی سوالات آزمون ارشد و دکتری هنر سال گذشته، تعیین ضریب دشواری مباحث و ارائه کلید طلایی پیشنهادی اساتید شمسه.
            </p>
          </div>
        )}

        {/* شبکه‌های اجتماعی و کپی‌رایت */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '14px' }}>
            <a href="https://t.me" target="_blank" rel="noreferrer" style={socialIconStyle} title="تلگرام">
              <Send size={14} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" style={socialIconStyle} title="اینستاگرام">
              <Camera size={14} />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" style={socialIconStyle} title="یوتیوب">
              <Play size={14} />
            </a>
            <a href="https://shamseh.ir" target="_blank" rel="noreferrer" style={socialIconStyle} title="وب‌سایت">
              <Globe size={14} />
            </a>
          </div>
          <p style={{ fontSize: '10px', color: '#71717a', margin: 0, textAlign: 'center' }}>
            تمامی حقوق مادی و معنوی برای آکادمی شمسه محفوظ است. © 2026
          </p>
        </div>

      </div>
    </div>
  );
};

const socialIconStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  backgroundColor: '#18181b',
  color: '#ffffff',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  textDecoration: 'none',
  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
  transition: 'transform 0.2s ease'
};