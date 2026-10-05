import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { CheckCircle, XCircle, Clock, BookOpen, Link } from 'lucide-react';

export const ManageOfflineRequests: React.FC = () => {
  const { offlineRequestsList, updateRequestStatus } = useStore();
  const [links, setLinks] = useState<Record<string, string>>({});

  return (
    <div style={{ backgroundColor: '#0e0e11', border: '1px solid #222228', borderRadius: '20px', padding: '32px', color: '#fff', direction: 'rtl' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BookOpen size={18} color="#ff3366" /> مدیریت درخواست‌های کلاس‌های آفلاین هنرجویان
      </h2>

      {offlineRequestsList && offlineRequestsList.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {offlineRequestsList.map(req => (
            <div key={req.id} style={{ backgroundColor: '#141419', border: '1px solid #222228', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>هنرجو: {req.studentName}</span>
                  <span style={{ fontSize: '12px', color: '#38bdf8' }}>دوره: {req.courseTitle}</span>
                  <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 700 }}>جلسه درخواستی: {req.sessionTitle}</span>
                  {req.meetingLink && (
                    <span style={{ fontSize: '11px', color: '#34d399' }}>لینک ارسالی: <a href={req.meetingLink} target="_blank" rel="noreferrer" style={{ color: '#34d399' }}>{req.meetingLink}</a></span>
                  )}
                  <span style={{ fontSize: '10px', color: '#888' }}>تاریخ ثبت: {req.createdAt}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, backgroundColor: req.status === 'approved' ? 'rgba(52, 211, 153, 0.1)' : req.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)', color: req.status === 'approved' ? '#34d399' : req.status === 'rejected' ? '#f87171' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {req.status === 'approved' && <CheckCircle size={14} />}
                    {req.status === 'rejected' && <XCircle size={14} />}
                    {req.status === 'pending' && <Clock size={14} />}
                    {req.status === 'approved' ? 'تأیید شده' : req.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}
                  </span>
                </div>
              </div>

              {req.status === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Link size={16} color="#38bdf8" />
                    <input 
                      type="url" 
                      placeholder="وارد کردن لینک کلاس یا فایل ضبط شده (https://...)" 
                      value={links[req.id] || ''} 
                      onChange={e => setLinks({ ...links, [req.id]: e.target.value })}
                      style={{ flex: 1, backgroundColor: '#1a1a20', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => {
                        const link = links[req.id] || '';
                        if (!link) {
                          alert('لطفاً لینک جلسه را وارد کنید.');
                          return;
                        }
                        updateRequestStatus(req.id, 'approved', link);
                      }}
                      style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      تأیید و ارسال لینک به هنرجو
                    </button>
                    <button 
                      onClick={() => updateRequestStatus(req.id, 'rejected')}
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      رد درخواست
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#888', fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>هنوز هیچ درخواستی از طرف هنرجویان ثبت نشده است.</p>
      )}
    </div>
  );
};