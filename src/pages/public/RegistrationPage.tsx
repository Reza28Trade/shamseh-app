import { useEffect, useMemo, useState, type FormEvent } from 'react';

type Course = { id: string; title: string; professor: string; level: string | null; price: number; coverImage: string | null };
type RegistrationStatus = {
  id: string; status: string; reviewNote: string | null; applicantFullName: string;
  originalTuition: number; discountAmount: number; finalTuition: number;
  courses: Array<{ courseTitleSnapshot: string; coursePriceSnapshot: number }>;
  payments: Array<{ id: string; purpose: string; status: string; claimedAmount: number; approvedAmount: number | null; rejectionReason: string | null; createdAt: string }>;
};
const toEnglishDigits = (value: string) => value.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
const money = (value: number) => new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
const statusLabel: Record<string, string> = {
  PENDING_REVIEW: 'در انتظار بررسی مدیریت',
  NEEDS_CORRECTION: 'نیازمند اصلاح رسید یا اطلاعات',
  APPROVED: 'ثبت‌نام تأیید شده',
  REJECTED: 'ثبت‌نام رد شده',
  PENDING: 'در انتظار بررسی رسید',
  APPROVED_PAYMENT: 'پرداخت تأیید شده',
  REJECTED_PAYMENT: 'رسید نیازمند اصلاح',
};
const paymentStatusLabel: Record<string, string> = {
  PENDING: 'در انتظار بررسی رسید',
  APPROVED: 'رسید تأیید شده',
  REJECTED: 'رسید رد شده',
};

