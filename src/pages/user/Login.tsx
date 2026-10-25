import React,{useEffect,useRef,useState} from 'react';
import type { Student,Admin } from '../../types';
import { User,Shield,Lock,ArrowRight,Send,Globe,Camera,Play,BookOpen,GraduationCap,ChevronLeft,ChevronRight,CalendarDays,Newspaper,BookOpenCheck,ExternalLink } from 'lucide-react';
import { CourseCatalogPage, RulesPage, ExamAnalysisPage } from '../public/PublicPages';

type NewsItem={id?:string;title:string;summary:string;imageUrl?:string;category?:string;date?:string;published?:boolean};
type InfoCourse={id:string;title:string;professor:string;description?:string|null;coverImage?:string|null;level?:string|null};
type InfoAnalysis={id:string;title:string;subtitle?:string|null;content:string;examYear?:string|null;resourceUrl?:string|null};
const InformationPage:React.FC<{onBack:()=>void}>=({onBack})=>{
 const [news,setNews]=useState<NewsItem[]>([]),[courses,setCourses]=useState<InfoCourse[]>([]),[analyses,setAnalyses]=useState<InfoAnalysis[]>([]),[rules,setRules]=useState<{title:string;content:string}|null>(null),[slide,setSlide]=useState(0),[error,setError]=useState('');
 useEffect(()=>{void Promise.all([
 fetch('/api/content/news').then(r=>r.ok?r.json():[]),
 fetch('/api/public/courses').then(r=>r.ok?r.json():[]),
 fetch('/api/public/content/analyses').then(r=>r.ok?r.json():[]),
 fetch('/api/public/content/rules').then(r=>r.ok?r.json():null),
 ]).then(([n,c,a,r])=>{setNews(Array.isArray(n)?n:[]);setCourses(Array.isArray(c)?c:[]);setAnalyses(Array.isArray(a)?a:[]);setRules(r)}).catch(()=>setError('دریافت بخشی از اطلاعات انجام نشد. دوباره صفحه را بارگذاری کنید.'));},[]);
 useEffect(()=>{if(news.length<2)return;const id=window.setInterval(()=>setSlide(s=>(s+1)%news.length),6000);return()=>window.clearInterval(id)},[news.length]);
 const featured=news.length?news[((slide%news.length)+news.length)%news.length]:null;
 const card={background:'#fff',border:'1px solid #e2e9e7',borderRadius:18,overflow:'hidden' as const,boxShadow:'0 8px 28px rgba(20,50,50,.045)'};
 return <main dir="rtl" style={{minHeight:'100vh',background:'#f5f8f7',color:'#1c2929',fontFamily:'system-ui,sans-serif'}}>
 <header style={{maxWidth:1180,margin:'auto',padding:'16px clamp(16px,4vw,40px)',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid #e1e9e7'}}>
 <button onClick={onBack} aria-label="بازگشت" style={{border:0,background:'transparent',display:'flex',alignItems:'center',gap:6,color:'#526766',cursor:'pointer'}}><ArrowRight size={18}/> بازگشت</button><img src="/logo.png" alt="شمسه" style={{width:38,height:38,objectFit:'contain'}}/><div style={{flex:1}}><strong style={{fontSize:15}}>آکادمی شمسه</strong><div style={{fontSize:11,color:'#71807f',marginTop:3}}>اخبار و اطلاعات آموزشی</div></div>
 </header>
 <div style={{maxWidth:1180,margin:'auto',padding:'24px clamp(16px,4vw,40px) 50px'}}>

 {error&&<p role="status" style={{padding:12,background:'#fff7ed',borderRadius:10,color:'#9a3412'}}>{error}</p>}
 <section aria-label="آخرین اخبار و اطلاعات آموزشی" style={{position:'relative',isolation:'isolate',overflow:'hidden',minHeight:310,marginBottom:36,borderRadius:18,background:'linear-gradient(115deg,#252525 0%,#303030 55%,#202020 100%)',border:'1px solid rgba(72,209,204,.32)',boxShadow:'0 18px 48px rgba(13,47,49,.16)'}}>
 
 <div style={{position:'relative',zIndex:1,display:'grid',gridTemplateColumns:'minmax(0,1fr)',gap:0,alignItems:'stretch',justifyItems:'stretch',padding:0}}>
 <article style={{background:'rgba(250,255,254,.76)',backdropFilter:'blur(14px) saturate(135%)',WebkitBackdropFilter:'blur(14px) saturate(135%)',border:'1px solid rgba(255,255,255,.42)',borderRadius:16,overflow:'hidden',boxShadow:'0 12px 35px rgba(0,0,0,.15)',color:'#1c2929',width:'100%',minHeight:280,justifySelf:'stretch',transition:'background .25s ease,border-color .25s ease'}}>
 {featured?.imageUrl?<img src={featured.imageUrl} alt="" style={{width:'100%',height:150,objectFit:'cover',display:'block'}}/>:<div style={{height:110,background:'radial-gradient(circle at 20% 20%,rgba(72,209,204,.35),transparent 36%),linear-gradient(135deg,#153a40,#10272c)',display:'grid',placeItems:'center',color:'#168c91'}}><Newspaper size={70} strokeWidth={1}/></div>}
 <div style={{padding:'18px clamp(17px,2.5vw,26px)',display:'flex',flexDirection:'column',justifyContent:'center',gap:10}}>
 <span style={{fontSize:10,color:'#168c91',fontWeight:850}}>{featured?.category||'اخبار و اطلاعیه‌ها'}</span><h2 style={{fontSize:'clamp(16px,2vw,21px)',lineHeight:1.7,margin:0}}>{featured?.title||'اخبار و اطلاعیه‌های آموزشی شمسه'}</h2><p style={{fontSize:12,color:'#71807f',lineHeight:1.9,margin:0}}>{featured?.summary||'خبرها و اطلاعیه‌های جدید آکادمی در این بخش نمایش داده می‌شوند.'}</p>
 <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:8}}><span style={{fontSize:11,color:'#8a9997'}}>{featured?.date||''}</span><div style={{display:'flex',gap:7}}><button onClick={()=>setSlide(s=>(s-1+Math.max(news.length,1))%Math.max(news.length,1))} aria-label="خبر قبلی" style={{border:'1px solid #dce7e5',borderRadius:10,padding:9,background:'#fff',cursor:'pointer'}}><ChevronRight size={17}/></button><button onClick={()=>setSlide(s=>(s+1)%Math.max(news.length,1))} aria-label="خبر بعدی" style={{border:'1px solid #dce7e5',borderRadius:10,padding:9,background:'#fff',cursor:'pointer'}}><ChevronLeft size={17}/></button></div></div>
 {news.length>1&&<div style={{display:'flex',gap:5}}>{news.map((item,i)=><button key={item.id||i} aria-label={'رفتن به خبر '+(i+1)} onClick={()=>setSlide(i)} style={{height:4,flex:1,border:0,borderRadius:9,background:i===slide?'#168c91':'#dfe8e6',cursor:'pointer'}}/>)}</div>}
 </div></article></div></section>
 <section style={{marginBottom:36}}><div style={{display:'flex',alignItems:'end',justifyContent:'space-between',gap:10,marginBottom:15}}><div><span style={{fontSize:10,color:'#168c91',fontWeight:850}}>01 · دوره‌ها</span><h2 style={{fontSize:21,margin:'5px 0',fontWeight:850}}>معرفی دوره‌های شمسه</h2></div><GraduationCap color="#168c91" size={24}/></div>
 {courses.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,250px),1fr))',gap:15}}>{courses.slice(0,6).map(course=><article key={course.id} style={card}>{course.coverImage?<div style={{height:145,background:'linear-gradient(135deg,#e5f5f3,#f7fbfa)',display:'grid',placeItems:'center',color:'#168c91',overflow:'hidden'}}><img src={course.coverImage} alt="" onError={e=>{e.currentTarget.style.display='none';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/><span style={{position:'absolute',opacity:0,pointerEvents:'none'}}><BookOpen size={35}/></span></div>:<div style={{height:110,background:'linear-gradient(135deg,#e5f5f3,#f7fbfa)',display:'grid',placeItems:'center',color:'#168c91'}}><BookOpen size={35}/></div>}<div style={{padding:17}}><h3 style={{fontSize:15,margin:'0 0 7px',lineHeight:1.8}}>{course.title}</h3><p style={{fontSize:11,color:'#71807f',margin:'0 0 8px'}}>استاد: {course.professor}</p><p style={{fontSize:12,color:'#617270',lineHeight:1.9,margin:0}}>{(course.description||'اطلاعات تکمیلی دوره در آکادمی شمسه ارائه می‌شود.').slice(0,150)}</p></div></article>)}</div>:<p style={{...card,padding:20,color:'#71807f',fontSize:12}}>در حال حاضر دوره‌ای برای نمایش ثبت نشده است.</p>}</section>
 <section style={{marginBottom:36}}><div style={{display:'flex',alignItems:'end',justifyContent:'space-between',gap:10,marginBottom:15}}><div><span style={{fontSize:10,color:'#168c91',fontWeight:850}}>02 · گزارش‌ها</span><h2 style={{fontSize:21,margin:'5px 0',fontWeight:850}}>عملکرد شمسه در کنکورهای سال‌های گذشته</h2></div><BookOpenCheck color="#168c91" size={24}/></div>
 {analyses.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:15}}>{analyses.slice(0,6).map(item=><article key={item.id} style={{...card,padding:19}}><div style={{fontSize:10,color:'#168c91',fontWeight:800,marginBottom:7}}>{item.examYear||'تحلیل آموزشی'}</div><h3 style={{fontSize:15,lineHeight:1.8,margin:'0 0 7px'}}>{item.title}</h3>{item.subtitle&&<p style={{fontSize:12,color:'#71807f',lineHeight:1.9,margin:'0 0 8px'}}>{item.subtitle}</p>}<p style={{fontSize:12,color:'#617270',lineHeight:2,margin:0}}>{item.content.slice(0,180)}</p>{item.resourceUrl&&<a href={item.resourceUrl} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:12,color:'#168c91',fontSize:12,textDecoration:'none'}}>مشاهده تحلیل <ExternalLink size={13}/></a>}</article>)}</div>:<p style={{...card,padding:20,color:'#71807f',fontSize:12}}>اطلاعات عملکرد پس از انتشار تحلیل‌ها در پنل مدیریت نمایش داده می‌شود.</p>}</section>
 <section><div style={{display:'flex',alignItems:'end',justifyContent:'space-between',gap:10,marginBottom:15}}><div><span style={{fontSize:10,color:'#168c91',fontWeight:850}}>03 · راهنما</span><h2 style={{fontSize:21,margin:'5px 0',fontWeight:850}}>قوانین و مقررات آموزشی آکادمی شمسه</h2></div><CalendarDays color="#168c91" size={24}/></div><article style={{...card,padding:'clamp(18px,3vw,28px)'}}><h3 style={{fontSize:16,margin:'0 0 12px'}}>{rules?.title||'قوانین و مقررات آموزشی'}</h3><div style={{fontSize:13,lineHeight:2.3,color:'#526361',whiteSpace:'pre-wrap'}}>{rules?.content||'قوانین آموزشی در حال آماده‌سازی است.'}</div></article></section>
 <footer style={{marginTop:35,paddingTop:17,borderTop:'1px solid #e1e9e7',fontSize:11,color:'#81908e'}}>تمامی حقوق برای آکادمی شمسه محفوظ است.</footer>
 </div></main>;
};


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
  const particles=Array.from({length:132},(_,i)=>({seed:i/132,phase:Math.random()*Math.PI*2,size:Math.random()*1.9+.75,speed:.1+Math.random()*.24,orbit:.28+Math.random()*.34}));
  const resize=()=>{const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;dpr=Math.min(window.devicePixelRatio||1,1.6);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
  const draw=(now:number)=>{
   if(lastTime)elapsed+=(now-lastTime)/1000;
   lastTime=now;
   ctx!.clearRect(0,0,width,height);
   const t=elapsed, cx=width*.5, cy=height*.53, rx=width*.47, ry=height*.43;
   particles.forEach((p,i)=>{
    const a=(t*p.speed)+(p.seed*Math.PI*2)+p.phase;
    const x=cx+Math.cos(a)*rx*p.orbit*2.15;
    const y=cy+Math.sin(a*1.27)*ry*p.orbit*2.15;
    const alpha=.38+.58*(.5+.5*Math.sin(a*1.8));
    ctx!.beginPath();ctx!.fillStyle='rgba(72,209,204,'+alpha+')';ctx!.shadowBlur=p.size*7;ctx!.shadowColor='#48d1cc';ctx!.arc(x,y,p.size,0,Math.PI*2);ctx!.fill();
    if(i%9===0){
     const tailA=a-.18;ctx!.beginPath();ctx!.strokeStyle='rgba(72,209,204,.25)';ctx!.lineWidth=.7;ctx!.moveTo(cx+Math.cos(tailA)*rx*p.orbit*2.15,cy+Math.sin(tailA*1.27)*ry*p.orbit*2.15);ctx!.lineTo(x,y);ctx!.stroke();
    }
   });
   ctx!.shadowBlur=0;
   raf=requestAnimationFrame(draw);
  };
  resize();const observer=new ResizeObserver(resize);observer.observe(canvas);raf=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();};
 },[reducedMotion]);
 return <div className={'sh-particle-intro'+(reducedMotion?' reduced':'')} aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',background:'transparent',pointerEvents:'none',overflow:'hidden'}}>
  <canvas ref={canvasRef} style={{position:'absolute',inset:0,display:'block',width:'100%',height:'100%',background:'transparent'}}/>
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
 if (viewState === 'information') return <InformationPage onBack={back} />;
 return <div className="sh-login">
   <div className="sh-login-visual">
     <ShamsehParticleIntro/>
     <div className="sh-login-brand" onClick={()=>setViewState(viewState==='adminLogin'?'welcome':'adminLogin')}><img src="/logo.png" alt="لوگو آکادمی شمسه"/><span>سامانه آموزشی شمسه</span></div>
     <div className="sh-login-copy"><h1>مسیر آموزش،<br/><em>منظم و متمرکز.</em></h1><p>دوره‌ها، آزمون‌ها، فایل‌های آموزشی و خدمات آموزشی شمسه.</p></div>
   </div>
   <div className="sh-login-content">
     <div className="sh-login-top"></div>
     {viewState==='welcome'&&<div className="sh-welcome"><div className="sh-kicker">ورود به سامانه</div><h2>از اینجا شروع کنید</h2><p>برای ادامه، بخش موردنظر خود را انتخاب کنید.</p><div className="sh-entry-list">
       <button className="sh-entry primary" onClick={()=>setViewState('studentLogin')}><span className="sh-entry-icon"><User size={18}/></span><span><strong>پنل هنرجویی</strong><small>دسترسی به دوره‌ها، آزمون‌ها و فایل‌های من</small></span><ArrowRight size={15}/></button>
       <button className="sh-entry" onClick={()=>setViewState('counselorLogin')}><span className="sh-entry-icon"><Shield size={18}/></span><span><strong>ورود مشاور</strong><small>ورود به پنل اختصاصی مشاوره</small></span><ArrowRight size={15}/></button>
       <button className="sh-entry" onClick={()=>setViewState('information')}><span className="sh-entry-icon"><BookOpen size={18}/></span><span><strong>آخرین اخبار و اطلاعات آموزشی</strong><small>اخبار و اطلاعیه‌های آموزشی شمسه</small></span><ArrowRight size={15}/></button>
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
    .sh-particle-intro{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;background:transparent}.sh-particle-intro canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.85;animation:none}.sh-particle-intro.reduced{animation:none;background:transparent}.sh-particle-intro.reduced canvas{display:none}\n    .sh-login-visual{background:#1a2021;color:#f4f7f6;position:relative;overflow:hidden;padding:38px;display:flex;flex-direction:column;direction:rtl;box-sizing:border-box}
    .sh-login-brand{display:flex;flex-direction:column;align-items:center;gap:0;align-self:flex-start;cursor:pointer;z-index:2;animation:sh-brand-arrive 1.25s cubic-bezier(.2,.75,.25,1) both!important;opacity:1;margin-top:10px}.sh-login-brand img{width:112px;height:112px;object-fit:contain;display:block;opacity:1;animation:none!important;transition:none!important;transform:none!important;filter:none!important}.sh-login-brand span{font-size:11px;color:#91b5b5;font-weight:800;white-space:nowrap;line-height:1.1;margin-top:-20px}
    .sh-login-copy{margin:auto 0;max-width:430px;z-index:2;animation:sh-copy-arrive 1.45s .35s cubic-bezier(.2,.75,.25,1) both}.sh-login-copy>span{font-size:9px;letter-spacing:2px;color:#5bbfc6;font-weight:900}.sh-login-copy h1{font-size:42px;line-height:1.2;margin:13px 0 14px;font-weight:900;letter-spacing:-1px}.sh-login-copy h1 em{color:#b9dfe0;font-style:normal}.sh-login-copy p{font-size:12px;color:#aab5b4;line-height:2;max-width:370px}.sh-login-footer{font-size:9px;color:#6f7b7b;z-index:2;animation:sh-copy-arrive 1.5s .45s cubic-bezier(.2,.75,.25,1) both}
    .sh-login-content{direction:rtl;padding:30px 7vw;display:flex;flex-direction:column;min-width:0;box-sizing:border-box}.sh-login-top{display:flex;justify-content:space-between;align-items:center;color:#71807f;font-size:9px}.sh-login-top button{border:0;background:none;color:#38838a;font-size:9px;font-weight:800;cursor:pointer}.sh-welcome,.sh-form,.sh-info{width:min(100%,470px);margin:auto}.sh-kicker{font-size:9px;color:#38838a;font-weight:900;margin-bottom:7px}.sh-welcome h2,.sh-form h2,.sh-info h2{font-size:27px;margin:0 0 7px;font-weight:900;letter-spacing:-.5px}.sh-welcome p,.sh-form p,.sh-info p{font-size:11px;color:#71807f;line-height:1.9;margin:0 0 20px}.sh-entry-list{display:flex;flex-direction:column;gap:8px}.sh-entry{width:100%;border:1px solid #dfe7e5;background:#fff;color:#182022;border-radius:14px;padding:12px;display:flex;align-items:center;gap:10px;text-align:right;cursor:pointer;transition:.18s;direction:rtl}.sh-entry:hover{transform:translateX(-3px);border-color:#a9cccc}.sh-entry.primary{background:#38838a;border-color:#38838a;color:#fff}.sh-preregister{text-decoration:none;background:#f0f8f7;border-color:#b8d8d5;color:#182022}.sh-preregister .sh-entry-icon{background:#dcefed;color:#168C91}.sh-entry-icon{width:35px;height:35px;border-radius:10px;background:rgba(56,131,138,.10);color:#38838a;display:grid;place-items:center;flex:none}.sh-entry.primary .sh-entry-icon{background:rgba(255,255,255,.14);color:#fff}.sh-entry>span:nth-child(2){flex:1;display:flex;flex-direction:column;gap:2px}.sh-entry strong{font-size:11px}.sh-entry small{font-size:8px;color:#758482}.sh-entry.primary small{color:#d7ecec}.sh-entry>svg{color:#758482}.sh-entry.primary>svg{color:#fff}
    .sh-form label{display:block;font-size:10px;font-weight:800;margin-bottom:12px}.sh-input{height:45px;margin-top:6px;border:1px solid #dfe7e5;background:#fff;border-radius:11px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#778584}.sh-input input{width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:11px;color:#182022}.sh-submit{width:100%;margin-top:5px;border:0;background:#182022;color:#fff;border-radius:11px;padding:12px;display:flex;justify-content:center;align-items:center;gap:7px;font-size:10px;font-weight:900;cursor:pointer}.sh-back{border:0;background:none;color:#38838a;font-size:9px;font-weight:800;display:flex;align-items:center;gap:4px;padding:0;margin-bottom:18px;cursor:pointer}.sh-error{padding:9px 10px;background:#fff1f1;color:#b5414a;border:1px solid #f0d2d4;border-radius:9px;font-size:9px;margin-bottom:12px}.sh-info p{white-space:pre-line}.sh-social{margin-top:auto;padding-top:25px;text-align:center}.sh-social>div{display:flex;justify-content:center;gap:7px}.sh-social a{width:31px;height:31px;border:1px solid #dfe7e5;background:#fff;border-radius:50%;display:grid;place-items:center;color:#637371}.sh-social small{display:block;color:#8a9694;font-size:8px;margin-top:9px}
    @keyframes sh-brand-arrive{from{transform:translateX(24px)}to{transform:translateX(0)}}@keyframes sh-copy-arrive{from{opacity:0;transform:translateX(38px)}to{opacity:1;transform:translateX(0)}}@media(prefers-reduced-motion:reduce){.sh-login-brand,.sh-login-brand img,.sh-login-copy,.sh-login-footer,.sh-particle-intro{animation:none!important;opacity:1!important;transform:none!important}}@media(max-width:850px){.sh-login{display:block}.sh-login-visual{min-height:330px;padding:24px}.sh-login-copy{margin:auto 0}.sh-login-copy h1{font-size:32px}.sh-login-content{min-height:calc(100vh - 330px);padding:24px}.sh-login-top{margin-bottom:8px}}
    @media(max-width:520px){.sh-login-visual{min-height:290px}.sh-login-brand img{width:88px;height:88px}.sh-login-brand span{font-size:10px;margin-top:-16px}.sh-login-copy h1{font-size:28px}.sh-login-content{padding:20px 16px}.sh-welcome h2,.sh-form h2,.sh-info h2{font-size:23px}}
   `}</style>
 </div>;
};
