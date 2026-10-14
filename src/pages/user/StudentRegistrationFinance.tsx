import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useStore } from '../../store/useStore';

type Installment = { id: string; sequence: number; amount: number; paid: number; balance: number; dueDate: string; status: string };
type Registration = { id: string; originalTuition: number; discountAmount: number; finalTuition: number; discountReason: string|null; courses: Array<{id:string;courseTitleSnapshot:string;coursePriceSnapshot:number}>; installments: Installment[]; payments: Array<{id:string;status:string;claimedAmount:number;approvedAmount:number|null;rejectionReason:string|null;paymentDate:string}> };
type Refund = { id:string; registrationId:string; amountRequested:number; amountReserved:number|null; status:string; reason:string; reviewNote:string|null; transferReference:string|null; requestedAt:string; paidAt:string|null };
const money=(n:number)=>new Intl.NumberFormat('fa-IR').format(Math.round(n))+' تومان';
const statusText:Record<string,string>={PENDING:'در انتظار بررسی رسید',PARTIALLY_PAID:'پرداخت بخشی از قسط',PAID:'تسویه‌شده',OVERDUE:'سررسید گذشته',REQUESTED:'در انتظار بررسی بازپرداخت',RESERVED:'مبلغ رزرو شده',REJECTED:'رد شده'};
export function StudentRegistrationFinance(){
  const {theme}=useStore();
  const dark=theme==='dark';
  const [registrations,setRegistrations]=useState<Registration[]>([]);
  const [refunds,setRefunds]=useState<Refund[]>([]);
  const [files,setFiles]=useState<Record<string,File|null>>({});
  const [amounts,setAmounts]=useState<Record<string,string>>({});
  const [tracking,setTracking]=useState<Record<string,string>>({});
  const [refundAmounts,setRefundAmounts]=useState<Record<string,string>>({});
  const [refundReasons,setRefundReasons]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const card:React.CSSProperties={background:dark?'#191f21':'#fff',border:'1px solid '+(dark?'#303a3c':'#d8e3e0'),borderRadius:14,padding:15,color:dark?'#f1f4f3':'#202a2a'};
  const sub=dark?'#a2aeae':'#667675';
  const field:React.CSSProperties={width:'100%',minWidth:0,boxSizing:'border-box',padding:'10px 11px',border:'1px solid '+(dark?'#303a3c':'#d8e3e0'),borderRadius:9,background:dark?'#171d1f':'#fbfdfc',color:dark?'#f1f4f3':'#202a2a',font:'inherit',fontSize:12};
  const button:React.CSSProperties={border:0,borderRadius:9,padding:'10px 13px',background:'#398a90',color:'#fff',font:'inherit',fontSize:12,fontWeight:850,cursor:'pointer'};
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const [r1,r2]=await Promise.all([
        fetch('/api/student/registrations',{credentials:'include'}),
        fetch('/api/student/refunds',{credentials:'include'}),
      ]);
      const d1=await r1.json().catch(()=>[]),d2=await r2.json().catch(()=>[]);
      if(!r1.ok)throw new Error(d1.message||'دریافت اقساط ناموفق بود.');
      if(!r2.ok)throw new Error(d2.message||'دریافت درخواست‌های بازپرداخت ناموفق بود.');
      setRegistrations(d1);setRefunds(d2);
    }catch(e){setError(e instanceof Error?e.message:'دریافت اطلاعات مالی ناموفق بود.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const submitPayment=async(event:FormEvent,inst:Installment,regId:string)=>{
    event.preventDefault();setError('');setNotice('');
    const file=files[inst.id], amount=Number(amounts[inst.id]);
    if(!file||!Number.isFinite(amount)||amount<=0){setError('مبلغ و تصویر رسید را برای قسط انتخاب کنید.');return;}
    const form=new FormData();form.set('claimedAmount',String(amount));form.set('trackingCode',tracking[inst.id]||'');form.set('receipt',file);
    try{
      const response=await fetch('/api/student/installments/'+encodeURIComponent(inst.id)+'/payments',{method:'POST',credentials:'include',body:form});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.message||'ارسال رسید ناموفق بود.');
      setNotice('رسید قسط برای بررسی مدیریت ارسال شد. تا تأیید رسید، بدهی تسویه‌شده محسوب نمی‌شود.');
      setFiles(prev=>({...prev,[inst.id]:null}));await load();
    }catch(e){setError(e instanceof Error?e.message:'ارسال رسید ناموفق بود.');}
  };
  const submitRefund=async(event:FormEvent,registrationId:string)=>{
    event.preventDefault();setError('');setNotice('');
    const amount=Number(refundAmounts[registrationId]),reason=refundReasons[registrationId]?.trim();
    if(!Number.isFinite(amount)||amount<=0||!reason){setError('مبلغ و علت درخواست بازپرداخت را کامل کنید.');return;}
    try{
      const response=await fetch('/api/student/refunds',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({registrationId,amountRequested:amount,reason})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.message||'ثبت درخواست بازپرداخت ناموفق بود.');
      setNotice('درخواست بازپرداخت ثبت شد. مبلغ فقط پس از تأیید مدیریت رزرو می‌شود.');
      setRefundAmounts(prev=>({...prev,[registrationId]:''}));setRefundReasons(prev=>({...prev,[registrationId]:''}));await load();
    }catch(e){setError(e instanceof Error?e.message:'ثبت درخواست ناموفق بود.');}
  };
  return <section style={{display:'grid',gap:14,marginTop:18}}>
    <div style={card}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}><h3 style={{margin:0,fontSize:14}}>ثبت‌نام‌های تأییدشده و اقساط</h3><button style={button} onClick={()=>void load()}>به‌روزرسانی</button></div>
      <p style={{margin:'8px 0 0',fontSize:11,lineHeight:1.8,color:sub}}>پرداخت فقط بعد از تأیید مدیریت در محاسبه بدهی اعمال می‌شود. اگر رسید رد شود، علت آن نمایش داده می‌شود و می‌توانید رسید جدید ارسال کنید.</p>
    </div>
    {error&&<div role="alert" style={{...card,background:dark?'#321d1d':'#fff0ef',color:'#b33e37',fontSize:12}}>{error}</div>}
    {notice&&<div role="status" style={{...card,background:dark?'#183229':'#eaf6ef',color:dark?'#a5e3bf':'#216743',fontSize:12}}>{notice}</div>}
    {loading&&<div style={{...card,textAlign:'center',fontSize:12,color:sub}}>در حال دریافت اطلاعات…</div>}
    {!loading&&registrations.length===0&&<div style={{...card,textAlign:'center',fontSize:12,color:sub}}>ثبت‌نام تأییدشده‌ای برای نمایش اقساط وجود ندارد.</div>}
    {registrations.map(reg=><article key={reg.id} style={{...card,display:'grid',gap:12}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong style={{fontSize:13}}>شهریه نهایی: {money(reg.finalTuition)}</strong><span style={{fontSize:11,color:sub}}>تخفیف: {money(reg.discountAmount)}</span></div>
      <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{reg.courses.map(c=><span key={c.id} style={{fontSize:11,padding:'6px 8px',borderRadius:8,background:dark?'#202729':'#eef5f2'}}>{c.courseTitleSnapshot}</span>)}</div>
      {reg.installments.length===0?<p style={{fontSize:12,color:'#1d9a72',margin:0}}>برای این ثبت‌نام قسط باقی نمانده است.</p>:reg.installments.map(inst=><div key={inst.id} style={{border:'1px solid '+(dark?'#303a3c':'#e1eae6'),borderRadius:12,padding:12,display:'grid',gap:9}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong style={{fontSize:12}}>قسط {new Intl.NumberFormat('fa-IR').format(inst.sequence)} · {money(inst.amount)}</strong><span style={{fontSize:11,color:inst.status==='PAID'?'#1d9a72':inst.status==='OVERDUE'?'#dc6863':sub}}>{statusText[inst.status]||inst.status}</span></div>
        <div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:11,color:sub}}><span>سررسید: {new Date(inst.dueDate).toLocaleDateString('fa-IR')}</span><span>مانده: {money(inst.balance)}</span></div>
        {inst.balance>0&&<form onSubmit={e=>void submitPayment(e,inst,reg.id)} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,180px),1fr))',gap:9}}>
          <input style={field} type="number" min="1" max={inst.balance} step="1" placeholder="مبلغ پرداخت (تومان)" value={amounts[inst.id]||''} onChange={e=>setAmounts(p=>({...p,[inst.id]:e.target.value}))} required/>
          <input style={field} placeholder="شماره پیگیری (اختیاری)" value={tracking[inst.id]||''} onChange={e=>setTracking(p=>({...p,[inst.id]:e.target.value}))}/>
          <input style={field} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFiles(p=>({...p,[inst.id]:e.target.files?.[0]??null}))} required/>
          <button style={button} type="submit">ارسال رسید قسط</button>
        </form>}
      </div>)}
      {reg.payments.length>0&&<div style={{borderTop:'1px solid '+(dark?'#303a3c':'#e1eae6'),paddingTop:10,display:'grid',gap:7}}><strong style={{fontSize:12}}>سوابق رسید اقساط</strong>{reg.payments.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',fontSize:11}}><span style={{color:sub}}>{new Date(p.paymentDate).toLocaleDateString('fa-IR')} · {statusText[p.status]||p.status}{p.rejectionReason?' · علت رد: '+p.rejectionReason:''}</span><strong>{money(p.approvedAmount??p.claimedAmount)}</strong></div>)}</div>}
      <form onSubmit={e=>void submitRefund(e,reg.id)} style={{borderTop:'1px solid '+(dark?'#303a3c':'#e1eae6'),paddingTop:12,display:'grid',gap:9}}>
        <strong style={{fontSize:12}}>درخواست بازپرداخت اضافه‌پرداخت</strong>
        <p style={{fontSize:11,color:sub,margin:0,lineHeight:1.8}}>مبلغ درخواست پس از بررسی کل بدهی‌های شما محاسبه می‌شود. با تأیید مدیریت، مبلغ فوراً رزرو می‌شود و پس از انتقال وجه وضعیت آن تکمیل خواهد شد.</p>
        <input style={field} type="number" min="1" placeholder="مبلغ درخواستی (تومان)" value={refundAmounts[reg.id]||''} onChange={e=>setRefundAmounts(p=>({...p,[reg.id]:e.target.value}))}/>
        <textarea style={{...field,minHeight:66,resize:'vertical'}} placeholder="علت درخواست بازپرداخت" value={refundReasons[reg.id]||''} onChange={e=>setRefundReasons(p=>({...p,[reg.id]:e.target.value}))}/>
        <button style={button} type="submit">ثبت درخواست بازپرداخت</button>
      </form>
    </article>)}
    <div style={card}><h3 style={{margin:'0 0 10px',fontSize:14}}>پیگیری بازپرداخت‌ها</h3>{refunds.length===0?<p style={{fontSize:11,color:sub,margin:0}}>درخواستی ثبت نشده است.</p>:refunds.map(r=><div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid '+(dark?'#303a3c':'#e1eae6'),display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',fontSize:12}}><span>{money(r.amountRequested)} · {statusText[r.status]||r.status}{r.reviewNote?' · '+r.reviewNote:''}{r.transferReference?' · پیگیری انتقال: '+r.transferReference:''}</span><strong>{new Date(r.requestedAt).toLocaleDateString('fa-IR')}</strong></div>)}</div>
  </section>;
}
