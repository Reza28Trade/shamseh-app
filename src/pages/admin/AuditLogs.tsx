import React from 'react';
import { useStore } from '../../store/useStore';
import { FileText, ShieldAlert } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { auditLogs } = useStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(109, 0, 26, 0.2) 0%, rgba(10, 10, 10, 0.8) 100%)', border: '1px solid rgba(109, 0, 26, 0.4)', padding: '24px 32px', borderRadius: '20px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={20} color="#ff3366" /> لاگ تغییرات و فعالیت ادمین‌ها
        </h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>ثبت دقیق هویت ادمین، نوع عملیات و زمان دقیق تغییرات در سیستم</p>
      </div>

      <div style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', padding: '24px 32px', borderRadius: '24px' }}>
        {auditLogs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {auditLogs.map(log => (
              <div key={log.id} style={{ backgroundColor: 'rgba(20, 20, 25, 0.9)', padding: '16px 20px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldAlert size={16} color="#ff3366" />
                  <div>
                    <span style={{ color: '#ff3366', fontWeight: 800, marginLeft: '8px', fontSize: '12px' }}>[{log.performedBy}]</span>
                    <span style={{ color: '#fff', fontSize: '12px' }}>{log.action}: <strong style={{ color: '#38bdf8' }}>{log.details}</strong></span>
                  </div>
                </div>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>{log.timestamp}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '30px 0' }}>هنوز هیچ فعالیتی توسط ادمین‌ها ثبت نشده است.</p>
        )}
      </div>
    </div>
  );
};