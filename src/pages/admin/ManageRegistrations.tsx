import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { JalaliDatePicker } from '../../components/JalaliDatePicker';

type Payment = { id: string; purpose: string; status: string; claimedAmount: number; approvedAmount: number | null; rejectionReason: string | null; paymentDate?: string; createdAt?: string; trackingCode?: string | null; receipts: Array<{ id: string; mimeType: string; uploadedAt: string }> };
type Registration = {
  id: string; applicantFullName: string; nationalId: string; phone: string; academicLevel: string; fieldCode: string;
  status: string; originalTuition: number; discountAmount: number; finalTuition: number; discountReason: string | null;
  exceptionReason: string | null; reviewNote: string | null; mockExamEligible: boolean | null; createdAt: string;
  courses: Array<{ id: string; courseTitleSnapshot: string; coursePriceSnapshot: number }>;
  payments: Payment[];
  student: { id: string; fullName: string; nationalId: string; isArchived: boolean } | null;
  balance: number;
  manualSettlementAmount: number;
  manualSettledAt: string | null;
  manualSettlementNote: string | null;
  reviewHistory: Array<{ id: string; action: string; note: string | null; createdAt: string }>;
};
type Refund = {
  id: string; registrationId: string; amountRequested: number; amountReserved: number | null; status: string;
  reason: string; reviewNote: string | null; transferReference: string | null; requestedAt: string; paidAt?: string | null; createdAt?: string;
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
  const [mockExams,setMockExams]=useState<Array<{id:string;title:string;level:string;field:string;examDate:string;status:string}>>([]);
  const [refunds,setRefunds]=useState<Refund[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [search,setSearch]=useState('');
  const [approval,setApproval]=useState<{item:Registration;payment:Payment}|null>(null);
  const [selectedRegistration,setSelectedRegistration]=useState<Registration|null>(null);
  const [selectedRefund,setSelectedRefund]=useState<Refund|null>(null);
  const [listPage,setListPage]=useState(1);
  const [approvalMode,setApprovalMode]=useState<'NORMAL'|'DISCOUNT'|'PAYMENT_EXCEPTION'>('NORMAL');
  const [discountAmount,setDiscountAmount]=useState('0');
  const [discountReason,setDiscountReason]=useState('');
  const [exceptionReason,setExceptionReason]=useState('');
  const [approvedAmount,setApprovedAmount]=useState('');
  const [firstDueDate,setFirstDueDate]=useState('');
  const [reviewNote,setReviewNote]=useState('');
  const [mockExamEligible,setMockExamEligible]=useState(false);
  const [mockExamId,setMockExamId]=useState('');
  const [savingApproval,setSavingApproval]=useState(false);
  const call=async(url:string,init?:RequestInit)=>{
    const r=await fetch(url,{credentials:'include',...init});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(Array.isArray(d.message)?d.message.join('، '):d.message||'درخواست ناموفق بود.');
    return d;
  };
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const [items,refundItems,exams]=await Promise.all([
        call('/api/admin/registrations?status=ALL'),
        call('/api/admin/refunds?status=ALL'),
        call('/api/admin/registrations/mock-exams'),
      ]);
      setRegistrations(items);
      setRefunds(refundItems);
      setMockExams(exams);
    }catch(e){setError(e instanceof Error?e.message:'خطا در دریافت اطلاعات');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const action=async(url:string,method:string,body:unknown)=>{
    setError('');setNotice('');
    try{await call(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});setNotice('عملیات با موفقیت انجام شد.');await load();}
    catch(e){setError(e instanceof Error?e.message:'عملیات ناموفق بود.');}
  };
  const approve=(item:Registration)=>{
    const payment=item.payments.find(p=>p.purpose==='INITIAL'&&p.status==='PENDING'&&p.receipts.length>0);
    if(!payment){setError('برای این ثبت‌نام رسید پیش‌پرداخت در انتظار بررسی پیدا نشد.');return;}
    const due=new Date();due.setDate(due.getDate()+30);
    setApproval({item,payment});setApprovalMode('NORMAL');setDiscountAmount('0');setDiscountReason('');setExceptionReason('');
    setApprovedAmount(String(payment.claimedAmount));setFirstDueDate([due.getFullYear(),String(due.getMonth()+1).padStart(2,'0'),String(due.getDate()).padStart(2,'0')].join('-'));
    setReviewNote('');setMockExamEligible(false);setMockExamId('');setError('');
  };
  const submitApproval=async()=>{
    if(!approval)return;
    const discount=approvalMode==='DISCOUNT'?Number(discountAmount):0;
    const amount=Number(approvedAmount);
    if(!Number.isFinite(discount)||discount<0||discount>approval.item.originalTuition){setError('مبلغ تخفیف معتبر نیست.');return;}
    if(approvalMode==='DISCOUNT'&&!discountReason.trim()){setError('علت تخفیف را وارد کنید.');return;}
    if(approvalMode==='PAYMENT_EXCEPTION'&&!exceptionReason.trim()){setError('علت استثنای پرداخت را وارد کنید.');return;}
    if(!Number.isFinite(amount)||amount<=0){setError('مبلغ تأییدشده باید بیشتر از صفر باشد.');return;}
    const finalTuition=approval.item.originalTuition-discount;
    if(amount<finalTuition&&!/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)){setError('تاریخ سررسید اولین قسط را انتخاب کنید.');return;}
    if(mockExamEligible&&!mockExamId){setError('آزمون آزمایشی را انتخاب کنید.');return;}
    setSavingApproval(true);
    try{
      await call('/api/admin/registrations/'+encodeURIComponent(approval.item.id)+'/approve',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        mode:approvalMode,discountAmount:discount,discountReason:approvalMode==='DISCOUNT'?discountReason.trim():undefined,
        exceptionReason:approvalMode==='PAYMENT_EXCEPTION'?exceptionReason.trim():undefined,paymentId:approval.payment.id,
        approvedAmount:amount,firstDueDate:amount<finalTuition?firstDueDate:undefined,
        mockExamEligible,mockExamId:mockExamEligible?mockExamId:undefined,reviewNote:reviewNote.trim()||undefined,
      })});
      setApproval(null);setNotice('ثبت‌نام با موفقیت تأیید شد.');await load();
    }catch(e){setError(e instanceof Error?e.message:'تأیید ثبت‌نام انجام نشد.');}
    finally{setSavingApproval(false);}
  };
  const correction=async(item:Registration)=>{
    const note=window.prompt('مواردی که باید اصلاح شوند را دقیق بنویسید.');
    if(note?.trim())await action('/api/admin/registrations/'+encodeURIComponent(item.id)+'/correction','PATCH',{note});
  };
  const reject=async(item:Registration)=>{
    const reason=window.prompt('علت رد ثبت‌نام را وارد کنید.');
    if(reason?.trim())await action('/api/admin/registrations/'+encodeURIComponent(item.id)+'/reject','PATCH',{reason});
  };
  const visibleRegistrations=registrations.filter(x=>(statusFilter==='ALL'||x.status===statusFilter)&&[x.applicantFullName,x.nationalId,x.phone,x.fieldCode].some(v=>v.toLowerCase().includes(search.toLowerCase())));
  const visibleRefunds=refunds.filter(x=>(statusFilter==='ALL'||x.status===statusFilter)&&[x.student.fullName,x.student.nationalId,x.student.phone].some(v=>v.toLowerCase().includes(search.toLowerCase())));
  const pageSize=10;
  const activeListCount=tab==='registrations'?visibleRegistrations.length:visibleRefunds.length;
  const pageCount=Math.max(1,Math.ceil(activeListCount/pageSize));
  const safeListPage=Math.min(listPage,pageCount);
  const pagedRegistrations=visibleRegistrations.slice((safeListPage-1)*pageSize,safeListPage*pageSize);
  const pagedRefunds=visibleRefunds.slice((safeListPage-1)*pageSize,safeListPage*pageSize);
  const approvedRegistrations=registrations.filter(item=>item.status==='APPROVED');
  const archivedDebtors=approvedRegistrations.filter(item=>item.student?.isArchived && item.balance>0.0001);
  const archivedSettled=approvedRegistrations.filter(item=>item.student?.isArchived && item.manualSettlementAmount>0 && item.balance<=0.0001);
  const approvedTuition=approvedRegistrations.reduce((sum,item)=>sum+item.finalTuition,0);
  const approvedPayments=approvedRegistrations.flatMap(item=>item.payments).filter(payment=>payment.status==='APPROVED').reduce((sum,payment)=>sum+(payment.approvedAmount??0),0);
  const pendingPayments=registrations.flatMap(item=>item.payments).filter(payment=>payment.status==='PENDING').length;
  const paidRefunds=refunds.filter(item=>item.status==='PAID').reduce((sum,item)=>sum+(item.amountReserved??item.amountRequested),0);
  const openRefunds=refunds.filter(item=>item.status==='REQUESTED'||item.status==='RESERVED').length;
  const financialTransactions=[
    ...registrations.flatMap(item=>item.payments.map(payment=>({
      id:'payment:'+payment.id,date:payment.paymentDate||payment.createdAt||item.createdAt,
      student:item.applicantFullName,nationalId:item.nationalId,
      kind:payment.purpose==='INITIAL'?'پیش‌پرداخت ثبت‌نام':'پرداخت قسط',
      status:payStatus[payment.status]||payment.status,
      amount:payment.approvedAmount??payment.claimedAmount,
      detail:(payment.approvedAmount!==null?'مبلغ تأییدشده: '+money(payment.approvedAmount)+' · ':'')+'مبلغ اعلامی: '+money(payment.claimedAmount)+(payment.trackingCode?' · پیگیری: '+payment.trackingCode:'')+(payment.rejectionReason?' · علت رد: '+payment.rejectionReason:''),
    }))),
    ...refunds.map(item=>({
      id:'refund:'+item.id,date:item.paidAt||item.requestedAt,
      student:item.student.fullName,nationalId:item.student.nationalId,
      kind:'بازپرداخت شهریه',status:refundStatus[item.status]||item.status,
      amount:item.amountReserved??item.amountRequested,
      detail:item.transferReference?'شناسه انتقال: '+item.transferReference+' · '+item.reason:item.reason,
    })),
  ].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
  return <section className="admin-finance-registration-page" style={{display:'grid',gap:16,color:'var(--admin-text)'}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:10}}>
      {[
        {label:'ثبت‌نام تأییدشده',value:new Intl.NumberFormat('fa-IR').format(approvedRegistrations.length),tone:'var(--admin-text)'},
        {label:'شهریه نهایی مصوب',value:money(approvedTuition),tone:'var(--admin-text)'},
        {label:'پرداخت‌های تأییدشده',value:money(approvedPayments),tone:'#1d9a72'},
        {label:'مانده شهریه کل',value:money(Math.max(0,approvedTuition-approvedPayments)),tone:Math.max(0,approvedTuition-approvedPayments)>0?'#c65b58':'#1d9a72'},
        {label:'رسیدهای در انتظار',value:new Intl.NumberFormat('fa-IR').format(pendingPayments),tone:pendingPayments?'#b7791f':'var(--admin-text)'},
        {label:'بازپرداخت‌های باز',value:new Intl.NumberFormat('fa-IR').format(openRefunds),tone:openRefunds?'#b7791f':'var(--admin-text)'},
        {label:'مجموع بازپرداخت انجام‌شده',value:money(paidRefunds),tone:'var(--admin-text)'},
      ].map(card=><article key={card.label} style={{background:'var(--admin-card)',border:'1px solid var(--admin-border)',borderRadius:12,padding:'14px 15px',display:'grid',gap:8,minWidth:0}}>
        <span style={{fontSize:11,color:'var(--admin-sub)',lineHeight:1.7}}>{card.label}</span>
        <strong style={{fontSize:15,color:card.tone,overflowWrap:'anywhere'}}>{card.value}</strong>
      </article>)}
    </div>
    <section style={{background:'var(--admin-card)',border:'1px solid var(--admin-border)',borderRadius:14,padding:14,display:'grid',gap:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div><h3 style={{margin:0,fontSize:15}}>پیگیری بدهکاران بایگانی‌شده</h3><p style={{margin:'5px 0 0',fontSize:11,color:'var(--admin-sub)'}}>این هنرجویان به پنل دسترسی ندارند؛ بدهی و سوابق مالی آن‌ها حفظ شده است. پس از دریافت وجه، تسویه را دستی ثبت کنید.</p></div>
        <span style={{fontSize:11,color:archivedDebtors.length?'#c65b58':'var(--admin-sub)'}}>{new Intl.NumberFormat('fa-IR').format(archivedDebtors.length)} بدهکار</span>
      </div>
      <div style={{display:'grid',gap:8,maxHeight:280,overflowY:'auto'}}>
        {archivedDebtors.map(item=><article key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',padding:12,border:'1px solid var(--admin-border)',borderRadius:10,background:'var(--admin-inner)'}}>
          <div style={{display:'grid',gap:5,minWidth:180}}><strong>{item.student?.fullName||item.applicantFullName}</strong><span style={{fontSize:11,color:'var(--admin-sub)'}}>کد ملی: {item.student?.nationalId||item.nationalId} · ثبت‌نام: {item.courses.map(course=>course.courseTitleSnapshot).join('، ')||'—'}</span><strong style={{color:'#c65b58',fontSize:13}}>مانده بدهی: {money(item.balance)}</strong>{item.manualSettlementAmount>0&&<span style={{fontSize:11,color:'var(--admin-sub)'}}>تسویه دستی قبلی: {money(item.manualSettlementAmount)}</span>}</div>
          <button type="button" style={{...buttonStyle,background:'var(--admin-accent)',color:'#fff'}} onClick={()=>{const note=window.prompt('توضیح ثبت تسویه (مثلاً دریافت وجه نقد یا شناسه انتقال)');if(note?.trim())void action('/api/admin/registrations/'+encodeURIComponent(item.id)+'/settle-debt','PATCH',{note:note.trim()});}}>ثبت تسویه دستی</button>
        </article>)}
        {!archivedDebtors.length&&<div style={{padding:18,textAlign:'center',color:'var(--admin-sub)',fontSize:12}}>هنرجوی بایگانی‌شده با بدهی باز وجود ندارد.</div>}
      </div>
    </section>
    {archivedSettled.length>0&&<section style={{background:'var(--admin-card)',border:'1px solid var(--admin-border)',borderRadius:14,padding:14,display:'grid',gap:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}><h3 style={{margin:0,fontSize:15}}>تسویه‌های ثبت‌شده هنرجویان بایگانی‌شده</h3><span style={{fontSize:11,color:'#1d9a72'}}>{new Intl.NumberFormat('fa-IR').format(archivedSettled.length)} مورد تسویه</span></div>
      <div style={{display:'grid',gap:8,maxHeight:220,overflowY:'auto'}}>
        {archivedSettled.map(item=><div key={item.id} style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',padding:10,border:'1px solid var(--admin-border)',borderRadius:9,background:'var(--admin-inner)'}}>
          <div><strong>{item.student?.fullName||item.applicantFullName}</strong><div style={{fontSize:11,color:'var(--admin-sub)',marginTop:4}}>تسویه ثبت‌شده: {money(item.manualSettlementAmount)} · {item.manualSettledAt?new Date(item.manualSettledAt).toLocaleDateString('fa-IR'):'تاریخ نامشخص'}</div>{item.manualSettlementNote&&<div style={{fontSize:11,color:'var(--admin-sub)',marginTop:3}}>توضیح: {item.manualSettlementNote}</div>}</div>
          <strong style={{color:'#1d9a72',fontSize:12,alignSelf:'center'}}>تسویه‌شده</strong>
        </div>)}
      </div>
    </section>}
    <section style={{background:'var(--admin-card)',border:'1px solid var(--admin-border)',borderRadius:14,padding:14,display:'grid',gap:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div><h3 style={{margin:0,fontSize:15}}>دفتر کل و سوابق مالی</h3><p style={{margin:'5px 0 0',fontSize:11,color:'var(--admin-sub)'}}>تاریخچه پیش‌پرداخت‌ها، اقساط و بازپرداخت‌ها؛ جدیدترین رویدادها در ابتدا</p></div>
        <span style={{fontSize:11,color:'var(--admin-sub)'}}>{new Intl.NumberFormat('fa-IR').format(financialTransactions.length)} رویداد</span>
      </div>
      <div style={{overflowX:'auto',maxHeight:390,overflowY:'auto'}}>
        <table style={{width:'100%',minWidth:760,borderCollapse:'collapse',fontSize:12,textAlign:'right'}}>
          <thead style={{position:'sticky',top:0,background:'var(--admin-inner)',zIndex:1}}><tr>{['تاریخ','هنرجو / کد ملی','نوع رویداد','مبلغ (تومان)','وضعیت','جزئیات'].map(label=><th key={label} style={{padding:'11px 9px',borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{label}</th>)}</tr></thead>
          <tbody>{financialTransactions.map(row=><tr key={row.id}>
            <td style={{padding:'10px 9px',borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{row.date?new Date(row.date).toLocaleDateString('fa-IR'):'—'}</td>
            <td style={{padding:'10px 9px',borderBottom:'1px solid var(--admin-border)'}}><strong>{row.student}</strong><div style={{fontSize:10,color:'var(--admin-sub)',marginTop:3}}>{row.nationalId}</div></td>
            <td style={{padding:'10px 9px',borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{row.kind}</td>
            <td style={{padding:'10px 9px',borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{money(row.amount)}</td>
            <td style={{padding:'10px 9px',borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{row.status}</td>
            <td style={{padding:'10px 9px',borderBottom:'1px solid var(--admin-border)',minWidth:220,maxWidth:380,whiteSpace:'normal',lineHeight:1.8}}>{row.detail}</td>
          </tr>)}
          {!financialTransactions.length&&<tr><td colSpan={6} style={{padding:24,textAlign:'center',color:'var(--admin-sub)'}}>هنوز رویداد مالی ثبت نشده است.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
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
    {approval&&<div role="dialog" aria-modal="true" aria-labelledby="approval-title" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.55)',display:'grid',placeItems:'center',padding:16}}>
      <form onSubmit={e=>{e.preventDefault();void submitApproval();}} style={{width:'min(100%,620px)',maxHeight:'90vh',overflowY:'auto',background:'var(--admin-card)',color:'var(--admin-text)',border:'1px solid var(--admin-border)',borderRadius:16,padding:20,display:'grid',gap:13}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}><h3 id="approval-title" style={{margin:0,fontSize:16}}>تأیید ثبت‌نام · {approval.item.applicantFullName}</h3><button type="button" style={buttonStyle} onClick={()=>setApproval(null)}>بستن</button></div>
        <div style={{padding:12,borderRadius:10,background:'var(--admin-inner)',fontSize:12,lineHeight:1.9}}>رسید قابل بررسی: <strong>پیش‌پرداخت</strong><br/>مبلغ اعلامی هنرجو: <strong>{money(approval.payment.claimedAmount)}</strong><br/>شهریه اولیه: <strong>{money(approval.item.originalTuition)}</strong></div>
        <label style={{display:'grid',gap:6,fontSize:12}}>روش تأیید<select style={inputStyle} value={approvalMode} onChange={e=>setApprovalMode(e.target.value as typeof approvalMode)}><option value="NORMAL">تأیید عادی (حداقل ۶۰٪)</option><option value="DISCOUNT">تأیید با تخفیف</option><option value="PAYMENT_EXCEPTION">استثنای پرداخت (ویژه مدیر ارشد)</option></select></label>
        {approvalMode==='DISCOUNT'&&<><label style={{display:'grid',gap:6,fontSize:12}}>مبلغ تخفیف (تومان)<input type="number" min="0" max={approval.item.originalTuition} required style={inputStyle} value={discountAmount} onChange={e=>setDiscountAmount(e.target.value)}/></label><label style={{display:'grid',gap:6,fontSize:12}}>علت تخفیف<textarea required style={inputStyle} value={discountReason} onChange={e=>setDiscountReason(e.target.value)}/></label></>}
        {approvalMode==='PAYMENT_EXCEPTION'&&<label style={{display:'grid',gap:6,fontSize:12}}>علت استثنای پرداخت — فقط مدیر ارشد<textarea required style={inputStyle} value={exceptionReason} onChange={e=>setExceptionReason(e.target.value)}/></label>}
        <label style={{display:'grid',gap:6,fontSize:12}}>مبلغ تأییدشده رسید (تومان)<input type="number" min="1" required style={inputStyle} value={approvedAmount} onChange={e=>setApprovedAmount(e.target.value)}/></label>
        {Number(approvedAmount)>0&&Number(approvedAmount)<approval.item.originalTuition-(approvalMode==='DISCOUNT'?Number(discountAmount)||0:0)&&<label style={{display:'grid',gap:6,fontSize:12}}>سررسید اولین قسط (تقویم با نمایش فارسی)<JalaliDatePicker value={firstDueDate} onChange={setFirstDueDate} style={inputStyle}/><span style={{color:'var(--admin-sub)',fontSize:11}}>تاریخ انتخاب‌شده: {firstDueDate?new Intl.DateTimeFormat('fa-IR',{dateStyle:'full'}).format(new Date(firstDueDate+'T12:00:00')):'انتخاب نشده'}</span></label>}
        <label style={{display:'flex',gap:8,alignItems:'center',fontSize:12}}><input type="checkbox" checked={mockExamEligible} onChange={e=>{setMockExamEligible(e.target.checked);if(!e.target.checked)setMockExamId('');}}/>هنرجو مشمول آزمون آزمایشی رایگان شود</label>
        {mockExamEligible&&<label style={{display:'grid',gap:6,fontSize:12}}>آزمون آزمایشی<select required style={inputStyle} value={mockExamId} onChange={e=>setMockExamId(e.target.value)}><option value="">انتخاب آزمون…</option>{mockExams.map(exam=><option key={exam.id} value={exam.id}>{exam.title} · {new Date(exam.examDate).toLocaleDateString('fa-IR')} · {exam.level} / {exam.field}</option>)}</select>{mockExams.length===0&&<span style={{color:'#b44c48'}}>آزمون زمان‌بندی‌شده‌ای وجود ندارد.</span>}</label>}
        <label style={{display:'grid',gap:6,fontSize:12}}>یادداشت مدیریت (اختیاری)<textarea style={inputStyle} value={reviewNote} onChange={e=>setReviewNote(e.target.value)}/></label>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}><button type="button" style={buttonStyle} onClick={()=>setApproval(null)}>انصراف</button><button type="submit" disabled={savingApproval} style={{...buttonStyle,background:'var(--admin-accent)',color:'#fff',opacity:savingApproval ? 0.65 : 1}}>{savingApproval?'در حال ثبت…':'تأیید نهایی ثبت‌نام'}</button></div>
      </form>
    </div>}

    {tab==='registrations'?<section style={{background:'var(--admin-card)',border:'1px solid var(--admin-border)',borderRadius:14,overflow:'hidden'}}>
      <div style={{padding:'13px 15px',borderBottom:'1px solid var(--admin-border)',display:'flex',justifyContent:'space-between',gap:10}}><strong>فهرست ثبت‌نام‌ها</strong><span style={{fontSize:11,color:'var(--admin-sub)'}}>{new Intl.NumberFormat('fa-IR').format(visibleRegistrations.length)} ثبت‌نام</span></div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:790,borderCollapse:'collapse',fontSize:12,textAlign:'right'}}>
        <thead style={{background:'var(--admin-inner)'}}><tr>{['هنرجو / کد ملی','مقطع و رشته','دوره‌ها','شهریه نهایی','پرداخت‌شده','مانده','وضعیت','جزئیات'].map(label=><th key={label} style={{padding:'11px 10px',whiteSpace:'nowrap',borderBottom:'1px solid var(--admin-border)'}}>{label}</th>)}</tr></thead>
        <tbody>{pagedRegistrations.map(item=>{const paid=item.payments.filter(p=>p.status==='APPROVED').reduce((sum,p)=>sum+(p.approvedAmount??0),0);const balance=Math.max(0,item.finalTuition-paid);return <tr key={item.id}>
          <td style={{padding:10,borderBottom:'1px solid var(--admin-border)'}}><strong>{item.applicantFullName}</strong><div style={{fontSize:10,color:'var(--admin-sub)',marginTop:4}}>{item.nationalId} · {item.phone}</div></td>
          <td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{item.academicLevel==='MASTER'?'ارشد':'دکتری'}<div style={{fontSize:10,color:'var(--admin-sub)',marginTop:4}}>کد رشته: {item.fieldCode}</div></td>
          <td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{new Intl.NumberFormat('fa-IR').format(item.courses.length)} دوره</td>
          <td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{money(item.finalTuition)}</td>
          <td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap',color:'#1d9a72'}}>{money(paid)}</td>
          <td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap',color:balance>0?'#c65b58':'#1d9a72'}}>{money(balance)}</td>
          <td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{regStatus[item.status]||item.status}</td>
          <td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}><button type="button" style={buttonStyle} onClick={()=>setSelectedRegistration(item)}>مشاهده جزئیات</button></td>
        </tr>;})}
        {!loading&&pagedRegistrations.length===0&&<tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'var(--admin-sub)'}}>موردی برای نمایش وجود ندارد.</td></tr>}</tbody>
      </table></div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',padding:'12px 15px'}}><span style={{fontSize:11,color:'var(--admin-sub)'}}>نمایش {new Intl.NumberFormat('fa-IR').format(activeListCount?(safeListPage-1)*pageSize+1:0)} تا {new Intl.NumberFormat('fa-IR').format(Math.min(safeListPage*pageSize,activeListCount))} از {new Intl.NumberFormat('fa-IR').format(activeListCount)}</span><div style={{display:'flex',gap:6,alignItems:'center'}}><button type="button" style={buttonStyle} disabled={safeListPage<=1} onClick={()=>setListPage(p=>Math.max(1,p-1))}>قبلی</button><span style={{fontSize:11,color:'var(--admin-sub)'}}>صفحه {new Intl.NumberFormat('fa-IR').format(safeListPage)} از {new Intl.NumberFormat('fa-IR').format(pageCount)}</span><button type="button" style={buttonStyle} disabled={safeListPage>=pageCount} onClick={()=>setListPage(p=>Math.min(pageCount,p+1))}>بعدی</button></div></div>
    </section>:<section style={{background:'var(--admin-card)',border:'1px solid var(--admin-border)',borderRadius:14,overflow:'hidden'}}>
      <div style={{padding:'13px 15px',borderBottom:'1px solid var(--admin-border)',display:'flex',justifyContent:'space-between',gap:10}}><strong>فهرست درخواست‌های بازپرداخت</strong><span style={{fontSize:11,color:'var(--admin-sub)'}}>{new Intl.NumberFormat('fa-IR').format(visibleRefunds.length)} درخواست</span></div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:720,borderCollapse:'collapse',fontSize:12,textAlign:'right'}}><thead style={{background:'var(--admin-inner)'}}><tr>{['هنرجو / کد ملی','موبایل','مبلغ درخواستی','مبلغ رزروشده','وضعیت','جزئیات'].map(label=><th key={label} style={{padding:11,whiteSpace:'nowrap',borderBottom:'1px solid var(--admin-border)'}}>{label}</th>)}</tr></thead><tbody>
        {pagedRefunds.map(item=><tr key={item.id}><td style={{padding:10,borderBottom:'1px solid var(--admin-border)'}}><strong>{item.student.fullName}</strong><div style={{fontSize:10,color:'var(--admin-sub)',marginTop:4}}>{item.student.nationalId}</div></td><td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{item.student.phone}</td><td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{money(item.amountRequested)}</td><td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{item.amountReserved===null?'—':money(item.amountReserved)}</td><td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}>{refundStatus[item.status]||item.status}</td><td style={{padding:10,borderBottom:'1px solid var(--admin-border)',whiteSpace:'nowrap'}}><button type="button" style={buttonStyle} onClick={()=>setSelectedRefund(item)}>مشاهده جزئیات</button></td></tr>)}
        {!loading&&pagedRefunds.length===0&&<tr><td colSpan={6} style={{padding:24,textAlign:'center',color:'var(--admin-sub)'}}>درخواستی برای نمایش وجود ندارد.</td></tr>}</tbody></table></div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',padding:'12px 15px'}}><span style={{fontSize:11,color:'var(--admin-sub)'}}>نمایش {new Intl.NumberFormat('fa-IR').format(activeListCount?(safeListPage-1)*pageSize+1:0)} تا {new Intl.NumberFormat('fa-IR').format(Math.min(safeListPage*pageSize,activeListCount))} از {new Intl.NumberFormat('fa-IR').format(activeListCount)}</span><div style={{display:'flex',gap:6,alignItems:'center'}}><button type="button" style={buttonStyle} disabled={safeListPage<=1} onClick={()=>setListPage(p=>Math.max(1,p-1))}>قبلی</button><span style={{fontSize:11,color:'var(--admin-sub)'}}>صفحه {new Intl.NumberFormat('fa-IR').format(safeListPage)} از {new Intl.NumberFormat('fa-IR').format(pageCount)}</span><button type="button" style={buttonStyle} disabled={safeListPage>=pageCount} onClick={()=>setListPage(p=>Math.min(pageCount,p+1))}>بعدی</button></div></div>
    </section>}
    {selectedRegistration&&<div role="dialog" aria-modal="true" aria-labelledby="registration-detail-title" onClick={e=>{if(e.target===e.currentTarget)setSelectedRegistration(null);}} style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(20,18,18,.58)',display:'grid',placeItems:'center',padding:16}}>
      <section style={{width:'min(100%,900px)',maxHeight:'90vh',overflowY:'auto',background:'var(--admin-card)',color:'var(--admin-text)',border:'1px solid var(--admin-border)',borderRadius:16,padding:18,display:'grid',gap:13}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,position:'sticky',top:-18,background:'var(--admin-card)',padding:'5px 0 10px',zIndex:2,borderBottom:'1px solid var(--admin-border)'}}><div><h3 id="registration-detail-title" style={{margin:0,fontSize:16}}>{selectedRegistration.applicantFullName}</h3><span style={{fontSize:11,color:'var(--admin-sub)'}}>جزئیات کامل ثبت‌نام و سوابق مالی</span></div><button type="button" style={buttonStyle} onClick={()=>setSelectedRegistration(null)}>بستن</button></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>{[['کد ملی',selectedRegistration.nationalId],['موبایل',selectedRegistration.phone],['مقطع',selectedRegistration.academicLevel==='MASTER'?'ارشد':'دکتری'],['کد رشته',selectedRegistration.fieldCode],['تاریخ ثبت‌نام',new Date(selectedRegistration.createdAt).toLocaleDateString('fa-IR')],['وضعیت آزمون آزمایشی',selectedRegistration.mockExamEligible?'مشمول':'غیرمشمول']].map(([label,value])=><div key={label} style={{padding:11,borderRadius:10,background:'var(--admin-inner)',border:'1px solid var(--admin-border)'}}><div style={{fontSize:10,color:'var(--admin-sub)',marginBottom:5}}>{label}</div><strong style={{fontSize:12,overflowWrap:'anywhere'}}>{value}</strong></div>)}</div>
        <section style={{padding:13,border:'1px solid var(--admin-border)',borderRadius:12,display:'grid',gap:9}}><h4 style={{margin:0,fontSize:13}}>دوره‌ها و شهریه</h4>{selectedRegistration.courses.map(c=><div key={c.id} style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',fontSize:12}}><span>{c.courseTitleSnapshot}</span><strong>{money(c.coursePriceSnapshot)}</strong></div>)}<hr style={{border:0,borderTop:'1px solid var(--admin-border)',width:'100%'}}/><div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12}}><span>شهریه اولیه</span><strong>{money(selectedRegistration.originalTuition)}</strong></div>{selectedRegistration.discountAmount>0&&<div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12}}><span>تخفیف · {selectedRegistration.discountReason||'—'}</span><strong>{money(selectedRegistration.discountAmount)}</strong></div>}<div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12}}><span>شهریه نهایی</span><strong>{money(selectedRegistration.finalTuition)}</strong></div><div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12,color:'#1d9a72'}}><span>پرداخت‌های تأییدشده</span><strong>{money(selectedRegistration.payments.filter(p=>p.status==='APPROVED').reduce((sum,p)=>sum+(p.approvedAmount??0),0))}</strong></div><div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12,color:selectedRegistration.balance>0?'#c65b58':'#1d9a72'}}><span>مانده ثبت‌شده</span><strong>{money(selectedRegistration.balance)}</strong></div></section>
        <section style={{padding:13,border:'1px solid var(--admin-border)',borderRadius:12,display:'grid',gap:10}}><h4 style={{margin:0,fontSize:13}}>رسیدها و پرداخت‌ها</h4>{selectedRegistration.payments.map(p=><div key={p.id} style={{padding:11,borderRadius:10,background:'var(--admin-inner)',display:'grid',gap:8,fontSize:12}}><strong>{p.purpose==='INITIAL'?'پیش‌پرداخت':'قسط'} · {payStatus[p.status]||p.status}</strong><div>مبلغ اعلامی: {money(p.claimedAmount)}{p.approvedAmount!==null?' · مبلغ تأییدشده: '+money(p.approvedAmount):''}</div>{p.trackingCode&&<div>کد پیگیری: {p.trackingCode}</div>}{p.rejectionReason&&<div style={{color:'#c65b58'}}>علت رد: {p.rejectionReason}</div>}<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{p.receipts.map((receipt,i)=><a key={receipt.id} href={'/api/admin/registration-receipts/'+encodeURIComponent(receipt.id)} target="_blank" rel="noreferrer" style={{color:'var(--admin-accent)',fontSize:11}}>مشاهده رسید {i+1}</a>)}{p.purpose==='INSTALLMENT'&&p.status==='PENDING'&&<button type="button" style={buttonStyle} onClick={()=>{const decision=window.prompt('نتیجه رسید قسط: APPROVED یا REJECTED','APPROVED');if(decision==='APPROVED'){const amount=Number(window.prompt('مبلغ تأییدشده',String(p.claimedAmount)));if(Number.isFinite(amount)&&amount>0){void action('/api/admin/registration-payments/'+encodeURIComponent(p.id)+'/review','PATCH',{status:'APPROVED',approvedAmount:amount});setSelectedRegistration(null);}}else if(decision==='REJECTED'){const reason=window.prompt('علت رد رسید');if(reason?.trim()){void action('/api/admin/registration-payments/'+encodeURIComponent(p.id)+'/review','PATCH',{status:'REJECTED',rejectionReason:reason});setSelectedRegistration(null);}}}}>بررسی رسید قسط</button>}</div></div>)}</section>
        {(selectedRegistration.discountReason||selectedRegistration.exceptionReason||selectedRegistration.reviewNote)&&<section style={{padding:13,border:'1px solid var(--admin-border)',borderRadius:12,display:'grid',gap:8}}><h4 style={{margin:0,fontSize:13}}>یادداشت‌ها و استثناها</h4>{selectedRegistration.discountReason&&<div style={{fontSize:12}}>علت تخفیف: {selectedRegistration.discountReason}</div>}{selectedRegistration.exceptionReason&&<div style={{fontSize:12}}>علت استثنای پرداخت: {selectedRegistration.exceptionReason}</div>}{selectedRegistration.reviewNote&&<div style={{fontSize:12}}>یادداشت مدیریت: {selectedRegistration.reviewNote}</div>}</section>}
        {selectedRegistration.reviewHistory.length>0&&<section style={{padding:13,border:'1px solid var(--admin-border)',borderRadius:12,display:'grid',gap:8}}><h4 style={{margin:0,fontSize:13}}>تاریخچه بررسی</h4>{selectedRegistration.reviewHistory.map(h=><div key={h.id} style={{padding:'8px 0',borderBottom:'1px solid var(--admin-border)',fontSize:12}}><strong>{h.action}</strong> · {new Date(h.createdAt).toLocaleString('fa-IR')}{h.note&&<div style={{color:'var(--admin-sub)',marginTop:4}}>{h.note}</div>}</div>)}</section>}
        {['PENDING_REVIEW','NEEDS_CORRECTION'].includes(selectedRegistration.status)&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" style={buttonStyle} onClick={()=>{const item=selectedRegistration;setSelectedRegistration(null);approve(item);}}>بررسی و تأیید نهایی</button><button type="button" style={buttonStyle} onClick={()=>{const item=selectedRegistration;setSelectedRegistration(null);void correction(item);}}>درخواست اصلاح رسید</button><button type="button" style={{...buttonStyle,borderColor:'#e6b9b5',color:'#b44c48'}} onClick={()=>{const item=selectedRegistration;setSelectedRegistration(null);void reject(item);}}>رد ثبت‌نام</button></div>}
      </section>
    </div>}
    {selectedRefund&&<div role="dialog" aria-modal="true" aria-labelledby="refund-detail-title" onClick={e=>{if(e.target===e.currentTarget)setSelectedRefund(null);}} style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(20,18,18,.58)',display:'grid',placeItems:'center',padding:16}}><section style={{width:'min(100%,600px)',maxHeight:'90vh',overflowY:'auto',background:'var(--admin-card)',color:'var(--admin-text)',border:'1px solid var(--admin-border)',borderRadius:16,padding:18,display:'grid',gap:12}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><h3 id="refund-detail-title" style={{margin:0,fontSize:15}}>جزئیات بازپرداخت · {selectedRefund.student.fullName}</h3><button type="button" style={buttonStyle} onClick={()=>setSelectedRefund(null)}>بستن</button></div><div style={{fontSize:12,lineHeight:2}}>کد ملی: {selectedRefund.student.nationalId}<br/>موبایل: {selectedRefund.student.phone}<br/>مبلغ درخواستی: <strong>{money(selectedRefund.amountRequested)}</strong><br/>مبلغ رزروشده: <strong>{selectedRefund.amountReserved===null?'—':money(selectedRefund.amountReserved)}</strong><br/>وضعیت: {refundStatus[selectedRefund.status]||selectedRefund.status}<br/>تاریخ درخواست: {new Date(selectedRefund.requestedAt).toLocaleString('fa-IR')}<br/>علت درخواست: {selectedRefund.reason}{selectedRefund.reviewNote&&<><br/>یادداشت بررسی: {selectedRefund.reviewNote}</>}{selectedRefund.transferReference&&<><br/>شناسه انتقال: {selectedRefund.transferReference}</>}{selectedRefund.paidAt&&<><br/>تاریخ پرداخت: {new Date(selectedRefund.paidAt).toLocaleString('fa-IR')}</>}</div>{selectedRefund.status==='REQUESTED'&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" style={buttonStyle} onClick={()=>{const item=selectedRefund;setSelectedRefund(null);const note=window.prompt('یادداشت تأیید (اختیاری)')||'';void action('/api/admin/refunds/'+encodeURIComponent(item.id)+'/review','PATCH',{decision:'RESERVE',note});}}>تأیید و رزرو مبلغ</button><button type="button" style={{...buttonStyle,color:'#b44c48'}} onClick={()=>{const item=selectedRefund;setSelectedRefund(null);const note=window.prompt('علت رد درخواست');if(note?.trim())void action('/api/admin/refunds/'+encodeURIComponent(item.id)+'/review','PATCH',{decision:'REJECT',note});}}>رد درخواست</button></div>}{selectedRefund.status==='RESERVED'&&<button type="button" style={buttonStyle} onClick={()=>{const item=selectedRefund;setSelectedRefund(null);const transferReference=window.prompt('شماره پیگیری / شناسه انتقال وجه');if(transferReference?.trim())void action('/api/admin/refunds/'+encodeURIComponent(item.id)+'/paid','PATCH',{transferReference});}}>ثبت انتقال وجه و تکمیل بازپرداخت</button>}</section></div>}

  </section>;
}
