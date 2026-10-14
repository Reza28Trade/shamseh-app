import { useCallback, useEffect, useState, type CSSProperties } from 'react';

type Payment = { id: string; purpose: string; status: string; claimedAmount: number; approvedAmount: number | null; rejectionReason: string | null; receipts: Array<{ id: string; mimeType: string; uploadedAt: string }> };
type Registration = {
  id: string; applicantFullName: string; nationalId: string; phone: string; academicLevel: string; fieldCode: string;
  status: string; originalTuition: number; discountAmount: number; finalTuition: number; discountReason: string | null;
  exceptionReason: string | null; reviewNote: string | null; mockExamEligible: boolean | null; createdAt: string;
  courses: Array<{ id: string; courseTitleSnapshot: string; coursePriceSnapshot: number }>;
  payments: Payment[];
  reviewHistory: Array<{ id: string; action: string; note: string | null; createdAt: string }>;
};
type Refund = {
  id: string; registrationId: string; amountRequested: number; amountReserved: number | null; status: string;
  reason: string; reviewNote: string | null; transferReference: string | null; requestedAt: string;
  student: { fullName: string; nationalId: string; phone: string }; registration: { finalTuition: number; status: string };
};
const money=(n:number)=>new Intl.NumberFormat('fa-IR').format(n)+' تومان';
const regStatus:Record<string,string>={PENDING_REVIEW:'در انتظار بررسی',NEEDS_CORRECTION:'نیازمند اصلاح',APPROVED:'تأیید شده',REJECTED:'رد شده'};
const payStatus:Record<string,string>={PENDING:'در انتظار بررسی',APPROVED:'تأیید شده',REJECTED:'رد شده'};
const refundStatus:Record<string,string>={REQUESTED:'درخواست جدید',RESERVED:'مبلغ رزرو شده',PAID:'پرداخت شده',REJECTED:'رد شده'};
const buttonStyle:CSSProperties={border:'1px solid var(--admin-brand-border)',background:'var(--admin-accent-soft)',color:'var(--admin-text)',padding:'8px 11px',borderRadius:9,font:'inherit',fontSize:12,fontWeight:800,cursor:'pointer'};
const inputStyle:React.CSSProperties={border:'1px solid var(--admin-border)',background:'var(--admin-control)',color:'var(--admin-text)',padding:'9px 10px',borderRadius:9,font:'inherit',fontSize:12,minWidth:0};