export function RegistrationPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState<'MASTER' | 'DOCTORATE'>('MASTER');
  const [fieldCode, setFieldCode] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [registrationId, setRegistrationId] = useState('');
  const [statusNationalId, setStatusNationalId] = useState('');
  const [statusPhone, setStatusPhone] = useState('');
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [recoveredRegistrations, setRecoveredRegistrations] = useState<Array<{id:string;status:string;createdAt:string;applicantFullName:string}>>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [correctionAmount, setCorrectionAmount] = useState('');
  const [correctionReceipt, setCorrectionReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void fetch('/api/public/registration/courses')
      .then(async (r) => { if (!r.ok) throw new Error('دریافت دوره‌ها ناموفق بود.'); return r.json(); })
      .then(setCourses)
      .catch((e) => setError(e instanceof Error ? e.message : 'خطا در دریافت دوره‌ها'));
  }, []);

  const total = useMemo(() => courses.filter((c) => selected.includes(c.id)).reduce((sum, c) => sum + c.price, 0), [courses, selected]);
  const suggestedPrepayment = Math.ceil(total * 0.6);
  const request = async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { credentials: 'include', ...init });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('، ') : data.message || 'درخواست ناموفق بود.');
    return data;
  };
  const loadStatus = async (id = registrationId, nId = statusNationalId || nationalId, mobile = statusPhone || phone) => {
    setError(''); setNotice('');
    const normalizedNationalId = toEnglishDigits(nId.trim());
    const normalizedPhone = toEnglishDigits(mobile.trim());
    const data = await request('/api/public/registrations/' + encodeURIComponent(id) + '/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nationalId: normalizedNationalId, phone: normalizedPhone }),
    });
    setStatus(data);
    setRegistrationId(id);
    setStatusNationalId(normalizedNationalId);
    setStatusPhone(normalizedPhone);
  };

  const findMyRegistrations = async (event: FormEvent) => {
    event.preventDefault(); setLookupLoading(true); setError(''); setNotice(''); setRecoveredRegistrations([]);
    try {
      const data = await request('/api/public/registrations/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nationalId: toEnglishDigits(statusNationalId.trim()),
          phone: toEnglishDigits(statusPhone.trim()),
        }),
      });
      setRecoveredRegistrations(data);
      if (data.length === 1) {
        setRegistrationId(data[0].id);
        await loadStatus(data[0].id, statusNationalId, statusPhone);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'بازیابی شناسه ثبت‌نام ناموفق بود.');
    } finally { setLookupLoading(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(''); setNotice('');
    try {
      if (!selected.length) throw new Error('حداقل یک دوره انتخاب کنید.');
      if (!receipt) throw new Error('تصویر رسید پرداخت را انتخاب کنید.');
      const form = new FormData();
      form.set('applicantFullName', fullName.trim());
      form.set('nationalId', toEnglishDigits(nationalId.trim()));
      form.set('phone', toEnglishDigits(phone.trim()));
      form.set('academicLevel', level);
      form.set('fieldCode', fieldCode.trim());
      form.set('courseIds', JSON.stringify(selected));
      form.set('claimedAmount', amount);
      form.set('receipt', receipt);
      const data = await request('/api/public/registrations', { method: 'POST', body: form });
      setRegistrationId(data.id);
      setStatusNationalId(toEnglishDigits(nationalId.trim()));
      setStatusPhone(toEnglishDigits(phone.trim()));
      await loadStatus(data.id, toEnglishDigits(nationalId.trim()), toEnglishDigits(phone.trim()));
      setNotice(data.existingStudent ? 'درخواست دوره جدید ثبت شد. حساب قبلی شما حفظ می‌شود و پس از بررسی مدیریت، وضعیت آن را از همین حساب پیگیری می‌کنید.' : 'درخواست شما ثبت شد. شناسه ثبت‌نام را نگه دارید؛ اطلاعات ورود پس از تأیید مدیریت ایجاد می‌شود.');
    } catch (e) { setError(e instanceof Error ? e.message : 'ثبت درخواست ناموفق بود.'); }
    finally { setLoading(false); }
  };

  const submitCorrection = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(''); setNotice('');
    try {
      if (!correctionReceipt) throw new Error('رسید اصلاح‌شده را انتخاب کنید.');
      const form = new FormData();
      form.set('nationalId', toEnglishDigits(statusNationalId.trim()));
      form.set('phone', toEnglishDigits(statusPhone.trim()));
      form.set('claimedAmount', toEnglishDigits(correctionAmount));
      form.set('receipt', correctionReceipt);
      await request('/api/public/registrations/' + encodeURIComponent(registrationId) + '/receipts', { method: 'POST', body: form });
      setCorrectionReceipt(null);
      await loadStatus(registrationId, statusNationalId, statusPhone);
      setNotice('رسید جدید ثبت شد و برای بررسی دوباره ارسال شد.');
    } catch (e) { setError(e instanceof Error ? e.message : 'ارسال رسید اصلاحی ناموفق بود.'); }
    finally { setLoading(false); }
  };

  return <main className="reg-page" dir="rtl">
    <style>{`
      .reg-page{min-height:100vh;background:#EEE5DA;color:#262424;font-family:Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif;padding:28px 16px 60px}
      .reg-wrap{max-width:1080px;margin:0 auto}.reg-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:24px}.reg-brand{display:flex;align-items:center;gap:12px}.reg-brand img{width:54px;height:54px;object-fit:contain}.reg-brand h1{font-size:21px;margin:0 0 4px;font-weight:900}.reg-brand p{margin:0;color:#655D55;font-size:12px}.reg-back{color:#008080;text-decoration:none;font-size:12px;font-weight:800}
      .reg-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(290px,.8fr);gap:18px;align-items:start}.reg-card{background:#F7F1E8;border:1px solid #D8CBB9;border-radius:18px;padding:22px;box-shadow:0 10px 28px rgba(24,32,34,.04);min-width:0}.reg-card h2{font-size:17px;margin:0 0 6px}.reg-muted{font-size:12px;color:#655D55;line-height:1.9;margin:0 0 18px}.reg-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.reg-field{display:grid;gap:6px;font-size:12px;font-weight:750}.reg-field input,.reg-field select{width:100%;min-width:0;box-sizing:border-box;border:1px solid #D8CBB9;border-radius:10px;padding:11px 12px;font:inherit;font-size:13px;color:#262424;background:#F7F1E8;outline-color:#008080}.reg-course-list{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0 18px}.reg-course{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid #D8CBB9;border-radius:12px;cursor:pointer}.reg-course:has(input:checked){border-color:#008080;background:#E5D9CB}.reg-course input{margin-top:4px;accent-color:#008080}.reg-course strong{display:block;font-size:12px}.reg-course small{display:block;color:#655D55;font-size:11px;margin-top:5px}.reg-total{display:flex;justify-content:space-between;gap:12px;align-items:center;background:#E5D9CB;border-radius:12px;padding:13px 14px;margin:16px 0;font-size:12px}.reg-total strong{font-size:15px;color:#008080}.reg-button{border:0;border-radius:10px;background:#008080;color:#F7F1E8;font:inherit;font-weight:850;font-size:13px;padding:12px 16px;cursor:pointer;width:100%}.reg-button:disabled{opacity:.55;cursor:not-allowed}.reg-status-form{display:grid;gap:10px}.reg-notice{background:#E5D9CB;border:1px solid #B7C8BE;color:#006B68;padding:12px;border-radius:10px;font-size:12px;line-height:1.8;margin-bottom:12px}.reg-error{background:#fff1f1;border:1px solid #f0d2d4;color:#b5414a;padding:12px;border-radius:10px;font-size:12px;line-height:1.8;margin-bottom:12px}.reg-status-pill{display:inline-block;border-radius:999px;background:#DDE8DE;color:#008080;padding:6px 10px;font-size:11px;font-weight:850}.reg-status-line{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #E5D9CB;font-size:12px}.reg-status-line:last-child{border-bottom:0}.reg-history{margin-top:14px;padding-top:12px;border-top:1px solid #D8CBB9}.reg-history h3{font-size:13px}.reg-small{font-size:11px;color:#655D55;line-height:1.8}.reg-recovery{margin-top:20px;padding-top:18px;border-top:1px solid #D8CBB9}.reg-recovery h3{font-size:13px;margin:0 0 7px}.reg-button-secondary{background:#262424}.reg-recovered-list{display:grid;gap:8px;margin-top:12px}.reg-recovered-list>strong{font-size:12px}.reg-recovered-item{display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:right;padding:11px;border:1px solid #D8CBB9;background:#F7F1E8;border-radius:10px;color:#262424;cursor:pointer}.reg-recovered-item span{display:grid;gap:4px}.reg-recovered-item b{font-size:12px}.reg-recovered-item small{font-size:10px;color:#655D55}.reg-mobile-actions{display:flex;gap:10px;flex-wrap:wrap}.reg-mobile-actions input{min-width:0;flex:1}.reg-mobile-actions .reg-button{width:auto;min-width:110px}
      @media(max-width:760px){.reg-grid{grid-template-columns:1fr}.reg-fields,.reg-course-list{grid-template-columns:1fr}.reg-header{align-items:flex-start}.reg-brand h1{font-size:17px}.reg-card{padding:16px}.reg-page{padding:18px 12px 40px}}
    `}</style>
    <div className="reg-wrap">
      <header className="reg-header">
        <div className="reg-brand"><img src="/logo.png" alt="لوگوی شمسه"/><div><h1>ثبت‌نام دوره‌های شمسه</h1><p>ثبت درخواست، ارسال رسید و پیگیری وضعیت</p></div></div>
        <a className="reg-back" href="/">بازگشت به صفحه ورود</a>
      </header>
      {notice && <div className="reg-notice" role="status">{notice}{registrationId && <div>شناسه ثبت‌نام: <strong>{registrationId}</strong></div>}</div>}
      {error && <div className="reg-error" role="alert">{error}</div>}
      <div className="reg-grid">
        <form className="reg-card" onSubmit={submit}>
          <h2>درخواست ثبت‌نام جدید</h2>
          <p className="reg-muted">اگر قبلاً هنرجوی شمسه هستید، همین صفحه برای ثبت‌نام دوره جدید است؛ کد ملی و شماره موبایل ثبت‌شده در حساب قبلی را وارد کنید تا درخواست به همان حساب متصل شود. پرداخت‌ها و اقساط هر دوره جداگانه محاسبه می‌شوند.</p>
          <div className="reg-fields">
            <label className="reg-field">نام و نام خانوادگی<input required minLength={3} value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name"/></label>
            <label className="reg-field">کد ملی<input required pattern="\d{10}" maxLength={10} value={nationalId} onChange={e=>setNationalId(toEnglishDigits(e.target.value))} inputMode="numeric"/></label>
            <label className="reg-field">شماره موبایل<input required pattern="09\d{9}" maxLength={11} value={phone} onChange={e=>setPhone(toEnglishDigits(e.target.value))} inputMode="tel"/></label>
            <label className="reg-field">مقطع تحصیلی<select value={level} onChange={e=>setLevel(e.target.value as 'MASTER'|'DOCTORATE')}><option value="MASTER">کارشناسی ارشد</option><option value="DOCTORATE">دکتری</option></select></label>
            <label className="reg-field">کد رشته / کد گرایش<input required value={fieldCode} onChange={e=>setFieldCode(e.target.value)} /></label>
            <label className="reg-field">مبلغ پرداخت‌شده واقعی (تومان)<input required type="number" min="1" step="1" value={amount} onChange={e=>setAmount(e.target.value)} inputMode="numeric"/></label>
          </div>
          <h3 style={{fontSize:14,margin:'22px 0 4px'}}>انتخاب دوره‌ها</h3>
          {courses.length === 0 ? <p className="reg-muted">دوره فعال قیمت‌گذاری‌شده‌ای پیدا نشد.</p> : <div className="reg-course-list">{courses.map(course=><label className="reg-course" key={course.id}><input type="checkbox" checked={selected.includes(course.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,course.id]:prev.filter(id=>id!==course.id))}/><span><strong>{course.title}</strong><small>{course.professor}{course.level ? ' · '+(({FARDI:'کارشناسی ارشد',MASTER:'کارشناسی ارشد',MASTERS:'کارشناسی ارشد',DOCTORATE:'دکتری',DOCTORAL:'دکتری'} as Record<string,string>)[course.level.trim().toUpperCase()] || course.level) : ''}</small><small>{money(course.price)}</small></span></label>)}</div>}
          <div className="reg-total"><span>جمع شهریه دوره‌های انتخاب‌شده</span><strong>{money(total)}</strong></div>
          <div className="reg-total" style={{display:'grid',gap:8,alignItems:'stretch',background:'#E5D9CB',border:'1px solid #B7C8BE'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><span>پیش‌پرداخت پیشنهادی (۶۰٪ شهریه)</span><strong>{money(suggestedPrepayment)}</strong></div><p className="reg-small" style={{margin:0}}>این مبلغ فقط پیشنهاد است؛ مبلغ واقعی پرداخت‌شده مطابق رسید بانکی را وارد کنید. در صورت پرداخت کمتر، بررسی استثنا فقط توسط مدیر ارشد انجام می‌شود.</p><button type="button" className="reg-button" disabled={total<=0} onClick={()=>setAmount(String(suggestedPrepayment))}>استفاده از مبلغ پیشنهادی</button></div>
          <label className="reg-field" style={{marginBottom:16}}>تصویر رسید بانکی (JPG، PNG یا WEBP؛ حداکثر ۸ مگابایت)<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setReceipt(e.target.files?.[0] ?? null)}/></label>
          <button className="reg-button" disabled={loading || !courses.length} type="submit">{loading?'در حال ارسال…':'ثبت درخواست و ارسال رسید'}</button>
        </form>
        <div className="reg-card">
          <h2>پیگیری ثبت‌نام</h2>
          <p className="reg-muted">شناسه ثبت‌نام، کد ملی و شماره موبایل را وارد کنید تا وضعیت بررسی و علت اصلاح را ببینید.</p>
          <form className="reg-status-form" onSubmit={e=>{e.preventDefault();setLoading(true);void loadStatus().catch(err=>setError(err instanceof Error?err.message:'پیگیری ناموفق بود.')).finally(()=>setLoading(false));}}>
            <label className="reg-field">شناسه ثبت‌نام<input required value={registrationId} onChange={e=>setRegistrationId(e.target.value)}/></label>
            <label className="reg-field">کد ملی<input required value={statusNationalId} onChange={e=>setStatusNationalId(toEnglishDigits(e.target.value))} inputMode="numeric"/></label>
            <label className="reg-field">شماره موبایل<input required value={statusPhone} onChange={e=>setStatusPhone(toEnglishDigits(e.target.value))} inputMode="tel"/></label>
            <button className="reg-button" disabled={loading} type="submit">بررسی وضعیت</button>
          </form>
          <div className="reg-recovery">
            <h3>شناسه ثبت‌نام را فراموش کرده‌اید؟</h3>
            <p className="reg-small">بدون نیاز به شناسه، با همان کد ملی و شماره موبایلی که هنگام پیش‌ثبت‌نام وارد کردید، درخواست‌هایتان را پیدا کنید.</p>
            <form className="reg-status-form" onSubmit={findMyRegistrations}>
              <label className="reg-field">کد ملی<input required pattern="\\d{10}" maxLength={10} value={statusNationalId} onChange={e=>setStatusNationalId(toEnglishDigits(e.target.value))} inputMode="numeric"/></label>
              <label className="reg-field">شماره موبایل<input required pattern="09\\d{9}" maxLength={11} value={statusPhone} onChange={e=>setStatusPhone(toEnglishDigits(e.target.value))} inputMode="tel"/></label>
              <button className="reg-button reg-button-secondary" disabled={lookupLoading} type="submit">{lookupLoading?'در حال جست‌وجو…':'بازیابی درخواست‌های من'}</button>
            </form>
            {recoveredRegistrations.length > 0 && <div className="reg-recovered-list"><strong>درخواست‌های پیدا‌شده</strong>{recoveredRegistrations.map(item=><button type="button" className="reg-recovered-item" key={item.id} onClick={()=>{setRegistrationId(item.id);setLoading(true);void loadStatus(item.id,statusNationalId,statusPhone).catch(err=>setError(err instanceof Error?err.message:'دریافت وضعیت ناموفق بود.')).finally(()=>setLoading(false));}}><span><b>{item.applicantFullName}</b><small>{new Date(item.createdAt).toLocaleDateString('fa-IR')} · {statusLabel[item.status]||item.status}</small></span><small>مشاهده وضعیت ←</small></button>)}</div>}
          </div>
          {status && <div className="reg-history">
            <span className="reg-status-pill">{statusLabel[status.status] || status.status}</span>
            <div className="reg-status-line"><span>نام متقاضی</span><strong>{status.applicantFullName}</strong></div>
            <div className="reg-status-line"><span>شهریه اولیه</span><strong>{money(status.originalTuition)}</strong></div>
            <div className="reg-status-line"><span>تخفیف ثبت‌شده</span><strong>{money(status.discountAmount)}</strong></div>
            <div className="reg-status-line"><span>شهریه نهایی</span><strong>{money(status.finalTuition)}</strong></div>
            {status.reviewNote && <div className="reg-error" style={{marginTop:12,marginBottom:0}}><strong>پیام مدیریت:</strong><div>{status.reviewNote}</div></div>}
            <h3>سوابق رسید</h3>
            {status.payments.map(p=><div className="reg-status-line" key={p.id}><span>{p.purpose==='INITIAL'?'پیش‌پرداخت':'قسط'} · {paymentStatusLabel[p.status]||p.status}{p.rejectionReason && <small style={{display:'block',color:'#b5414a'}}>{p.rejectionReason}</small>}</span><strong>{money(p.approvedAmount ?? p.claimedAmount)}</strong></div>)}
            {status.status === 'NEEDS_CORRECTION' && <form onSubmit={submitCorrection} className="reg-status-form" style={{marginTop:16}}>
              <h3>ارسال رسید اصلاح‌شده</h3>
              <label className="reg-field">مبلغ پرداخت (تومان)<input required type="number" min="1" value={correctionAmount} onChange={e=>setCorrectionAmount(e.target.value)}/></label>
              <label className="reg-field">رسید جدید<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setCorrectionReceipt(e.target.files?.[0] ?? null)}/></label>
              <button className="reg-button" disabled={loading} type="submit">ارسال برای بررسی مجدد</button>
            </form>}
          </div>}
        </div>
      </div>
    </div>
  </main>;
}
