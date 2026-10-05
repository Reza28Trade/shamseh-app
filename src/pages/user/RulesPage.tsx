import React from 'react';
import { useStore } from '../../store/useStore';
import { ShieldAlert, FileText } from 'lucide-react';

export const RulesPage: React.FC = () => {
  const { rulesText } = useStore();

  return (
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#050505', color: '#f8fafc', direction: 'rtl', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box', padding: '40px', display: 'flex', flexDirection: 'column' }}>
      
      {/* هدر ثابت صفحه */}
      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto 24px auto', background: 'linear-gradient(135deg, rgba(109, 0, 26, 0.25) 0%, rgba(10, 10, 10, 0.85) 100%)', border: '1px solid rgba(109, 0, 26, 0.4)', padding: '28px 36px', borderRadius: '24px', backdropFilter: 'blur(16px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={20} color="#ff3366" /> قوانین و ضوابط آموزشی آکادمی شمسه
        </h1>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>لطفاً پیش از استفاده از امکانات سامانه و حضور در کلاس‌ها، قوانین زیر را به دقت مطالعه کنید.</p>
      </div>

      {/* محتوای با اسکرول داخلی */}
      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', backdropFilter: 'blur(16px)', padding: '32px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '65vh', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
          <FileText size={18} color="#38bdf8" />
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0 }}>متن رسمی قوانین و تعهدات</h2>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingLeft: '10px' }}>
          <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 2.2, whiteSpace: 'pre-line' }}>
            {rulesText || 'هنوز قوانین و مقرراتی توسط مدیریت سامانه ثبت نشده است.'}
          </div>
        </div>

      </div>

    </div>
  );
};