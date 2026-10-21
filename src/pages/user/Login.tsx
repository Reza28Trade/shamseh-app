import React,{useEffect,useRef,useState} from 'react';
import type { Student,Admin } from '../../types';
import { User,Shield,Lock,ArrowRight,Send,Globe,Camera,Play,BookOpen,GraduationCap } from 'lucide-react';
import { CourseCatalogPage, RulesPage, ExamAnalysisPage } from '../public/PublicPages';

interface AuthUser{ id:string; username:string; role:'SUPER_ADMIN'|'STAFF'|'STUDENT'|'COUNSELOR'; studentId:string|null; student?:{fullName:string;nationalId:string}|null; }
interface LoginProps{students:Student[];admins:Admin[];onLoginSuccess:(user:AuthUser)=>void;onAdminLoginSuccess:(user:AuthUser)=>void;rulesText?:string;}


const ShamsehParticleIntro:React.FC=()=>{
 const canvasRef=useRef<HTMLCanvasElement|null>(null);
 const [reducedMotion,setReducedMotion]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReducedMotion(media.matches);
  update(); media.addEventListener?.('change',update);
  return()=>media.removeEventListener?.('change',update);
 },[]);
 useEffect(()=>{
  const canvas=canvasRef.current;
  if(!canvas||reducedMotion)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  let elapsed=0,lastTime=0,raf=0,width=0,height=0,dpr=1;
  const particles=Array.from({length:72},(_,i)=>({seed:i/72,phase:Math.random()*Math.PI*2,size:Math.random()*1.7+.45,speed:.12+Math.random()*.22,orbit:.16+Math.random()*.28}));
  const resize=()=>{const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;dpr=Math.min(window.devicePixelRatio||1,1.6);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
  const draw=(now:number)=>{
   if(lastTime)elapsed+=(now-lastTime)/1000;
   lastTime=now;
   ctx!.clearRect(0,0,width,height);
   const t=elapsed, cx=width*.5, cy=height*.53, rx=width*.38, ry=height*.29;
   particles.forEach((p,i)=>{
    const a=(t*p.speed)+(p.seed*Math.PI*2)+p.phase;
    const x=cx+Math.cos(a)*rx*p.orbit*2.15;
    const y=cy+Math.sin(a*1.27)*ry*p.orbit*2.15;
    const alpha=.22+.55*(.5+.5*Math.sin(a*1.8));
    ctx!.beginPath();ctx!.fillStyle='rgba(72,209,204,'+alpha+')';ctx!.shadowBlur=p.size*5;ctx!.shadowColor='#48d1cc';ctx!.arc(x,y,p.size,0,Math.PI*2);ctx!.fill();
    if(i%9===0){
     const tailA=a-.18;ctx!.beginPath();ctx!.strokeStyle='rgba(72,209,204,.16)';ctx!.lineWidth=.7;ctx!.moveTo(cx+Math.cos(tailA)*rx*p.orbit*2.15,cy+Math.sin(tailA*1.27)*ry*p.orbit*2.15);ctx!.lineTo(x,y);ctx!.stroke();
    }
   });
   ctx!.shadowBlur=0;
   raf=requestAnimationFrame(draw);
  };
  resize();const observer=new ResizeObserver(resize);observer.observe(canvas);raf=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();};
 },[reducedMotion]);
 return <div className={'sh-particle-intro'+(reducedMotion?' reduced':'')} aria-hidden="true">
  <canvas ref={canvasRef}/>
  <div className="sh-emblem-window"><img src="/logo.png" alt="" /></div>
 </div>;
};

