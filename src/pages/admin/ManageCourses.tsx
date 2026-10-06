import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';

type Course = {
  id:string; title:string; professor:string; level:string|null; description:string|null;
  term:string|null; category:string|null; price:string|number|null; coverImage:string|null;
  status:'DRAFT'|'ACTIVE'|'ARCHIVED'; _count?:{enrollments:number;sessions:number;files:number};
};
const emptyForm={title:'',professor:'',level:'',description:'',term:'',category:'',price:'',coverImage:'',status:'DRAFT' as Course['status']};

export const ManageCourses:React.FC=()=>{
 const [courses,setCourses]=useState<Course[]>([]); const [form,setForm]=useState(emptyForm);
 const [editingId,setEditingId]=useState<string|null>(null); const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false); const [error,setError]=useState(''); const [success,setSuccess]=useState('');

 const loadCourses=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/courses',{credentials:'include'});if(!r.ok)throw new Error('دریافت دوره‌ها انجام نشد.');setCourses(await r.json());}catch(e){setError(e instanceof Error?e.message:'دریافت دوره‌ها انجام نشد.')}finally{setLoading(false)}};
 useEffect(()=>{void loadCourses()},[]);

 const saveCourse=async(e:React.FormEvent)=>{e.preventDefault();if(!form.title.trim()||!form.professor.trim()||saving)return;setSaving(true);setError('');setSuccess('');
  try{const body={...form,title:form.title.trim(),professor:form.professor.trim(),price:form.price===''?undefined:Number(form.price)};
   const url=editingId?'/api/admin/courses/'+editingId:'/api/admin/courses';
   const r=await fetch(url,{method:editingId?'PATCH':'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const data=await r.json().catch(()=>null);if(!r.ok)throw new Error(data?.message||'ذخیره دوره انجام نشد.');
   setForm(emptyForm);setEditingId(null);setSuccess(editingId?'دوره ویرایش شد.':'دوره ایجاد شد.');await loadCourses();
  }catch(e){setError(e instanceof Error?e.message:'ذخیره دوره انجام نشد.')}finally{setSaving(false)}};

 const editCourse=(c:Course)=>{setEditingId(c.id);setForm({title:c.title,professor:c.professor,level:c.level||'',description:c.description||'',term:c.term||'',category:c.category||'',price:c.price==null?'':String(c.price),coverImage:c.coverImage||'',status:c.status});window.scrollTo({top:0,behavior:'smooth'})};
 const deleteCourse=async(id:string)=>{if(!confirm('آیا از حذف این دوره اطمینان دارید؟'))return;try{const r=await fetch('/api/admin/courses/'+id,{method:'DELETE',credentials:'include'});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||'حذف دوره انجام نشد.');await loadCourses()}catch(e){setError(e instanceof Error?e.message:'حذف دوره انجام نشد.')}};

 const input:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#0e0e11',color:'#fff',border:'1px solid rgba(255,255,255,.1)',padding:'11px 13px',borderRadius:9,fontSize:12,outline:'none'};
 return <div style={{display:'flex',flexDirection:'column',gap:24,width:'100%',boxSizing:'border-box',direction:'rtl'}}>
  <div style={{background:'linear-gradient(135deg,rgba(109,0,26,.2),rgba(10,10,10,.8))',border:'1px solid rgba(109,0,26,.4)',padding:'24px 32px',borderRadius:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
   <div><h2 style={{fontSize:20,fontWeight:900,color:'#fff',margin:'0 0 6px',display:'flex',alignItems:'center',gap:10}}><BookOpen size={20} color="#ff3366"/> مدیریت دوره‌ها</h2><p style={{fontSize:12,color:'#94a3b8',margin:0}}>مدیریت مستقیم دوره‌های ذخیره‌شده در PostgreSQL</p></div>
   <button onClick={()=>void loadCourses()} style={{background:'rgba(255,255,255,.06)',color:'#fff',border:'1px solid rgba(255,255,255,.1)',padding:9,borderRadius:9,cursor:'pointer'}}><RefreshCw size={14}/></button>
  </div>
  {error&&<div style={{background:'rgba(239,68,68,.1)',color:'#f87171',padding:12,borderRadius:10,fontSize:12}}>{error}</div>}
  {success&&<div style={{background:'rgba(52,211,153,.1)',color:'#34d399',padding:12,borderRadius:10,fontSize:12}}>{success}</div>}
  <form onSubmit={saveCourse} style={{background:'rgba(14,14,17,.75)',border:'1px solid rgba(255,255,255,.08)',padding:28,borderRadius:24,display:'flex',flexDirection:'column',gap:15}}>
   <h3 style={{color:'#fff',fontSize:15,margin:0,display:'flex',alignItems:'center',gap:7}}><Plus size={17} color="#ff3366"/>{editingId?'ویرایش دوره':'ایجاد دوره جدید'}</h3>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12}}>
    <input required placeholder="عنوان دوره" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={input}/>
    <input required placeholder="نام استاد" value={form.professor} onChange={e=>setForm({...form,professor:e.target.value})} style={input}/>
    <input placeholder="مقطع تحصیلی" value={form.level} onChange={e=>setForm({...form,level:e.target.value})} style={input}/>
    <input placeholder="ترم" value={form.term} onChange={e=>setForm({...form,term:e.target.value})} style={input}/>
    <input placeholder="دسته‌بندی" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={input}/>
    <input type="number" min="0" placeholder="قیمت (تومان)" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} style={input}/>
    <input placeholder="آدرس تصویر جلد" value={form.coverImage} onChange={e=>setForm({...form,coverImage:e.target.value})} style={input}/>
    <select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Course['status']})} style={input}><option value="DRAFT">پیش‌نویس</option><option value="ACTIVE">فعال</option><option value="ARCHIVED">بایگانی</option></select>
   </div>
   <textarea placeholder="توضیحات دوره" rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={{...input,resize:'vertical'}}/>
   <div style={{display:'flex',gap:8}}><button disabled={saving} type="submit" style={{background:'#6D001A',color:'#fff',border:0,padding:'11px 18px',borderRadius:9,fontWeight:800,cursor:'pointer'}}>{saving?'در حال ذخیره...':editingId?'ذخیره تغییرات':'ثبت دوره'}</button>{editingId&&<button type="button" onClick={()=>{setEditingId(null);setForm(emptyForm)}} style={{background:'transparent',color:'#94a3b8',border:'1px solid #333',padding:'11px 18px',borderRadius:9,cursor:'pointer'}}>انصراف</button>}</div>
  </form>
  <div style={{background:'rgba(14,14,17,.75)',border:'1px solid rgba(255,255,255,.08)',padding:24,borderRadius:24}}>
   <h3 style={{color:'#fff',fontSize:15,margin:'0 0 16px'}}>دوره‌های ثبت‌شده ({courses.length})</h3>
   {loading?<p style={{color:'#94a3b8',fontSize:12}}>در حال دریافت...</p>:courses.length===0?<p style={{color:'#666',fontSize:12,textAlign:'center',padding:20}}>هنوز دوره‌ای ثبت نشده است.</p>:
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:14}}>{courses.map(c=><div key={c.id} style={{background:'#141419',border:'1px solid #222228',padding:18,borderRadius:14}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10}}><strong style={{color:'#fff',fontSize:13}}>{c.title}</strong><span style={{color:c.status==='ACTIVE'?'#34d399':'#fbbf24',fontSize:9}}>{c.status}</span></div>
    <p style={{color:'#94a3b8',fontSize:11}}>استاد: {c.professor}</p><div style={{color:'#64748b',fontSize:10}}>هنرجو: {c._count?.enrollments??0} · جلسه: {c._count?.sessions??0} · فایل: {c._count?.files??0}</div>
    <div style={{display:'flex',gap:6,marginTop:12}}><button type="button" onClick={()=>editCourse(c)} style={{background:'rgba(56,189,248,.1)',color:'#38bdf8',border:'1px solid rgba(56,189,248,.2)',padding:'6px 9px',borderRadius:7,cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',gap:4}}><Pencil size={12}/> ویرایش</button><button type="button" onClick={()=>void deleteCourse(c.id)} style={{background:'rgba(239,68,68,.1)',color:'#f87171',border:'1px solid rgba(239,68,68,.2)',padding:'6px 9px',borderRadius:7,cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',gap:4}}><Trash2 size={12}/> حذف</button></div>
   </div>)}</div>}
  </div>
 </div>;
};