export function ManageRegistrations(){
  const [tab,setTab]=useState<'registrations'|'refunds'>('registrations');
  const [statusFilter,setStatusFilter]=useState('PENDING_REVIEW');
  const [registrations,setRegistrations]=useState<Registration[]>([]);
  const [refunds,setRefunds]=useState<Refund[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [search,setSearch]=useState('');
  const call=async(url:string,init?:RequestInit)=>{
    const r=await fetch(url,{credentials:'include',...init});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(Array.isArray(d.message)?d.message.join('، '):d.message||'درخواست ناموفق بود.');
    return d;
  };
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      if(tab==='registrations')setRegistrations(await call('/api/admin/registrations?status='+encodeURIComponent(statusFilter)));
      else setRefunds(await call('/api/admin/refunds?status='+encodeURIComponent(statusFilter)));
    }catch(e){setError(e instanceof Error?e.message:'خطا در دریافت اطلاعات');}
    finally{setLoading(false);}
  },[tab,statusFilter]);
  useEffect(()=>{void load();},[load]);
  const action=async(url:string,method:string,body:unknown)=>{
    setError('');setNotice('');
    try{await call(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});setNotice('عملیات با موفقیت انجام شد.');await load();}
    catch(e){setError(e instanceof Error?e.message:'عملیات ناموفق بود.');}
  };
  const approve=async(item:Registration)=>{
    const payment=item.payments.find(p=>p.purpose==='INITIAL'&&p.status==='PENDING'&&p.receipts.length>0);
    if(!payment){setError('برای این ثبت‌نام رسید پیش‌پرداخت در انتظار بررسی پیدا نشد.');return;}
    const mode=window.prompt('حالت تأیید را وارد کنید: NORMAL یا DISCOUNT یا PAYMENT_EXCEPTION','NORMAL');
    if(!mode)return;
    if(!['NORMAL','DISCOUNT','PAYMENT_EXCEPTION'].includes(mode)){setError('حالت تأیید معتبر نیست.');return;}
    const discountAmount=mode==='DISCOUNT'?Number(window.prompt('مبلغ تخفیف (تومان)','0')):0;
    if(!Number.isFinite(discountAmount)||discountAmount<0){setError('مبلغ تخفیف معتبر نیست.');return;}
    const discountReason=mode==='DISCOUNT'?window.prompt('علت تخفیف'):undefined;
    const exceptionReason=mode==='PAYMENT_EXCEPTION'?window.prompt('علت استثنای پرداخت (ویژه مدیر ارشد)'):undefined;
    const approvedAmount=Number(window.prompt('مبلغ نهایی تأییدشده رسید (تومان)',String(payment.claimedAmount)));
    if(!Number.isFinite(approvedAmount)||approvedAmount<=0){setError('مبلغ تأییدشده معتبر نیست.');return;}
    const firstDueDate=window.prompt('تاریخ سررسید اولین قسط به شکل YYYY-MM-DD','2026-11-14');
    if(!firstDueDate)return;
    const reviewNote=window.prompt('یادداشت بررسی (اختیاری)')||undefined;
    await action('/api/admin/registrations/'+encodeURIComponent(item.id)+'/approve','PATCH',{
      mode,discountAmount,discountReason,exceptionReason,paymentId:payment.id,approvedAmount,
      firstDueDate:new Date(firstDueDate+'T12:00:00').toISOString(),
      mockExamEligible:window.confirm('آیا هنرجو مشمول آزمون آزمایشی رایگان شود؟'),
      reviewNote,
    });
  };
  const correction=async(item:Registration)=>{
    const note=window.prompt('مواردی که باید اصلاح شوند را دقیق بنویسید.');
    if(note?.trim())await action('/api/admin/registrations/'+encodeURIComponent(item.id)+'/correction','PATCH',{note});
  };
  const reject=async(item:Registration)=>{
    const reason=window.prompt('علت رد ثبت‌نام را وارد کنید.');
    if(reason?.trim())await action('/api/admin/registrations/'+encodeURIComponent(item.id)+'/reject','PATCH',{reason});
  };
  const visibleRegistrations=registrations.filter(x=>[x.applicantFullName,x.nationalId,x.phone,x.fieldCode].some(v=>v.toLowerCase().includes(search.toLowerCase())));
  const visibleRefunds=refunds.filter(x=>[x.student.fullName,x.student.nationalId,x.student.phone].some(v=>v.toLowerCase().includes(search.toLowerCase())));
  return <section style={{display:'grid',gap:16,color:'var(--admin-text)'}}>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <button style={{...buttonStyle,background:tab==='registrations'?'var(--admin-accent)':'var(--admin-accent-soft)',color:tab==='registrations'?'#fff':'var(--admin-text)'}} onClick={()=>{setTab('registrations');setStatusFilter('PENDING_REVIEW');}}>ثبت‌نام‌ها و رسیدها</button>
      <button style={{...buttonStyle,background:tab==='refunds'?'var(--admin-accent)':'var(--admin-accent-soft)',color:tab==='refunds'?'#fff':'var(--admin-text)'}} onClick={()=>{setTab('refunds');setStatusFilter('REQUESTED');}}>درخواست‌های بازپرداخت</button>
      <button style={buttonStyle} onClick={()=>void load()}>به‌روزرسانی</button>
    </div>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <input style={{...inputStyle,flex:'1 1 220px'}} placeholder="جست‌وجو بر اساس نام، کد ملی، موبایل یا کد رشته" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select style={inputStyle} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
        {(tab==='registrations'?[['PENDING_REVIEW','در انتظار بررسی'],['NEEDS_CORRECTION','نیازمند اصلاح'],['APPROVED','تأییدشده'],['REJECTED','ردشده'],['ALL','همه']]:[['REQUESTED','درخواست جدید'],['RESERVED','رزروشده'],['PAID','پرداخت‌شده'],['REJECTED','ردشده'],['ALL','همه']]).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    {error&&<div role="alert" style={{padding:12,borderRadius:10,background:'#fff0ef',color:'#a63730',fontSize:12}}>{error}</div>}
    {notice&&<div role="status" style={{padding:12,borderRadius:10,background:'#eaf6ef',color:'#216743',fontSize:12}}>{notice}</div>}
    {loading&&<p style={{fontSize:12,color:'var(--admin-sub)'}}>در حال دریافت اطلاعات…</p>}
    {tab==='registrations'?<div style={{display:'grid',gap:12,maxHeight:760,overflowY:'auto',paddingInlineEnd:3}}>
      {visibleRegistrations.map(item=><article key={item.id} style={{background:'var(--admin-card)',border:'1px solid var(--admin-border)',borderRadius:14,padding:16,display:'grid',gap:12}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',alignItems:'start'}}>
          <div><strong style={{fontSize:15}}>{item.applicantFullName}</strong><div style={{fontSize:12,color:'var(--admin-sub)',marginTop:5}}>کد ملی: {item.nationalId} · موبایل: {item.phone}</div><div style={{fontSize:12,color:'var(--admin-sub)',marginTop:4}}>مقطع: {item.academicLevel==='MASTER'?'ارشد':'دکتری'} · کد رشته: {item.fieldCode}</div></div>
          <span style={{fontSize:11,fontWeight:850,padding:'6px 9px',borderRadius:20,background:'var(--admin-accent-soft)',color:'var(--admin-accent)'}}>{regStatus[item.status]||item.status}</span>
        </div>
        <div style={{borderTop:'1px solid var(--admin-border)',borderBottom:'1px solid var(--admin-border)',padding:'10px 0',display:'grid',gap:6}}>
          {item.courses.map(c=><div key={c.id} style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:12}}><span>{c.courseTitleSnapshot}</span><strong>{money(c.coursePriceSnapshot)}</strong></div>)}
          <div style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:12}}><span>شهریه اولیه</span><strong>{money(item.originalTuition)}</strong></div>
          {item.discountAmount>0&&<div style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:12}}><span>تخفیف</span><strong>{money(item.discountAmount)}</strong></div>}
          <div style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:13}}><span>شهریه نهایی</span><strong>{money(item.finalTuition)}</strong></div>
        </div>
        <div style={{display:'grid',gap:8}}>
          <strong style={{fontSize:12}}>رسیدها و پرداخت‌ها</strong>
          {item.payments.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',flexWrap:'wrap',fontSize:12}}>
            <span>{p.purpose==='INITIAL'?'پیش‌پرداخت':'قسط'} · {payStatus[p.status]||p.status} · مبلغ اعلامی {money(p.claimedAmount)}{p.approvedAmount!==null?' · تأییدشده '+money(p.approvedAmount):''}</span>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>{p.receipts.map((r,i)=><a key={r.id} href={'/api/admin/registration-receipts/'+encodeURIComponent(r.id)} target="_blank" rel="noreferrer" style={{fontSize:11,color:'var(--admin-accent)'}}>مشاهده رسید {i+1}</a>)}
              {p.purpose==='INSTALLMENT'&&p.status==='PENDING'&&<button style={buttonStyle} onClick={()=>{const decision=window.prompt('نتیجه رسید قسط: APPROVED یا REJECTED','APPROVED');if(decision==='APPROVED'){const approvedAmount=Number(window.prompt('مبلغ تأییدشده',String(p.claimedAmount)));if(Number.isFinite(approvedAmount)&&approvedAmount>0)void action('/api/admin/registration-payments/'+encodeURIComponent(p.id)+'/review','PATCH',{status:'APPROVED',approvedAmount});}else if(decision==='REJECTED'){const rejectionReason=window.prompt('علت رد رسید');if(rejectionReason?.trim())void action('/api/admin/registration-payments/'+encodeURIComponent(p.id)+'/review','PATCH',{status:'REJECTED',rejectionReason});}}}>بررسی رسید قسط</button>}
            </div>
            {p.rejectionReason&&<span style={{color:'#c65b58',fontSize:11}}>علت رد: {p.rejectionReason}</span>}
          </div>)}
        </div>
        {item.reviewNote&&<div style={{fontSize:12,padding:10,borderRadius:9,background:'var(--admin-inner)'}}>یادداشت مدیریت: {item.reviewNote}</div>}
        {['PENDING_REVIEW','NEEDS_CORRECTION'].includes(item.status)&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button style={buttonStyle} onClick={()=>void approve(item)}>بررسی و تأیید نهایی</button>
          <button style={buttonStyle} onClick={()=>void correction(item)}>درخواست اصلاح رسید</button>
          <button style={{...buttonStyle,borderColor:'#e6b9b5',color:'#b44c48'}} onClick={()=>void reject(item)}>رد ثبت‌نام</button>
        </div>}
      </article>)}
      {!loading&&visibleRegistrations.length===0&&<div style={{padding:24,textAlign:'center',background:'var(--admin-card)',borderRadius:12,color:'var(--admin-sub)',fontSize:12}}>موردی برای نمایش وجود ندارد.</div>}
    </div>:<div style={{display:'grid',gap:12,maxHeight:760,overflowY:'auto',paddingInlineEnd:3}}>
      {visibleRefunds.map(item=><article key={item.id} style={{background:'var(--admin-card)',border:'1px solid var(--admin-border)',borderRadius:14,padding:16,display:'grid',gap:10}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong>{item.student.fullName} · {item.student.nationalId}</strong><span style={{fontSize:11,padding:'5px 9px',borderRadius:20,background:'var(--admin-accent-soft)',color:'var(--admin-accent)'}}>{refundStatus[item.status]||item.status}</span></div>
        <div style={{fontSize:13}}>مبلغ درخواستی: <strong>{money(item.amountRequested)}</strong>{item.amountReserved!==null&&<> · مبلغ رزروشده: <strong>{money(item.amountReserved)}</strong></>}</div>
        <p style={{margin:0,fontSize:12,lineHeight:1.8,color:'var(--admin-sub)'}}>{item.reason}</p>
        {item.transferReference&&<div style={{fontSize:12}}>شناسه انتقال: {item.transferReference}</div>}
        {item.status==='REQUESTED'&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button style={buttonStyle} onClick={()=>{const note=window.prompt('یادداشت تأیید (اختیاری)')||'';void action('/api/admin/refunds/'+encodeURIComponent(item.id)+'/review','PATCH',{decision:'RESERVE',note});}}>تأیید و رزرو مبلغ</button>
          <button style={{...buttonStyle,color:'#b44c48'}} onClick={()=>{const note=window.prompt('علت رد درخواست');if(note?.trim())void action('/api/admin/refunds/'+encodeURIComponent(item.id)+'/review','PATCH',{decision:'REJECT',note});}}>رد درخواست</button>
        </div>}
        {item.status==='RESERVED'&&<button style={buttonStyle} onClick={()=>{const transferReference=window.prompt('شماره پیگیری / شناسه انتقال وجه');if(transferReference?.trim())void action('/api/admin/refunds/'+encodeURIComponent(item.id)+'/paid','PATCH',{transferReference});}}>ثبت انتقال وجه و تکمیل بازپرداخت</button>}
      </article>)}
      {!loading&&visibleRefunds.length===0&&<div style={{padding:24,textAlign:'center',background:'var(--admin-card)',borderRadius:12,color:'var(--admin-sub)',fontSize:12}}>درخواستی برای نمایش وجود ندارد.</div>}
    </div>}
  </section>;
}
