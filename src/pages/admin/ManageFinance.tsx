import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Filter, RefreshCw, Search, Wallet } from 'lucide-react';
import { useStore } from '../../store/useStore';

type FinanceStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'INCOMPLETE';
type FinanceStudent = {
  id: string; fullName: string; nationalId: string; phone: string | null;
  courseCount: number; courseTitles: string[]; tuitionTotal: number; paidTotal: number;
  balance: number; credit: number; unpricedCourses: number; status: FinanceStatus;
  payments: Array<{ id: string; amount: number; method: string; reference: string | null; note: string | null; paidAt: string }>;
};
type FinanceResult = {
  summary: { studentCount: number; tuitionTotal: number; paidTotal: number; outstandingBalance: number; unpaidCount: number; partialCount: number; paidCount: number; incompleteCount: number };
  students: FinanceStudent[];
};
type CourseOption = { id: string; title: string };

const statusLabels: Record<FinanceStatus, string> = {
  PAID: 'تسویه‌شده', PARTIAL: 'پرداخت ناقص', UNPAID: 'بدهکار', INCOMPLETE: 'شهریه ناقص',
};
const methodLabels: Record<string, string> = { CASH: 'نقدی', BANK_TRANSFER: 'کارت‌به‌کارت / واریز', CARD: 'کارت‌خوان', OTHER: 'سایر' };
const money = (value: number) => new Intl.NumberFormat('fa-IR').format(Math.round(value || 0)) + ' تومان';

