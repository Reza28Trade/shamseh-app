import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { MessageSquare, Send } from 'lucide-react';

export const ManageMessages: React.FC = () => {
  const { messages, answerMessage } = useStore();
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);

  const handleReplySubmit = (msgId: string) => {
    const text = replyText[msgId];
    if (!text || !text.trim()) return;
    answerMessage(msgId, text.trim());
    setReplyText({ ...replyText, [msgId]: '' });
    setSelectedMsgId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(109, 0, 26, 0.2) 0%, rgba(10, 10, 10, 0.8) 100%)', border: '1px solid rgba(109, 0, 26, 0.4)', padding: '24px 32px', borderRadius: '20px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={20} color="#ff3366" /> صندوق پیام‌ها و تیکت‌های دانشجویان
        </h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>پاسخ به سوالات، درخواست‌ها و پیام‌های ارسالی از سمت دانشجویان</p>
      </div>

      <div style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', padding: '24px 32px', borderRadius: '24px' }}>
        {messages.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ backgroundColor: 'rgba(20, 20, 25, 0.9)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>{msg.studentName} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '11px' }}>(موضوع: {msg.subject})</span></span>
                  <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '8px', backgroundColor: msg.status === 'answered' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: msg.status === 'answered' ? '#34d399' : '#f87171', fontWeight: 700 }}>
                    {msg.status === 'answered' ? 'پاسخ داده شده' : 'در انتظار پاسخ'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>{msg.content}</p>
                <span style={{ fontSize: '10px', color: '#666' }}>تاریخ ثبت: {msg.createdAt}</span>

                {msg.adminReply ? (
                  <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '12px', borderRadius: '12px', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 800, display: 'block', marginBottom: '4px' }}>پاسخ ادمین:</span>
                    <p style={{ fontSize: '12px', color: '#fff', margin: 0 }}>{msg.adminReply}</p>
                  </div>
                ) : (
                  <div>
                    {selectedMsgId === msg.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                        <textarea 
                          placeholder="متن پاسخ خود را بنویسید..." 
                          value={replyText[msg.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [msg.id]: e.target.value })}
                          style={{ backgroundColor: 'rgba(14, 14, 17, 0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', fontSize: '12px', minHeight: '80px', outline: 'none', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => handleReplySubmit(msg.id)} style={{ backgroundColor: '#6D001A', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Send size={14} /> ارسال پاسخ
                          </button>
                          <button onClick={() => setSelectedMsgId(null)} style={{ backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}>
                            انصراف
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setSelectedMsgId(msg.id)} style={{ backgroundColor: '#6D001A', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontWeight: 800, alignSelf: 'flex-start', marginTop: '8px', boxShadow: '0 4px 12px rgba(109,0,26,0.3)' }}>
                        ثبت پاسخ به تیکت
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '30px 0' }}>هیچ پیامی از طرف دانشجویان ثبت نشده است.</p>
        )}
      </div>
    </div>
  );
};