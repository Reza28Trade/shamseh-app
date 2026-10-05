import React, { useState } from 'react';
import { BarChart2, BookOpen, CheckCircle2, TrendingUp, Award } from 'lucide-react';

export const ExamAnalysis: React.FC = () => {
  const [selectedExam, setSelectedExam] = useState<'master' | 'phd'>('master');

  const masterData = [
    { subject: 'زبان تخصصی (انگلیسی)', coefficient: 'ضرایب ۳', questionsCount: '۲۰ سوال', importance: 'بسیار بالا', source: 'متون تخصصی هنر' },
    { subject: 'تاریخ هنر ایران و جهان', coefficient: 'ضرایب ۴', questionsCount: '۳۰ سوال', importance: 'حیاتی', source: 'منابع مرجع آکادمی' },
    { subject: 'مبانی نظری هنر و پدیدارشناسی', coefficient: 'ضرایب ۳', questionsCount: '۲۵ سوال', importance: 'بسیار بالا', source: 'جزوات تخصصی شمسه' },
    { subject: 'فرهنگ، هنر و ادبیات ایران', coefficient: 'ضرایب ۲', questionsCount: '۱۵ سوال', importance: 'متوسط', source: 'تحلیل تطبیقی' }
  ];

  const phdData = [
    { subject: 'مجموعه دروس تخصصی پژوهش هنر', coefficient: 'ضرایب ۴', questionsCount: '۴۰ سوال', importance: 'حیاتی', source: 'متون پیشرفته و مقالات' },
    { subject: 'استعداد تحصیلی دکتری', coefficient: 'ضرایب ۱', questionsCount: '۳۰ سوال', importance: 'مهم', source: 'ریاضی و درک مطلب' },
    { subject: 'زبان انگلیسی تخصصی دکتری', coefficient: 'ضرایب ۲', questionsCount: '۳۰ سوال', importance: 'بسیار بالا', source: 'واژگان و گرامر ارشد و دکتری' }
  ];

  const currentList = selectedExam === 'master' ? masterData : phdData;

  return (
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#050505', color: '#f8fafc', direction: 'rtl', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box', padding: '40px' }}>
      
      {/* هدر صفحه */}
      <div style={{ maxWidth: '1100px', margin: '0 auto 30px auto', background: 'linear-gradient(135deg, rgba(109, 0, 26, 0.25) 0%, rgba(10, 10, 10, 0.85) 100%)', border: '1px solid rgba(109, 0, 26, 0.4)', padding: '32px', borderRadius: '24px', backdropFilter: 'blur(16px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart2 size={22} color="#ff3366" /> تحلیل جامع و آمار آزمون‌های ارشد و دکتری
        </h1>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>بررسی ضرایب دروس، میزان اهمیت سرفصل‌ها و تطبیق سوالات سنوات گذشته با جزوات آموزشی آکادمی شمسه</p>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* انتخاب مقطع */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setSelectedExam('master')}
            style={{ padding: '12px 24px', borderRadius: '14px', backgroundColor: selectedExam === 'master' ? '#6D001A' : 'rgba(14, 14, 17, 0.75)', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            تحلیل کنکور کارشناسی ارشد پژوهش هنر
          </button>
          <button 
            onClick={() => setSelectedExam('phd')}
            style={{ padding: '12px 24px', borderRadius: '14px', backgroundColor: selectedExam === 'phd' ? '#6D001A' : 'rgba(14, 14, 17, 0.75)', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            تحلیل کنکور دکتری تخصصی
          </button>
        </div>

        {/* کارت‌های آماری سریع */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(16px)' }}>
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '14px' }}>
              <TrendingUp size={20} color="#38bdf8" />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>درصد تطبیق با جزوات</span>
              <strong style={{ fontSize: '18px', color: '#fff' }}>۹۴.۵ درصد</strong>
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(16px)' }}>
            <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)', padding: '12px', borderRadius: '14px' }}>
              <CheckCircle2 size={20} color="#34d399" />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>پوشش سوالات سال گذشته</span>
              <strong style={{ fontSize: '18px', color: '#fff' }}>رتبه های تک رقمی</strong>
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(16px)' }}>
            <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: '12px', borderRadius: '14px' }}>
              <Award size={20} color="#fbbf24" />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>سطح دشواری آزمون</span>
              <strong style={{ fontSize: '18px', color: '#fff' }}>تحلیلی و مفهومی</strong>
            </div>
          </div>
        </div>

        {/* جدول تحلیل دروس */}
        <div style={{ backgroundColor: 'rgba(14, 14, 17, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '32px', backdropFilter: 'blur(16px)', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="#ff3366" /> جدول مشخصات و ضریب دروس ({selectedExam === 'master' ? 'کارشناسی ارشد' : 'دکتری'})
          </h2>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '14px' }}>نام درس / سرفصل</th>
                <th style={{ padding: '14px' }}>ضریب در آزمون</th>
                <th style={{ padding: '14px' }}>تعداد سوالات تخمینی</th>
                <th style={{ padding: '14px' }}>میزان اهمیت</th>
                <th style={{ padding: '14px' }}>منبع پیشنهادی شمسه</th>
              </tr>
            </thead>
            <tbody>
              {currentList.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#cbd5e1' }}>
                  <td style={{ padding: '16px', fontWeight: 700, color: '#fff' }}>{item.subject}</td>
                  <td style={{ padding: '16px', color: '#38bdf8' }}>{item.coefficient}</td>
                  <td style={{ padding: '16px' }}>{item.questionsCount}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, backgroundColor: item.importance === 'حیاتی' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(52, 211, 153, 0.1)', color: item.importance === 'حیاتی' ? '#f87171' : '#34d399' }}>
                      {item.importance}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#94a3b8' }}>{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};