export const ManageFinance: React.FC = () => {
  const theme = useStore((state) => state.theme);
  const dark = theme === 'dark';
  const colors = {
    bg: dark ? '#111116' : '#ffffff', alt: dark ? '#191920' : '#f1f5f9',
    text: dark ? '#f8fafc' : '#0f172a', muted: dark ? '#94a3b8' : '#64748b',
    border: dark ? 'rgba(255,255,255,.1)' : '#e2e8f0', accent: '#6D001A',
  };
  const [result, setResult] = useState<FinanceResult | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [courseId, setCourseId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<FinanceStudent | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/courses', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCourses(Array.isArray(data) ? data.map((course) => ({ id: course.id, title: course.title })) : []);
      }
    } catch { /* finance data can still be viewed if the course filter fails */ }
  };

  const loadFinance = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'ALL') params.set('status', status);
      if (courseId !== 'ALL') params.set('courseId', courseId);
      const response = await fetch(`/api/admin/finance?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('load');
      setResult(await response.json());
    } catch {
      setError('دریافت وضعیت مالی انجام نشد. اتصال به سرور و دسترسی حساب را بررسی کنید.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadCourses(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadFinance(); }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [search, status, courseId]);

  const openPayment = (student: FinanceStudent) => {
    setSelectedStudent(student);
    setPaymentAmount(student.balance > 0 ? String(Math.round(student.balance)) : '');
    setPaymentMethod('BANK_TRANSFER');
    setPaymentReference('');
    setPaymentNote('');
    setError(''); setSuccess('');
  };

  const recordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudent || !paymentAmount || savingPayment) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setError('مبلغ پرداخت باید بیشتر از صفر باشد.'); return; }
    setSavingPayment(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/admin/finance/students/${selectedStudent.id}/payments`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount, method: paymentMethod,
          reference: paymentReference.trim() || undefined,
          note: paymentNote.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'ثبت پرداخت انجام نشد.');
      setSuccess(`پرداخت ${money(amount)} برای ${selectedStudent.fullName} ثبت شد.`);
      setSelectedStudent(null);
      await loadFinance();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ثبت پرداخت انجام نشد.');
    } finally { setSavingPayment(false); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.alt, color: colors.text, fontSize: 12, outline: 'none' };
  const buttonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 12px', border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.bg, color: colors.text, fontSize: 11, fontWeight: 800, cursor: 'pointer' };
  const statCards = result ? [
    { label: 'کل شهریه ثبت‌شده', value: money(result.summary.tuitionTotal), color: colors.text },
    { label: 'کل مبالغ دریافتی', value: money(result.summary.paidTotal), color: '#10b981' },
    { label: 'مانده قابل وصول', value: money(result.summary.outstandingBalance), color: '#ef4444' },
    { label: 'هنرجویان بدهکار', value: new Intl.NumberFormat('fa-IR').format(result.summary.unpaidCount + result.summary.partialCount), color: '#f59e0b' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, color: colors.text, width: '100%', minWidth: 0 }}>
      <header style={{ padding: '24px', borderRadius: 18, background: dark ? 'linear-gradient(120deg, rgba(109,0,26,.3), #111116)' : 'linear-gradient(120deg, #fff, #f1f5f9)', border: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><Wallet size={22} color={dark ? '#fda4af' : colors.accent} /><h2 style={{ fontSize: 19, margin: 0, fontWeight: 900 }}>وضعیت مالی هنرجویان</h2></div>
        <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.9, margin: 0 }}>شهریه از روی مبلغ ثبت‌شده هر دوره در زمان ثبت‌نام محاسبه می‌شود. پرداخت‌ها در پایگاه داده ثبت می‌شوند و مانده بدهی به‌صورت خودکار به‌روزرسانی می‌شود.</p>
      </header>

      {error && <div role="alert" style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: 12 }}>{error}</div>}
      {success && <div role="status" style={{ padding: 12, borderRadius: 10, background: 'rgba(16,185,129,.1)', color: '#10b981', fontSize: 12 }}>{success}</div>}

      {result && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12 }}>
        {statCards.map((card) => <div key={card.label} style={{ padding: 18, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: colors.muted, marginBottom: 10 }}>{card.label}</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: card.color, lineHeight: 1.7 }}>{card.value}</div>
        </div>)}
      </div>}

      <section style={{ padding: 16, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}><Search size={15} color={colors.muted} style={{ position: 'absolute', right: 11, top: 13 }} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجو بر اساس نام، کد ملی یا موبایل..." style={{ ...inputStyle, paddingRight: 34 }} /></div>
        <select aria-label="فیلتر وضعیت مالی" value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}>
          <option value="ALL">همه وضعیت‌های مالی</option><option value="UNPAID">بدهکار</option><option value="PARTIAL">پرداخت ناقص</option><option value="PAID">تسویه‌شده</option><option value="INCOMPLETE">شهریه ناقص</option>
        </select>
        <select aria-label="فیلتر دوره" value={courseId} onChange={(event) => setCourseId(event.target.value)} style={inputStyle}>
          <option value="ALL">همه دوره‌ها</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
        </select>
        <button type="button" onClick={() => { setSearch(''); setStatus('ALL'); setCourseId('ALL'); }} style={buttonStyle}><Filter size={14} /> پاک‌کردن فیلترها</button>
        <button type="button" onClick={() => void loadFinance()} style={buttonStyle}><RefreshCw size={14} /> به‌روزرسانی</button>
      </section>

      {selectedStudent && <form onSubmit={recordPayment} style={{ padding: 20, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>ثبت پرداخت برای {selectedStudent.fullName}</h3>
          <strong style={{ color: '#ef4444', fontSize: 12 }}>مانده بدهی: {money(selectedStudent.balance)}</strong>
        </div>
        {selectedStudent.unpricedCourses > 0 && <div style={{ color: '#f59e0b', fontSize: 12 }}>برای ثبت پرداخت، ابتدا شهریه همه دوره‌های این هنرجو را در پنل مدیریت دوره‌ها مشخص کنید.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>مبلغ پرداخت (تومان)<input type="number" min="1" max={Math.round(selectedStudent.balance)} required value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>روش پرداخت<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} style={inputStyle}><option value="BANK_TRANSFER">کارت‌به‌کارت / واریز</option><option value="CASH">نقدی</option><option value="CARD">کارت‌خوان</option><option value="OTHER">سایر</option></select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>شماره پیگیری (اختیاری)<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>توضیحات (اختیاری)<input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} style={inputStyle} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="submit" disabled={savingPayment || selectedStudent.unpricedCourses > 0 || selectedStudent.balance <= 0} style={{ ...buttonStyle, background: colors.accent, color: '#fff', borderColor: colors.accent, opacity: savingPayment ? .6 : 1 }}><CreditCard size={14} />{savingPayment ? 'در حال ثبت...' : 'ثبت پرداخت'}</button><button type="button" onClick={() => setSelectedStudent(null)} style={buttonStyle}>انصراف</button></div>
      </form>}

      {loading ? <div style={{ padding: 36, textAlign: 'center', color: colors.muted }}>در حال دریافت اطلاعات مالی...</div>
        : !result || result.students.length === 0 ? <div style={{ padding: 36, textAlign: 'center', color: colors.muted, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 16 }}>هنرجویی با این فیلترها پیدا نشد.</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {result.students.map((student) => <article key={student.id} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}><strong style={{ fontSize: 14 }}>{student.fullName}</strong><span style={{ color: colors.muted, fontSize: 11 }}>کد ملی: {student.nationalId}</span></div>
                <div style={{ color: colors.muted, fontSize: 11, lineHeight: 1.9 }}>{student.phone || 'شماره تماس ثبت نشده'} · {student.courseCount} دوره</div>
                <div style={{ color: colors.muted, fontSize: 11, lineHeight: 1.9, marginTop: 4 }}>{student.courseTitles.length ? student.courseTitles.join('، ') : 'دوره‌ای ثبت نشده'}</div>
                {student.unpricedCourses > 0 && <div style={{ color: '#f59e0b', fontSize: 11, marginTop: 5 }}><AlertCircle size={13} style={{ verticalAlign: 'middle', marginLeft: 4 }} />شهریه {student.unpricedCourses} دوره هنوز مشخص نشده است.</div>}
              </div>
              <span style={{ padding: '6px 10px', borderRadius: 999, background: student.status === 'PAID' ? 'rgba(16,185,129,.12)' : student.status === 'INCOMPLETE' ? 'rgba(245,158,11,.12)' : student.status === 'PARTIAL' ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.1)', color: student.status === 'PAID' ? '#10b981' : student.status === 'INCOMPLETE' || student.status === 'PARTIAL' ? '#f59e0b' : '#ef4444', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap' }}>{statusLabels[student.status]}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: 10, marginTop: 16 }}>
              <div style={{ padding: 12, background: colors.alt, borderRadius: 12 }}><div style={{ color: colors.muted, fontSize: 10, marginBottom: 6 }}>کل شهریه</div><strong style={{ fontSize: 12 }}>{money(student.tuitionTotal)}</strong></div>
              <div style={{ padding: 12, background: colors.alt, borderRadius: 12 }}><div style={{ color: colors.muted, fontSize: 10, marginBottom: 6 }}>پرداخت‌شده</div><strong style={{ fontSize: 12, color: '#10b981' }}>{money(student.paidTotal)}</strong></div>
              <div style={{ padding: 12, background: colors.alt, borderRadius: 12 }}><div style={{ color: colors.muted, fontSize: 10, marginBottom: 6 }}>مانده بدهی</div><strong style={{ fontSize: 12, color: student.balance > 0 ? '#ef4444' : colors.text }}>{money(student.balance)}</strong></div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" onClick={() => openPayment(student)} disabled={student.balance <= 0 || student.unpricedCourses > 0} style={{ ...buttonStyle, background: colors.accent, color: '#fff', borderColor: colors.accent, opacity: student.balance <= 0 || student.unpricedCourses > 0 ? .5 : 1 }}><CreditCard size={14} /> ثبت پرداخت</button>
              <button type="button" onClick={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)} style={buttonStyle}>{expandedStudentId === student.id ? 'بستن سوابق پرداخت' : 'مشاهده سوابق پرداخت'} ({student.payments.length})</button>
            </div>
            {expandedStudentId === student.id && <div style={{ marginTop: 14, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
              {student.payments.length === 0 ? <p style={{ fontSize: 12, color: colors.muted, margin: 0 }}>هنوز پرداختی ثبت نشده است.</p> : student.payments.map((payment) => <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '9px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 11 }}>
                <span>{new Date(payment.paidAt).toLocaleDateString('fa-IR')} · {methodLabels[payment.method] || payment.method}{payment.reference ? ` · پیگیری ${payment.reference}` : ''}</span><strong style={{ color: '#10b981' }}>{money(payment.amount)}</strong>
              </div>)}
            </div>}
          </article>)}
        </div>}
      {result?.summary.incompleteCount ? <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 12, background: 'rgba(245,158,11,.1)', color: '#b45309', fontSize: 11, lineHeight: 1.8 }}><AlertCircle size={16} />{result.summary.incompleteCount} هنرجو حداقل یک دوره با شهریه نامشخص دارد. برای محاسبه کامل بدهی، قیمت آن دوره‌ها را در مدیریت دوره‌ها وارد کنید.</div> : null}
    </div>
  );
};