export const Login:React.FC<LoginProps>=({students,admins,onLoginSuccess,onAdminLoginSuccess})=>{
 const [viewState,setViewState]=useState<'welcome'|'studentLogin'|'adminLogin'|'counselorLogin'|'courses'|'rules'|'analysis'|'information'>('welcome');
 const [studentNationalId,setStudentNationalId]=useState(''),[studentPhone,setStudentPhone]=useState(''),[adminUsername,setAdminUsername]=useState(''),[adminPassword,setAdminPassword]=useState(''),[counselorUsername,setCounselorUsername]=useState(''),[counselorPassword,setCounselorPassword]=useState(''),[error,setError]=useState('');
 const studentSubmit=(e:React.FormEvent)=>{e.preventDefault();setError('');void students;(async()=>{try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({username:studentNationalId.trim(),password:studentPhone.trim()})});if(!r.ok)throw 0;const d=await r.json();if(d.user?.role!=='STUDENT')throw 0;onLoginSuccess(d.user)}catch{setError('کد ملی یا شماره موبایل هنرجو اشتباه است.')}})()};
 const adminSubmit=(e:React.FormEvent)=>{e.preventDefault();setError('');void admins;(async()=>{try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({username:adminUsername.trim(),password:adminPassword})});if(!r.ok)throw 0;const d=await r.json();if(d.user?.role!=='SUPER_ADMIN'&&d.user?.role!=='STAFF'&&d.user?.role!=='COUNSELOR')throw 0;onAdminLoginSuccess(d.user)}catch{setError('نام کاربری یا رمز عبور ادمین اشتباه است.')}})()};
 const counselorSubmit=(e:React.FormEvent)=>{
  e.preventDefault();
  setError('');
  void (async()=>{
   try{
    const r=await fetch('/api/auth/login',{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     credentials:'include',
     body:JSON.stringify({username:counselorUsername.trim(),password:counselorPassword})
    });
    if(!r.ok) throw 0;
    const d=await r.json();
    if(d.user?.role!=='COUNSELOR') throw 0;
    onAdminLoginSuccess(d.user);
   }catch{
    setError('نام کاربری یا رمز عبور مشاور اشتباه است.');
   }
  })();
 };
 const back=()=>{setViewState('welcome');setError('')};
 if (viewState === 'courses') return <CourseCatalogPage onBack={() => setViewState('welcome')} />;
 if (viewState === 'rules') return <RulesPage onBack={() => setViewState('welcome')} />;
 if (viewState === 'analysis') return <ExamAnalysisPage onBack={() => setViewState('welcome')} />;
 if (viewState === 'information') return <div className="sh-information-page"><div className="sh-information-intro"><span>راهنمای متقاضیان</span><h1>اطلاعات آموزشی شمسه</h1><p>معرفی دوره‌ها، تحلیل کنکورهای سال‌های گذشته و قوانین آموزشی را در یک صفحه مرور کنید.</p></div><CourseCatalogPage onBack={back}/><ExamAnalysisPage onBack={back}/><RulesPage onBack={back}/><style>{`.sh-information-page{min-height:100vh;background:#f5f8f7;color:#182022;direction:rtl;font-family:system-ui,sans-serif}.sh-information-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;padding:12px clamp(16px,4vw,48px);background:rgba(255,255,255,.96);border-bottom:1px solid #dfe7e5}.sh-information-top img{width:38px;height:38px;object-fit:contain}.sh-information-top div{display:grid;gap:3px;flex:1}.sh-information-top strong{font-size:13px}.sh-information-top span{font-size:10px;color:#71807f}.sh-information-intro{padding:28px clamp(16px,4vw,48px);background:linear-gradient(120deg,#e7f5f5,#fff);border-bottom:1px solid #dfe7e5}.sh-information-intro>span{font-size:11px;font-weight:900;color:#168C91}.sh-information-intro h1{font-size:clamp(23px,3vw,34px);margin:8px 0;line-height:1.6}.sh-information-intro p{font-size:13px;line-height:2;color:#71807f;margin:0}.sh-information-page>div:not(.sh-information-top):not(.sh-information-intro){box-sizing:border-box}.sh-information-page>div[style*="min-height: 100vh"]{min-height:auto!important;padding-top:22px!important;padding-bottom:22px!important}.sh-information-page>div[style*="min-height: 100vh"]>div{max-width:1180px}.sh-information-page>div[style*="min-height: 100vh"] header{display:none}.sh-information-page>div[style*="min-height: 100vh"] footer{display:none}@media(max-width:520px){.sh-information-top{flex-wrap:wrap}}`}</style></div>;
 return <div className="sh-login">
   <div className="sh-login-visual">
     <ShamsehParticleIntro/>
     <div className="sh-login-orbit one"/><div className="sh-login-orbit two"/>
     <div className="sh-login-brand" onClick={()=>setViewState(viewState==='adminLogin'?'welcome':'adminLogin')}><img src="/logo.png" alt="لوگو آکادمی شمسه"/><span>سامانه آموزشی شمسه</span></div>
     <div className="sh-login-copy"><span>ACADEMIC PLATFORM</span><h1>مسیر آموزش،<br/><em>منظم و متمرکز.</em></h1><p>دسترسی یکپارچه به دوره‌ها، آزمون‌ها، فایل‌های آموزشی و خدمات آموزشی شمسه.</p></div>
     <div className="sh-login-footer">آکادمی شمسه · ۱۴۰۵</div>
   </div>
   <div className="sh-login-content">
     <div className="sh-login-top"></div>
     {viewState==='welcome'&&<div className="sh-welcome"><div className="sh-kicker">ورود به سامانه</div><h2>از اینجا شروع کنید</h2><p>برای ادامه، بخش موردنظر خود را انتخاب کنید.</p><div className="sh-entry-list">
       <button className="sh-entry primary" onClick={()=>setViewState('studentLogin')}><span className="sh-entry-icon"><User size={18}/></span><span><strong>پنل هنرجویی</strong><small>دسترسی به دوره‌ها، آزمون‌ها و فایل‌های من</small></span><ArrowRight size={15}/></button>
       <button className="sh-entry" onClick={()=>setViewState('counselorLogin')}><span className="sh-entry-icon"><Shield size={18}/></span><span><strong>ورود مشاور</strong><small>ورود به پنل اختصاصی مشاوره</small></span><ArrowRight size={15}/></button>
       <button className="sh-entry" onClick={()=>setViewState('information')}><span className="sh-entry-icon"><BookOpen size={18}/></span><span><strong>اطلاعات آموزشی</strong><small>معرفی دوره‌ها، تحلیل کنکورهای گذشته و قوانین</small></span><ArrowRight size={15}/></button>
       <a className="sh-entry sh-preregister" href="/register"><span className="sh-entry-icon"><GraduationCap size={18}/></span><span><strong>پیش‌ثبت‌نام</strong><small>ثبت درخواست ثبت‌نام و ارسال رسید پرداخت</small></span><ArrowRight size={15}/></a>
     </div></div>}
     {(viewState==='studentLogin'||viewState==='adminLogin')&&<form className="sh-form" onSubmit={viewState==='studentLogin'?studentSubmit:adminSubmit}><button type="button" className="sh-back" onClick={back}><ArrowRight size={14}/> بازگشت</button><div className="sh-kicker">{viewState==='studentLogin'?'پنل هنرجویی':'مدیریت سیستم'}</div><h2>{viewState==='studentLogin'?'ورود هنرجو':'ورود مدیر'}</h2><p>{viewState==='studentLogin'?'با کد ملی و شماره موبایل وارد سامانه شوید.':'اطلاعات حساب مدیریت را وارد کنید.'}</p>{error&&<div className="sh-error">{error}</div>}
       <label>{viewState==='studentLogin'?'کد ملی هنرجو':'نام کاربری ادمین'}<div className="sh-input"><span>{viewState==='studentLogin'?<User size={16}/>:<Shield size={16}/>}</span><input value={viewState==='studentLogin'?studentNationalId:adminUsername} onChange={e=>viewState==='studentLogin'?setStudentNationalId(e.target.value):setAdminUsername(e.target.value)} placeholder={viewState==='studentLogin'?'کد ملی خود را وارد کنید':'admin'} required/></div></label>
       <label>رمز عبور<div className="sh-input"><Lock size={16}/><input type="password" value={viewState==='studentLogin'?studentPhone:adminPassword} onChange={e=>viewState==='studentLogin'?setStudentPhone(e.target.value):setAdminPassword(e.target.value)} placeholder={viewState==='studentLogin'?'شماره موبایل خود را وارد کنید':'••••••••'} required/></div></label>
       <button className="sh-submit" type="submit">{viewState==='studentLogin'?'ورود به پنل کاربری':'ورود به مدیریت سیستم'}<ArrowRight size={15}/></button>
     </form>}
     {viewState==='counselorLogin'&&<form className="sh-form" onSubmit={counselorSubmit}>
       <button type="button" className="sh-back" onClick={back}><ArrowRight size={14}/> بازگشت</button>
       <div className="sh-kicker">پنل مشاوره</div><h2>ورود مشاور</h2>
       <p>اطلاعات حساب مشاوره خود را وارد کنید.</p>
       {error&&<div className="sh-error">{error}</div>}
       <label>نام کاربری<div className="sh-input"><span><User size={16}/></span><input value={counselorUsername} onChange={e=>setCounselorUsername(e.target.value)} placeholder="نام کاربری مشاور" autoComplete="username" required/></div></label>
       <label>رمز عبور<div className="sh-input"><Lock size={16}/><input type="password" value={counselorPassword} onChange={e=>setCounselorPassword(e.target.value)} placeholder="رمز عبور" autoComplete="current-password" required/></div></label>
       <button className="sh-submit" type="submit">ورود به پنل مشاور <ArrowRight size={15}/></button>
     </form>}
     <div className="sh-social"><div><a href="https://t.me" target="_blank" rel="noreferrer"><Send size={14}/></a><a href="https://instagram.com" target="_blank" rel="noreferrer"><Camera size={14}/></a><a href="https://youtube.com" target="_blank" rel="noreferrer"><Play size={14}/></a><a href="https://shamseh.ir" target="_blank" rel="noreferrer"><Globe size={14}/></a></div><small>تمامی حقوق مادی و معنوی برای آکادمی شمسه محفوظ است. © 2026</small></div>
   </div>
   <style>{`
    .sh-login{min-height:100vh;display:grid;grid-template-columns:42% 58%;direction:ltr;background:#f5f6f5;color:#182022;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .sh-particle-intro{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;background:transparent}.sh-particle-intro canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.85;animation:none}.sh-emblem-window{position:absolute;left:12%;bottom:20%;top:auto;width:min(30%,160px);height:auto;aspect-ratio:1 / .7;transform:none;overflow:hidden;opacity:1!important;animation:none!important;z-index:2}.sh-emblem-window img{position:absolute;width:100%;height:auto;left:0;top:0;display:block;filter:drop-shadow(0 0 12px rgba(72,209,204,.22))}.sh-particle-intro.reduced{animation:none;background:transparent}.sh-particle-intro.reduced .sh-emblem-window{opacity:1!important;animation:none!important}.sh-particle-intro.reduced canvas{display:none}\n    .sh-login-visual{background:#1a2021;color:#f4f7f6;position:relative;overflow:hidden;padding:38px;display:flex;flex-direction:column;direction:rtl;box-sizing:border-box}.sh-login-visual:after{content:"";position:absolute;width:520px;height:520px;border:1px solid rgba(91,191,198,.13);border-radius:50%;left:-240px;bottom:-230px}.sh-login-orbit{position:absolute;border:1px solid rgba(91,191,198,.10);border-radius:50%;pointer-events:none}.sh-login-orbit.one{width:330px;height:330px;right:-180px;top:-190px}.sh-login-orbit.two{width:180px;height:180px;right:-80px;top:-90px}
    .sh-login-brand{display:flex;align-items:center;gap:11px;cursor:pointer;z-index:2;animation:sh-brand-arrive 1.25s .25s cubic-bezier(.2,.75,.25,1) both}.sh-login-brand img{width:45px;height:45px;object-fit:contain}.sh-login-brand span{font-size:10px;color:#91b5b5;font-weight:800}
    .sh-login-copy{margin:auto 0;max-width:430px;z-index:2;animation:sh-copy-arrive 1.45s .35s cubic-bezier(.2,.75,.25,1) both}.sh-login-copy>span{font-size:9px;letter-spacing:2px;color:#5bbfc6;font-weight:900}.sh-login-copy h1{font-size:42px;line-height:1.2;margin:13px 0 14px;font-weight:900;letter-spacing:-1px}.sh-login-copy h1 em{color:#b9dfe0;font-style:normal}.sh-login-copy p{font-size:12px;color:#aab5b4;line-height:2;max-width:370px}.sh-login-footer{font-size:9px;color:#6f7b7b;z-index:2;animation:sh-copy-arrive 1.5s .45s cubic-bezier(.2,.75,.25,1) both}
    .sh-login-content{direction:rtl;padding:30px 7vw;display:flex;flex-direction:column;min-width:0;box-sizing:border-box}.sh-login-top{display:flex;justify-content:space-between;align-items:center;color:#71807f;font-size:9px}.sh-login-top button{border:0;background:none;color:#38838a;font-size:9px;font-weight:800;cursor:pointer}.sh-welcome,.sh-form,.sh-info{width:min(100%,470px);margin:auto}.sh-kicker{font-size:9px;color:#38838a;font-weight:900;margin-bottom:7px}.sh-welcome h2,.sh-form h2,.sh-info h2{font-size:27px;margin:0 0 7px;font-weight:900;letter-spacing:-.5px}.sh-welcome p,.sh-form p,.sh-info p{font-size:11px;color:#71807f;line-height:1.9;margin:0 0 20px}.sh-entry-list{display:flex;flex-direction:column;gap:8px}.sh-entry{width:100%;border:1px solid #dfe7e5;background:#fff;color:#182022;border-radius:14px;padding:12px;display:flex;align-items:center;gap:10px;text-align:right;cursor:pointer;transition:.18s;direction:rtl}.sh-entry:hover{transform:translateX(-3px);border-color:#a9cccc}.sh-entry.primary{background:#38838a;border-color:#38838a;color:#fff}.sh-preregister{text-decoration:none;background:#f0f8f7;border-color:#b8d8d5;color:#182022}.sh-preregister .sh-entry-icon{background:#dcefed;color:#168C91}.sh-entry-icon{width:35px;height:35px;border-radius:10px;background:rgba(56,131,138,.10);color:#38838a;display:grid;place-items:center;flex:none}.sh-entry.primary .sh-entry-icon{background:rgba(255,255,255,.14);color:#fff}.sh-entry>span:nth-child(2){flex:1;display:flex;flex-direction:column;gap:2px}.sh-entry strong{font-size:11px}.sh-entry small{font-size:8px;color:#758482}.sh-entry.primary small{color:#d7ecec}.sh-entry>svg{color:#758482}.sh-entry.primary>svg{color:#fff}
    .sh-form label{display:block;font-size:10px;font-weight:800;margin-bottom:12px}.sh-input{height:45px;margin-top:6px;border:1px solid #dfe7e5;background:#fff;border-radius:11px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#778584}.sh-input input{width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:11px;color:#182022}.sh-submit{width:100%;margin-top:5px;border:0;background:#182022;color:#fff;border-radius:11px;padding:12px;display:flex;justify-content:center;align-items:center;gap:7px;font-size:10px;font-weight:900;cursor:pointer}.sh-back{border:0;background:none;color:#38838a;font-size:9px;font-weight:800;display:flex;align-items:center;gap:4px;padding:0;margin-bottom:18px;cursor:pointer}.sh-error{padding:9px 10px;background:#fff1f1;color:#b5414a;border:1px solid #f0d2d4;border-radius:9px;font-size:9px;margin-bottom:12px}.sh-info p{white-space:pre-line}.sh-social{margin-top:auto;padding-top:25px;text-align:center}.sh-social>div{display:flex;justify-content:center;gap:7px}.sh-social a{width:31px;height:31px;border:1px solid #dfe7e5;background:#fff;border-radius:50%;display:grid;place-items:center;color:#637371}.sh-social small{display:block;color:#8a9694;font-size:8px;margin-top:9px}
    @keyframes sh-brand-arrive{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}@keyframes sh-copy-arrive{from{opacity:0;transform:translateX(38px)}to{opacity:1;transform:translateX(0)}}@media(prefers-reduced-motion:reduce){.sh-login-brand,.sh-login-copy,.sh-login-footer,.sh-particle-intro,.sh-emblem-window{animation:none!important}.sh-emblem-window{opacity:1!important}}@media(max-width:850px){.sh-login{display:block}.sh-login-visual{min-height:330px;padding:24px}.sh-login-copy{margin:auto 0}.sh-login-copy h1{font-size:32px}.sh-login-content{min-height:calc(100vh - 330px);padding:24px}.sh-login-top{margin-bottom:8px}}
    @media(max-width:520px){.sh-login-visual{min-height:290px}.sh-login-copy h1{font-size:28px}.sh-login-content{padding:20px 16px}.sh-welcome h2,.sh-form h2,.sh-info h2{font-size:23px}}
   `}</style>
 </div>;
};
