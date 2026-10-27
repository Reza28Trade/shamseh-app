import React,{useEffect,useRef,useState} from 'react';
import type { Student,Admin } from '../../types';
import { User,Shield,Lock,ArrowRight,Send,Globe,Camera,Play,BookOpen,GraduationCap,ChevronLeft,ChevronRight,CalendarDays,Newspaper,BookOpenCheck,FileText } from 'lucide-react';
import { CourseCatalogPage, RulesPage, ExamAnalysisPage } from '../public/PublicPages';

type NewsItem={id?:string;title:string;summary:string;imageUrl?:string;category?:string;date?:string;published?:boolean};
type InfoCourse={id:string;title:string;professor:string;description?:string|null;coverImage?:string|null;level?:string|null;academicYear?:number|null;term?:string|null;category?:string|null;startDate?:string|null;schedule?:string|null;price?:string|number|null;classDays?:string[];classStartTime?:string|null;classEndTime?:string|null};
type InfoBook={id:string;title:string;description?:string|null;coverImage?:string|null;academicLevel?:string|null;category?:string|null;price?:string|number|null;discountedPrice?:string|number|null;availableQuantity?:number};
const InformationPage:React.FC<{onBack:()=>void}>=({onBack})=>{
 const [news,setNews]=useState<NewsItem[]>([]),[courses,setCourses]=useState<InfoCourse[]>([]),[selectedCourse,setSelectedCourse]=useState<InfoCourse|null>(null),[courseLevelFilter,setCourseLevelFilter]=useState<'ALL'|'MASTER'|'DOCTORATE'>('ALL'),[books,setBooks]=useState<InfoBook[]>([]),[bookLevelFilter,setBookLevelFilter]=useState<'ALL'|'MASTER'|'DOCTORATE'>('ALL'),[bookFieldFilter,setBookFieldFilter]=useState('ALL'),[rules,setRules]=useState<{title:string;content:string}|null>(null),[slide,setSlide]=useState(0),[rulesFilter,setRulesFilter]=useState('ALL'),[error,setError]=useState('');
 useEffect(()=>{void Promise.all([
 fetch('/api/content/news').then(r=>r.ok?r.json():[]),
 fetch('/api/public/courses').then(r=>r.ok?r.json():[]),
 fetch('/api/public/content/rules').then(r=>r.ok?r.json():null),
 fetch('/api/public/books').then(r=>r.ok?r.json():[]),
 ]).then(([n,c,r,b])=>{setNews(Array.isArray(n)?n:[]);setCourses(Array.isArray(c)?c:[]);setRules(r);setBooks(Array.isArray(b)?b:[])}).catch(()=>setError('دریافت بخشی از اطلاعات انجام نشد. دوباره صفحه را بارگذاری کنید.'));},[]);
 useEffect(()=>{if(news.length<2)return;const id=window.setInterval(()=>setSlide(s=>(s+1)%news.length),8500);return()=>window.clearInterval(id)},[news.length]);
 const featured=news.length?news[((slide%news.length)+news.length)%news.length]:null;
 const normalizeLevel=(level?:string|null):'MASTER'|'DOCTORATE'|'OTHER'=>{const value=String(level||'').trim().toUpperCase();if(/MASTER|ARSHAD|کارشناسی ارشد|ارشد/.test(value))return 'MASTER';if(/DOCTOR|DOKTOR|دکتری|دکترا/.test(value))return 'DOCTORATE';return 'OTHER'};
 const levelLabel=(level?:string|null)=>{const normalized=normalizeLevel(level);if(normalized==='MASTER')return 'کارشناسی ارشد';if(normalized==='DOCTORATE')return 'دکتری';return level||'ثبت نشده'};
 const persianDay=(day:string)=>({SATURDAY:'شنبه',SUNDAY:'یکشنبه',MONDAY:'دوشنبه',TUESDAY:'سه‌شنبه',WEDNESDAY:'چهارشنبه',THURSDAY:'پنجشنبه',FRIDAY:'جمعه',SAT:'شنبه',SUN:'یکشنبه',MON:'دوشنبه',TUE:'سه‌شنبه',WED:'چهارشنبه',THU:'پنجشنبه',FRI:'جمعه'}[day.trim().toUpperCase()]||day);
 const persianTerm=(term?:string|null)=>{if(!term)return term;return term.trim().replace(/autumn|fall/ig,'پاییز').replace(/winter/ig,'زمستان').replace(/spring/ig,'بهار').replace(/summer/ig,'تابستان').replace(/online/ig,'آنلاین').replace(/offline/ig,'حضوری').replace(/semester/ig,'نیم‌سال').replace(/term/ig,'ترم')};
 const formatDate=(value?:string|null)=>{if(!value)return '';const date=new Date(value);if(Number.isNaN(date.getTime()))return value;return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'long',day:'numeric'}).format(date)};
 const courseSchedule=(course:InfoCourse)=>{const days=(course.classDays||[]).map(persianDay).join('، ');const time=course.classStartTime||course.classEndTime?(String(course.classStartTime||'')+(course.classStartTime&&course.classEndTime?' تا ':'')+String(course.classEndTime||'')):'';return [days,time].filter(Boolean).join(' | ')||course.schedule||'زمان برگزاری هنوز ثبت نشده است'};
 const visibleCourses=courses.filter(course=>courseLevelFilter==='ALL'||normalizeLevel(course.level)===courseLevelFilter);
 const publicRuleCategories=[
  {key:'registration',label:'ثبت‌نام و شرایط عمومی',pattern:/ثبت‌نام و شرایط عمومی|ثبت نام و انتخاب دوره|ثبت‌نام و انتخاب دوره/i},
  {key:'tuition',label:'شهریه و پرداخت',pattern:/شهریه و پرداخت|شرایط پرداخت شهریه/i},
  {key:'exams',label:'آزمون‌های آزمایشی',pattern:/آزمون‌های آزمایشی|آزمون های آزمایشی/i},
  {key:'counseling',label:'مشاوره تحصیلی',pattern:/مشاوره تحصیلی|خدمات مشاوره/i},
  {key:'resources',label:'منابع و کتاب‌های آموزشی',pattern:/منابع و کتاب‌های آموزشی|منابع و کتاب ها/i},
  {key:'other',label:'اطلاع‌رسانی و سایر مقررات',pattern:/اطلاع‌رسانی و سایر مقررات|سایر مقررات/i},
 ];
 const parsedRuleSections=(()=>{const content=rules?.content||'';if(!content.trim())return [];const chunks=content.split(/(?=^(?:[۰-۹0-9]+[.．]\s*)?(?:ثبت‌نام و شرایط عمومی|ثبت نام و انتخاب دوره|ثبت‌نام و انتخاب دوره|شهریه و پرداخت|شرایط پرداخت شهریه|آزمون‌های آزمایشی(?: مقطع کارشناسی ارشد| مقطع دکتری)?|مشاوره تحصیلی|خدمات مشاوره تحصیلی|منابع و کتاب‌های آموزشی|اطلاع‌رسانی و سایر مقررات)\s*$)/m).map(part=>part.trim()).filter(Boolean);return chunks.map((content,index)=>({content,category:publicRuleCategories.find(category=>category.pattern.test(content))?.key||'other',title:publicRuleCategories.find(category=>category.pattern.test(content))?.label||'سایر مقررات',id:String(index)}))})();
 const visibleRuleSections=parsedRuleSections.filter(section=>rulesFilter==='ALL'||section.category===rulesFilter);
 const card={background:'#fff',border:'1px solid #e2e9e7',borderRadius:18,overflow:'hidden' as const,boxShadow:'0 8px 28px rgba(20,50,50,.045)'};
 return <main dir="rtl" style={{minHeight:'100vh',background:'#f5f8f7',color:'#1c2929',fontFamily:'system-ui,sans-serif'}}>
 <header style={{maxWidth:1180,margin:'auto',padding:'16px clamp(16px,4vw,40px)',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid #e1e9e7'}}>
 <button onClick={onBack} aria-label="بازگشت" style={{border:0,background:'transparent',display:'flex',alignItems:'center',gap:6,color:'#526766',cursor:'pointer'}}><ArrowRight size={18}/> بازگشت</button><img src="/logo.png" alt="شمسه" style={{width:38,height:38,objectFit:'contain'}}/><div style={{flex:1}}><strong style={{fontSize:15}}>آکادمی شمسه</strong><div style={{fontSize:11,color:'#71807f',marginTop:3}}>اخبار و اطلاعات آموزشی</div></div>
 </header>
 <div style={{maxWidth:1180,margin:'auto',padding:'24px clamp(16px,4vw,40px) 50px'}}>

 {error&&<p role="status" style={{padding:12,background:'#fff7ed',borderRadius:10,color:'#9a3412'}}>{error}</p>}
 <section aria-label="آخرین اخبار و اطلاعات آموزشی" style={{position:'relative',isolation:'isolate',overflow:'hidden',height:210,marginBottom:28,borderRadius:16,background:'linear-gradient(115deg,#252525 0%,#303030 55%,#202020 100%)',border:'1px solid rgba(255,255,255,.10)',boxShadow:'0 12px 30px rgba(13,47,49,.10)'}}>
 
 <div style={{position:'relative',zIndex:1,display:'grid',gridTemplateColumns:'minmax(0,1fr)',height:'100%',gap:0,alignItems:'stretch',justifyItems:'stretch',padding:0}}>
 <article style={{display:'grid',gridTemplateColumns:'minmax(0,0.8fr) minmax(0,1.2fr)',gridTemplateRows:'210px',direction:'ltr',background:'linear-gradient(115deg,#292929 0%,#242424 58%,#202020 100%)',backdropFilter:'blur(14px) saturate(135%)',WebkitBackdropFilter:'blur(14px) saturate(135%)',border:0,borderRadius:0,overflow:'hidden',boxShadow:'none',color:'#f4f7f6',width:'100%',height:'210px',minHeight:0,justifySelf:'stretch',transition:'background .25s ease,border-color .25s ease'}}>
 <div style={{height:'210px',minHeight:0,overflow:'hidden',background:'linear-gradient(135deg,#153a40,#10272c)',display:'grid',placeItems:'center',color:'#168c91'}}>
 {featured?.imageUrl?<img src={featured.imageUrl} alt="" style={{width:'100%',height:'210px',objectFit:'cover',display:'block'}}/>:<Newspaper size={70} strokeWidth={1}/>}
 </div>
 <div style={{direction:'rtl',padding:'clamp(16px,2.3vw,24px)',display:'flex',flexDirection:'column',justifyContent:'center',gap:10}}>
 <span style={{fontSize:10,color:'#80d7d1',fontWeight:850}}>{featured?.category||'اخبار و اطلاعیه‌ها'}</span><h2 style={{fontSize:'clamp(16px,2vw,21px)',lineHeight:1.7,margin:0}}>{featured?.title||'اخبار و اطلاعیه‌های آموزشی شمسه'}</h2><p style={{fontSize:12,color:'#c5cecd',lineHeight:1.9,margin:0}}>{featured?.summary||'خبرها و اطلاعیه‌های جدید آکادمی در این بخش نمایش داده می‌شوند.'}</p>
 <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:8}}><span style={{fontSize:11,color:'#aebbb9'}}>{featured?.date||''}</span><div style={{display:'flex',gap:7}}><button onClick={()=>setSlide(s=>(s-1+Math.max(news.length,1))%Math.max(news.length,1))} aria-label="خبر قبلی" style={{border:'1px solid rgba(255,255,255,.18)',borderRadius:10,padding:9,background:'#353535',color:'#f4f7f6',cursor:'pointer'}}><ChevronRight size={17}/></button><button onClick={()=>setSlide(s=>(s+1)%Math.max(news.length,1))} aria-label="خبر بعدی" style={{border:'1px solid #dce7e5',borderRadius:10,padding:9,background:'#fff',cursor:'pointer'}}><ChevronLeft size={17}/></button></div></div>
 {news.length>1&&<div aria-label="وضعیت خبرها" style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>{news.map((item,i)=><button key={item.id||i} aria-label={'رفتن به خبر '+(i+1)} onClick={()=>setSlide(i)} style={{width:i===slide?18:5,height:5,padding:0,border:0,borderRadius:99,background:i===slide?'#8aabaa':'rgba(120,140,138,.28)',cursor:'pointer',transition:'width .35s ease,background .35s ease'}}/>)}</div>}
 </div></article></div></section>
 <section aria-label="دسترسی سریع به بخش‌های آکادمی" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:0,margin:'0 0 42px',padding:'22px 2px 8px'}}>
 {[
  {id:'courses-section',icon:<GraduationCap size={25} strokeWidth={1.5}/>,title:'معرفی دوره‌ها',text:'آشنایی با دوره‌ها و خدمات آموزشی شمسه',number:'01'},
  {id:'results-section',icon:<BookOpenCheck size={25} strokeWidth={1.5}/>,title:'عملکرد در کنکورهای گذشته',text:'گزارش‌ها و تحلیل عملکرد سال‌های قبل',number:'02'},
  {id:'rules-section',icon:<CalendarDays size={25} strokeWidth={1.5}/>,title:'قوانین آموزشی و مالی',text:'شرایط آموزشی، ثبت‌نام و پرداخت شهریه',number:'03'},
  {id:'books-section',icon:<BookOpen size={25} strokeWidth={1.5}/>,title:'کتاب‌ها و منابع',text:'منابع و کتاب‌های پیشنهادی آکادمی',number:'04'},
 ].map((item,index)=><a key={item.id} href={'#'+item.id} style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:10,padding:'8px 22px',textDecoration:'none',color:'#263332',borderRadius:0,borderLeft:index===3?'none':'1px solid rgba(105,139,136,.24)',transition:'background .2s ease'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(22,140,145,.045)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
 <span style={{color:'#648987',height:30,display:'flex',alignItems:'center'}}>{item.icon}</span>
 <span style={{fontSize:14,fontWeight:750,lineHeight:1.7}}>{item.title}</span>
 <span style={{fontSize:11,color:'#788684',lineHeight:1.9}}>{item.text}</span>
 <span style={{fontSize:10,color:'#9aa7a5',letterSpacing:1,marginTop:2}}>مشاهده بخش ←</span>
 </a>)}
 </section>
 <section id="courses-section" style={{marginBottom:36,scrollMarginTop:24}}><div style={{display:'flex',alignItems:'center',justifyContent:'flex-start',gap:12,marginBottom:18}}><GraduationCap size={48} strokeWidth={1.7} color="#168c91" aria-hidden="true"/><h2 style={{fontSize:21,margin:0,fontWeight:850,lineHeight:1.9}}>معرفی دوره‌های شمسه</h2></div>
 {!selectedCourse&&<div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:16}}><span style={{fontSize:12,fontWeight:750,color:'#526766'}}>نمایش دوره‌های:</span>{([{value:'ALL',label:'همه دوره‌ها'},{value:'MASTER',label:'کارشناسی ارشد'},{value:'DOCTORATE',label:'دکتری'}] as const).map(option=><button key={option.value} type="button" onClick={()=>setCourseLevelFilter(option.value)} aria-pressed={courseLevelFilter===option.value} style={{border:'1px solid '+(courseLevelFilter===option.value?'#168c91':'#dce7e5'),borderRadius:999,padding:'8px 14px',background:courseLevelFilter===option.value?'#e7f5f3':'#fff',color:courseLevelFilter===option.value?'#176e70':'#526766',fontSize:12,fontWeight:750,cursor:'pointer'}}>{option.label}</button>)}</div>}{selectedCourse?<article style={{...card,padding:'clamp(18px,3vw,28px)'}}>
 <button type="button" onClick={()=>setSelectedCourse(null)} style={{display:'inline-flex',alignItems:'center',gap:7,border:'1px solid #dce7e5',borderRadius:10,padding:'9px 13px',background:'#fff',color:'#3c7775',fontSize:12,fontWeight:750,cursor:'pointer',marginBottom:18}}><ArrowRight size={15}/> بازگشت به فهرست دوره‌ها</button>
 {selectedCourse.coverImage&&<img src={selectedCourse.coverImage} alt={selectedCourse.title} onError={e=>{e.currentTarget.style.display='none'}} style={{width:'100%',maxHeight:330,objectFit:'cover',borderRadius:13,marginBottom:20,background:'#e5f5f3'}}/>}
 <h3 style={{fontSize:'clamp(19px,3vw,25px)',lineHeight:1.8,margin:'0 0 8px'}}>{selectedCourse.title}</h3>
 <p style={{fontSize:12,color:'#71807f',margin:'0 0 18px'}}>استاد: {selectedCourse.professor||'اطلاعات ثبت نشده'}</p>
 {selectedCourse.description&&<div style={{fontSize:13,lineHeight:2.2,color:'#526361',whiteSpace:'pre-wrap',marginBottom:20}}>{selectedCourse.description}</div>}
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,190px),1fr))',gap:10}}>
 {[
  ['مقطع تحصیلی',levelLabel(selectedCourse.level)],
  ['سال تحصیلی',selectedCourse.academicYear],
  ['نیم‌سال / دوره',persianTerm(selectedCourse.term)],
  ['گروه آموزشی',selectedCourse.category],
  ['تاریخ شروع',formatDate(selectedCourse.startDate)],
  ['برنامه کلاس',selectedCourse.schedule],
  ['روزهای برگزاری',selectedCourse.classDays?.map(persianDay).join('، ')],
  ['ساعت کلاس',selectedCourse.classStartTime||selectedCourse.classEndTime?(String(selectedCourse.classStartTime||'')+(selectedCourse.classStartTime&&selectedCourse.classEndTime?' تا ':'')+String(selectedCourse.classEndTime||'')):null],
  ['شهریه',selectedCourse.price!==null&&selectedCourse.price!==undefined&&selectedCourse.price!==''?new Intl.NumberFormat('fa-IR').format(Number(selectedCourse.price))+' تومان':null],
 ].filter((item):item is [string,string|number]=>item[1]!==null&&item[1]!==undefined&&item[1]!=='').map(([label,value])=><div key={label} style={{padding:13,border:'1px solid #e2e9e7',borderRadius:11,background:'#f8fbfa'}}><div style={{fontSize:10,color:'#81908e',marginBottom:5}}>{label}</div><div style={{fontSize:12,color:'#344846',fontWeight:700,lineHeight:1.8}}>{value}</div></div>)}
 </div>
 </article>:visibleCourses.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,250px),1fr))',gap:15}}>{visibleCourses.map(course=><article key={course.id} style={card}>{course.coverImage?<div style={{height:145,background:'linear-gradient(135deg,#e5f5f3,#f7fbfa)',display:'grid',placeItems:'center',color:'#168c91',overflow:'hidden'}}><img src={course.coverImage} alt={course.title} onError={e=>{e.currentTarget.style.display='none';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>:<div style={{height:110,background:'linear-gradient(135deg,#e5f5f3,#f7fbfa)',display:'grid',placeItems:'center',color:'#168c91'}}><BookOpen size={35}/></div>}<div style={{padding:17}}><h3 style={{fontSize:15,margin:'0 0 7px',lineHeight:1.8}}>{course.title}</h3><p style={{fontSize:11,color:'#71807f',margin:'0 0 8px'}}>استاد: {course.professor||'اطلاعات ثبت نشده'}</p><p style={{fontSize:12,color:'#617270',lineHeight:1.9,margin:'0 0 13px'}}><strong style={{color:'#526766'}}>روز و ساعت برگزاری: </strong>{courseSchedule(course)}</p><button type="button" onClick={()=>{setSelectedCourse(course);document.getElementById('courses-section')?.scrollIntoView({behavior:'smooth',block:'start'})}} style={{display:'inline-flex',alignItems:'center',gap:7,border:'1px solid #c7dfdc',borderRadius:10,padding:'9px 12px',background:'#f1f8f7',color:'#247b7d',fontSize:11,fontWeight:800,cursor:'pointer'}}>مشاهده جزئیات <ChevronLeft size={14}/></button></div></article>)}</div>:<p style={{...card,padding:20,color:'#71807f',fontSize:12}}>{courses.length?'در این مقطع دوره‌ای ثبت نشده است.':'در حال حاضر دوره‌ای برای نمایش ثبت نشده است.'}</p>}</section>
 <section id="results-section" style={{marginBottom:36,scrollMarginTop:24}}><div style={{display:'flex',alignItems:'center',justifyContent:'flex-start',gap:12,marginBottom:18}}><BookOpenCheck color="#168c91" size={44} strokeWidth={1.7} aria-hidden="true"/><div><span style={{fontSize:10,color:'#168c91',fontWeight:850}}>02 · گزارش‌ها</span><h2 style={{fontSize:21,margin:'5px 0',fontWeight:850,lineHeight:1.9}}>عملکرد شمسه در کنکورهای سال‌های گذشته</h2></div></div>
 <ExamAnalysisPage embedded onBack={onBack}/></section>
 <section id="rules-section" style={{marginBottom:36,scrollMarginTop:24}}><div style={{display:'flex',alignItems:'center',justifyContent:'flex-start',gap:12,marginBottom:18}}><FileText size={48} strokeWidth={1.7} color="#168c91" aria-hidden="true"/><h2 style={{fontSize:21,margin:0,fontWeight:850,lineHeight:1.9}}>قوانین و مقررات آموزشی آکادمی شمسه</h2></div><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:14}}>{[{key:'ALL',label:'همه موارد'},...publicRuleCategories.map(category=>({key:category.key,label:category.label}))].map(option=><button key={option.key} type="button" onClick={()=>setRulesFilter(option.key)} aria-pressed={rulesFilter===option.key} style={{border:'1px solid '+(rulesFilter===option.key?'#168c91':'#dce7e5'),borderRadius:999,padding:'7px 12px',background:rulesFilter===option.key?'#e7f5f3':'#fff',color:rulesFilter===option.key?'#176e70':'#526766',fontSize:11,fontWeight:750,cursor:'pointer'}}>{option.label}</button>)}</div><article style={{...card,padding:'16px 18px'}}><h3 style={{fontSize:15,margin:'0 0 12px'}}>{rules?.title||'قوانین و مقررات آموزشی'}</h3><div style={{maxHeight:320,overflowY:'auto',paddingInlineEnd:8}}>{visibleRuleSections.length?visibleRuleSections.map(section=><section key={section.id} style={{padding:'12px 0',borderBottom:'1px solid #e8eeec'}}><h4 style={{fontSize:13,fontWeight:850,color:'#247b7d',margin:'0 0 6px'}}>{section.title}</h4><div style={{fontSize:12,lineHeight:2.2,color:'#526361',whiteSpace:'pre-wrap'}}>{section.content.replace(/^(?:[۰-۹0-9]+[.．]\s*)?/,'')}</div></section>):<p style={{fontSize:12,lineHeight:2.2,color:'#71807f',margin:0,whiteSpace:'pre-wrap'}}>{rules?.content||'قوانین آموزشی در حال آماده‌سازی است.'}</p>}</div></article></section>
 <section id="books-section" style={{marginBottom:36,scrollMarginTop:24}}><div style={{display:'flex',alignItems:'center',justifyContent:'flex-start',gap:12,marginBottom:18}}><BookOpen size={48} strokeWidth={1.7} color="#168c91" aria-hidden="true"/><h2 style={{fontSize:21,margin:0,fontWeight:850,lineHeight:1.9}}>کتاب‌ها و منابع آموزشی</h2></div><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:14}}><select aria-label="فیلتر مقطع کتاب" value={bookLevelFilter} onChange={e=>setBookLevelFilter(e.target.value as 'ALL'|'MASTER'|'DOCTORATE')} style={{border:'1px solid #dce7e5',borderRadius:10,padding:'8px 11px',background:'#fff',color:'#526766',fontSize:12}}><option value="ALL">همه مقاطع</option><option value="MASTER">کارشناسی ارشد</option><option value="DOCTORATE">دکتری</option></select><select aria-label="فیلتر رشته کتاب" value={bookFieldFilter} onChange={e=>setBookFieldFilter(e.target.value)} style={{border:'1px solid #dce7e5',borderRadius:10,padding:'8px 11px',background:'#fff',color:'#526766',fontSize:12,maxWidth:'100%'}}><option value="ALL">همه رشته‌ها</option>{Array.from(new Set(books.map(book=>String(book.category||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'fa')).map(field=><option key={field} value={field}>{field}</option>)}</select></div>{(()=>{const visibleBooks=books.filter(book=>{const levels=String(book.academicLevel||'').split(',').map(value=>value.trim());return (bookLevelFilter==='ALL'||levels.includes(bookLevelFilter))&&(bookFieldFilter==='ALL'||String(book.category||'').trim()===bookFieldFilter)});return visibleBooks.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,250px),300px))',justifyContent:'start',alignItems:'stretch',gap:15}}>{visibleBooks.map(book=>{const original=Number(book.price||0),discount=book.discountedPrice===null||book.discountedPrice===undefined||book.discountedPrice===''?null:Number(book.discountedPrice);const hasDiscount=discount!==null&&discount<original;const price=hasDiscount?discount:original;const levels=String(book.academicLevel||'').split(',').map(value=>value.trim());return <article key={book.id} style={{...card,display:'flex',flexDirection:'column',width:'100%',maxWidth:300}}>{book.coverImage?<div style={{height:128,background:'linear-gradient(135deg,#e5f5f3,#f7fbfa)',display:'grid',placeItems:'center',color:'#168c91',overflow:'hidden'}}><img src={book.coverImage} alt={'جلد '+book.title} loading="lazy" onError={e=>{e.currentTarget.style.display='none'}} style={{width:'100%',height:'100%',objectFit:'contain',padding:5,boxSizing:'border-box'}}/></div>:<div style={{height:128,background:'linear-gradient(135deg,#e5f5f3,#f7fbfa)',display:'grid',placeItems:'center',color:'#168c91'}}><BookOpen size={32}/></div>}<div style={{padding:13}}><div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:6}}>{levels.includes('MASTER')&&<span style={{fontSize:10,color:'#168c91',fontWeight:800,background:'#e7f5f3',borderRadius:999,padding:'4px 8px'}}>کارشناسی ارشد</span>}{levels.includes('DOCTORATE')&&<span style={{fontSize:10,color:'#168c91',fontWeight:800,background:'#e7f5f3',borderRadius:999,padding:'4px 8px'}}>دکتری</span>}{book.category&&<span style={{fontSize:10,color:'#526766',fontWeight:750,background:'#f1f8f7',borderRadius:999,padding:'4px 8px'}}>{book.category}</span>}</div><h3 style={{fontSize:14,margin:'0 0 6px',lineHeight:1.8}}>{book.title}</h3>{book.description&&<p style={{fontSize:11,color:'#617270',lineHeight:1.8,margin:'0 0 9px',whiteSpace:'pre-wrap',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{book.description}</p>}<div style={{display:'grid',gap:3,margin:'8px 0 9px'}}>{hasDiscount&&<span style={{fontSize:11,color:'#879390',textDecoration:'line-through'}}>{new Intl.NumberFormat('fa-IR').format(original)} تومان</span>}<span style={{fontSize:13,fontWeight:850,color:'#247b7d'}}>{new Intl.NumberFormat('fa-IR').format(price)} تومان</span></div><p style={{fontSize:10,color:Number(book.availableQuantity)>0?'#477b65':'#a45b5b',margin:'0 0 4px'}}>{Number(book.availableQuantity)>0?'موجودی: '+new Intl.NumberFormat('fa-IR').format(Number(book.availableQuantity))+' عدد':'در حال حاضر ناموجود'}</p></div></article>})}</div>:<p style={{...card,padding:20,color:'#71807f',fontSize:12}}>{books.length?'کتابی با این فیلترها پیدا نشد.':'در حال حاضر کتاب فعالی برای نمایش ثبت نشده است.'}</p>})()}</section>
<footer style={{marginTop:35,paddingTop:17,borderTop:'1px solid #e1e9e7',fontSize:11,color:'#81908e',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><span>تمامی حقوق برای آکادمی شمسه محفوظ است.</span><button type="button" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} aria-label="بازگشت به بالای صفحه" style={{position:'fixed',right:24,bottom:24,zIndex:1000,display:'inline-flex',alignItems:'center',gap:7,border:'1px solid rgba(100,137,135,.28)',borderRadius:999,padding:'11px 16px',background:'rgba(255,255,255,.94)',backdropFilter:'blur(10px)',boxShadow:'0 6px 22px rgba(20,50,50,.14)',color:'#476d6a',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>↑ بازگشت به بالا</button></footer>
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
  const particles=Array.from({length:52},(_,i)=>({seed:i/52,phase:Math.random()*Math.PI*2,size:Math.random()*1.1+.5,speed:.06+Math.random()*.12,orbit:.24+Math.random()*.27}));
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
    const alpha=.27+.38*(.5+.5*Math.sin(a*1.4));
    ctx!.beginPath();ctx!.fillStyle='rgba(72,209,204,'+alpha+')';ctx!.shadowBlur=p.size*3.2;ctx!.shadowColor='#168c91';ctx!.arc(x,y,p.size,0,Math.PI*2);ctx!.fill();
    if(i%12===0){
     const tailA=a-.18;ctx!.beginPath();ctx!.strokeStyle='rgba(72,209,204,.14)';ctx!.lineWidth=.7;ctx!.moveTo(cx+Math.cos(tailA)*rx*p.orbit*2.15,cy+Math.sin(tailA*1.27)*ry*p.orbit*2.15);ctx!.lineTo(x,y);ctx!.stroke();
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
    .sh-particle-intro{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;background:transparent}.sh-particle-intro canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.85;animation:none}.sh-particle-intro.reduced{animation:none;background:transparent}.sh-particle-intro.reduced canvas{display:none}
    .sh-login-visual{background:#1a2021;color:#f4f7f6;position:relative;overflow:hidden;padding:38px;display:flex;flex-direction:column;direction:rtl;box-sizing:border-box}
    .sh-login-brand{display:flex;flex-direction:column;align-items:center;gap:0;align-self:flex-start;cursor:pointer;z-index:2;animation:sh-brand-arrive 1.25s cubic-bezier(.2,.75,.25,1) both!important;opacity:1;margin-top:10px}.sh-login-brand img{width:112px;height:112px;object-fit:contain;display:block;opacity:1;animation:none!important;transition:none!important;transform:none!important;filter:none!important}.sh-login-brand span{font-size:11px;color:#91b5b5;font-weight:800;white-space:nowrap;line-height:1.1;margin-top:-20px}
    .sh-login-copy{margin:auto 0;max-width:430px;z-index:2;animation:sh-copy-arrive 1.45s .35s cubic-bezier(.2,.75,.25,1) both}.sh-login-copy>span{font-size:9px;letter-spacing:2px;color:#5bbfc6;font-weight:900}.sh-login-copy h1{font-size:42px;line-height:1.2;margin:13px 0 14px;font-weight:900;letter-spacing:-1px}.sh-login-copy h1 em{color:#b9dfe0;font-style:normal}.sh-login-copy p{font-size:12px;color:#aab5b4;line-height:2;max-width:370px}.sh-login-footer{font-size:9px;color:#6f7b7b;z-index:2;animation:sh-copy-arrive 1.5s .45s cubic-bezier(.2,.75,.25,1) both}
    .sh-login-content{direction:rtl;padding:30px 7vw;display:flex;flex-direction:column;min-width:0;box-sizing:border-box;background:#f5f6f5}.sh-login-top{display:flex;justify-content:space-between;align-items:center;color:#71807f;font-size:9px}.sh-login-top button{border:0;background:none;color:#38838a;font-size:9px;font-weight:800;cursor:pointer}.sh-welcome,.sh-form,.sh-info{width:min(100%,500px);margin:auto}.sh-kicker{font-size:11px;color:#38838a;font-weight:900;margin-bottom:9px}.sh-welcome h2,.sh-form h2,.sh-info h2{font-size:29px;margin:0 0 9px;font-weight:900;letter-spacing:-.5px}.sh-welcome p,.sh-form p,.sh-info p{font-size:13px;color:#71807f;line-height:1.9;margin:0 0 24px}.sh-entry-list{display:flex;flex-direction:column;gap:8px}.sh-entry{width:100%;box-sizing:border-box;border:0;border-radius:0;background:transparent;color:#182022;padding:17px 4px;display:flex;align-items:center;gap:14px;text-align:right;cursor:pointer;transition:color .22s ease;direction:rtl;position:relative;isolation:isolate;text-decoration:none;box-shadow:none;font:inherit;line-height:1.5}.sh-entry::after{content:'';position:absolute;right:48px;bottom:5px;width:calc(100% - 76px);height:1px;background:linear-gradient(to left,rgba(22,140,145,0),#168c91 25%,#48d1cc 75%,rgba(72,209,204,0));transform:scaleX(0);transform-origin:right;opacity:0;transition:transform .35s ease,opacity .35s ease}.sh-entry:hover,.sh-entry:focus-visible{color:#168c91;transform:none}.sh-entry:hover::after,.sh-entry:focus-visible::after{transform:scaleX(.72);opacity:1}.sh-entry:hover strong,.sh-entry:focus-visible strong,.sh-entry:hover .sh-entry-icon,.sh-entry:focus-visible .sh-entry-icon,.sh-entry:hover>svg,.sh-entry:focus-visible>svg{color:#168c91}.sh-entry:hover small,.sh-entry:focus-visible small{color:#4b7778}.sh-entry:focus-visible{outline:2px solid #168c91;outline-offset:4px}@media(prefers-reduced-motion:reduce){.sh-entry,.sh-entry::after{transition:none}}.sh-entry.primary{background:transparent;border:0;color:#182022}.sh-preregister{background:transparent;border:0;color:#182022}.sh-preregister .sh-entry-icon{background:transparent;color:#168c91}.sh-entry-icon{width:32px;height:32px;border-radius:0;background:transparent;color:#168c91;display:grid;place-items:center;flex:none}.sh-entry.primary .sh-entry-icon{background:transparent;color:#168c91}.sh-entry .sh-entry-icon,.sh-entry.sh-preregister .sh-entry-icon{background:transparent;color:#168c91}.sh-entry.primary,.sh-entry.sh-preregister{background:transparent;border:0;color:#182022;box-shadow:none}.sh-entry>span:nth-child(2){flex:1;display:flex;flex-direction:column;gap:2px}.sh-entry strong{font-size:16px;font-weight:650}.sh-entry small{font-size:12px;color:#71807f}.sh-entry.primary small{color:#71807f}.sh-entry>svg{display:none}.sh-entry.primary>svg{display:none}
    .sh-form label{display:block;font-size:10px;font-weight:800;margin-bottom:12px}.sh-input{height:45px;margin-top:6px;border:1px solid #dfe7e5;background:#fff;border-radius:11px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#778584}.sh-input input{width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:11px;color:#182022}.sh-submit{width:100%;margin-top:5px;border:0;background:#182022;color:#fff;border-radius:11px;padding:12px;display:flex;justify-content:center;align-items:center;gap:7px;font-size:10px;font-weight:900;cursor:pointer}.sh-back{border:0;background:none;color:#38838a;font-size:9px;font-weight:800;display:flex;align-items:center;gap:4px;padding:0;margin-bottom:18px;cursor:pointer}.sh-error{padding:9px 10px;background:#fff1f1;color:#b5414a;border:1px solid #f0d2d4;border-radius:9px;font-size:9px;margin-bottom:12px}.sh-info p{white-space:pre-line}.sh-social{margin-top:auto;padding-top:25px;text-align:center}.sh-social>div{display:flex;justify-content:center;gap:7px}.sh-social a{width:31px;height:31px;border:1px solid #dfe7e5;background:#fff;border-radius:50%;display:grid;place-items:center;color:#637371}.sh-social small{display:block;color:#8a9694;font-size:8px;margin-top:9px}
    @keyframes sh-brand-arrive{from{transform:translateX(24px)}to{transform:translateX(0)}}@keyframes sh-copy-arrive{from{opacity:0;transform:translateX(38px)}to{opacity:1;transform:translateX(0)}}@media(prefers-reduced-motion:reduce){.sh-login-brand,.sh-login-brand img,.sh-login-copy,.sh-login-footer,.sh-particle-intro{animation:none!important;opacity:1!important;transform:none!important}}@media(max-width:850px){.sh-login{height:100vh;height:100dvh;min-height:0;display:grid;grid-template-columns:1fr;grid-template-rows:30% 70%;overflow:hidden}.sh-login-visual{min-height:0;height:100%;padding:12px 22px;justify-content:center}.sh-login-brand{margin-top:0;position:absolute;top:8px;left:18px;align-self:auto}.sh-login-brand img{width:56px;height:56px}.sh-login-brand span{font-size:8px;margin-top:-10px}.sh-login-copy{margin:auto 0;max-width:100%;padding-top:34px}.sh-login-copy>span{font-size:8px}.sh-login-copy h1{font-size:clamp(21px,3.8vw,30px);margin:5px 0}.sh-login-copy p{font-size:10px;line-height:1.5;margin:4px 0 0}.sh-login-footer{display:none}.sh-login-content{height:100%;min-height:0;padding:12px 24px;overflow:hidden}.sh-login-top{margin-bottom:4px}.sh-welcome,.sh-form,.sh-info{width:min(100%,500px)}.sh-welcome h2,.sh-form h2,.sh-info h2{font-size:clamp(21px,3vw,27px)}.sh-welcome p,.sh-form p,.sh-info p{font-size:11px;line-height:1.5;margin-bottom:10px}.sh-entry-list{gap:0}.sh-entry{padding:9px 3px;gap:10px}.sh-entry-icon{width:26px;height:26px}.sh-entry strong{font-size:14px}.sh-entry small{font-size:10px}.sh-entry::after{bottom:2px}.sh-social{padding-top:8px}.sh-social a{width:25px;height:25px}.sh-social small{font-size:7px;margin-top:4px}}
    @media(max-width:520px){.sh-login{grid-template-rows:26% 74%}.sh-login-visual{padding:8px 16px}.sh-login-brand{top:4px;left:12px}.sh-login-brand img{width:42px;height:42px}.sh-login-brand span{font-size:7px;margin-top:-8px}.sh-login-copy{padding-top:25px}.sh-login-copy h1{font-size:clamp(19px,5.5vw,25px);line-height:1.12}.sh-login-copy p{font-size:9px}.sh-login-content{padding:9px 16px}.sh-welcome h2,.sh-form h2,.sh-info h2{font-size:21px}.sh-welcome p,.sh-form p,.sh-info p{font-size:10px;margin-bottom:7px}.sh-entry{padding:7px 1px;gap:8px}.sh-entry strong{font-size:13px}.sh-entry small{font-size:9px}.sh-entry-icon{width:24px;height:24px}.sh-social{padding-top:5px}.sh-social a{width:23px;height:23px}.sh-social small{font-size:6px}}
    @media(max-height:700px) and (max-width:850px){.sh-login{grid-template-rows:24% 76%}.sh-login-copy h1{font-size:20px}.sh-login-copy p{display:none}.sh-welcome p,.sh-form p,.sh-info p{margin-bottom:5px}.sh-entry{padding:5px 1px}.sh-entry small{font-size:9px}.sh-social{padding-top:3px}.sh-social small{display:none}}
   `}</style>
 </div>;
};
