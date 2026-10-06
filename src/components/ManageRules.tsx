import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export const ManageRules: React.FC = () => {
  const { rulesText, setRulesText, currentAdmin } = useStore();
  const [text, setText] = useState(rulesText);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setText(rulesText);
  }, [rulesText]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setRulesText(text);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      
      {/* هدر ثابت صفحه */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        paddingBottom: '16px',
        backgroundColor: 'inherit',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 8px 0' }}>مدیریت قوانین و مقررات آموزشی</h3>
        <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>
          متن قوانین را ویرایش کنید. تغییرات بلافاصله در حافظه ماندگار ذخیره شده و برای هنرجویان اعمال می‌شود.
        </p>
      </div>

      {success && (
        <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', flexShrink: 0 }}>
          قوانین با موفقیت ذخیره شد.
        </div>
      )}

      {/* فرم و تکست‌آریا با قابلیت اسکرول نرم و مستقل */}
      <form onSubmit={handleSave} style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: '12px',
        overflowY: 'auto',
        paddingBottom: '20px'
      }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          style={{
            width: '100%',
            minHeight: '300px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            backgroundColor: 'transparent',
            color: 'inherit',
            fontSize: '13px',
            lineHeight: '1.8',
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'vertical'
          }}
        />
        
        <div>
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: '#6D001A',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            ذخیره تغییرات قوانین
          </button>
        </div>
      </form>

    </div>
  );
};