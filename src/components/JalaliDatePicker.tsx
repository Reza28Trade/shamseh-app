import { useMemo, useState } from 'react';
import { getTehranTodayJalali, jalaliMonthLength, toGregorian } from '../utils/jalali';

type JalaliDatePickerProps = { value: string; onChange: (value: string) => void; style?: React.CSSProperties };
const months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const weekdays = ['ش','ی','د','س','چ','پ','ج'];
const fa = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
function parseGregorian(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [gy, gm, gd] = value.split('-').map(Number);
  const date = new Date(Date.UTC(gy, gm - 1, gd));
  if (date.getUTCFullYear() !== gy || date.getUTCMonth() + 1 !== gm || date.getUTCDate() !== gd) return null;
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date);
  return { jy: Number(parts.find(p=>p.type==='year')?.value), jm: Number(parts.find(p=>p.type==='month')?.value), jd: Number(parts.find(p=>p.type==='day')?.value) };
}
function isoDate(gy:number,gm:number,gd:number) { return [gy, String(gm).padStart(2,'0'), String(gd).padStart(2,'0')].join('-'); }
export function JalaliDatePicker({ value, onChange, style }: JalaliDatePickerProps) {
  const today = getTehranTodayJalali();
  const selected = parseGregorian(value);
  const [open,setOpen] = useState(false);
  const [year,setYear] = useState(selected?.jy ?? today.jy);
  const [month,setMonth] = useState(selected?.jm ?? today.jm);
  const monthDays = useMemo(() => {
    const first = toGregorian(year,month,1);
    const weekday = new Date(Date.UTC(first.gy,first.gm-1,first.gd)).getUTCDay();
    const offset = (weekday + 1) % 7;
    return [...Array(offset).fill(null), ...Array.from({length:jalaliMonthLength(year,month)},(_,i)=>i+1)];
  },[year,month]);
  const move = (delta:number) => {
    let nextMonth=month+delta, nextYear=year;
    if(nextMonth<1){nextMonth=12;nextYear--;}
    if(nextMonth>12){nextMonth=1;nextYear++;}
    setMonth(nextMonth);setYear(nextYear);
  };
  const selectDay = (day:number) => {
    const g=toGregorian(year,month,day);
    onChange(isoDate(g.gy,g.gm,g.gd));setOpen(false);
  };
  return <div style={{position:'relative',minWidth:0}}>
    <button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} style={{...style,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,width:'100%',textAlign:'right',cursor:'pointer'}}>
      <span>{selected ? `${fa(selected.jy)}/${fa(selected.jm).padStart(2,'۰')}/${fa(selected.jd).padStart(2,'۰')}` : 'انتخاب تاریخ شمسی'}</span><span aria-hidden="true">▦</span>
    </button>
    {open&&<div style={{position:'absolute',zIndex:1100,top:'calc(100% + 6px)',right:0,width:280,maxWidth:'90vw',padding:12,border:'1px solid var(--admin-border)',borderRadius:12,background:'var(--admin-card)',boxShadow:'0 12px 35px rgba(0,0,0,.18)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6,marginBottom:10}}>
        <button type="button" aria-label="ماه قبل" onClick={()=>move(-1)} style={{...style,cursor:'pointer'}}>‹</button><strong style={{fontSize:12}}>{months[month-1]} {fa(year)}</strong><button type="button" aria-label="ماه بعد" onClick={()=>move(1)} style={{...style,cursor:'pointer'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:3}}>
        {weekdays.map((day,i)=><div key={day+i} style={{textAlign:'center',padding:'5px 0',fontSize:10,color:'var(--admin-sub)'}}>{day}</div>)}
        {monthDays.map((day,i)=>day===null?<span key={'blank'+i}/>:<button type="button" key={day} onClick={()=>selectDay(day)} style={{padding:'7px 0',borderRadius:7,border:'1px solid '+(selected?.jy===year&&selected?.jm===month&&selected?.jd===day?'var(--admin-accent)':'transparent'),background:selected?.jy===year&&selected?.jm===month&&selected?.jd===day?'var(--admin-accent)':'var(--admin-inner)',color:selected?.jy===year&&selected?.jm===month&&selected?.jd===day?'white':'var(--admin-text)',font:'inherit',fontSize:11,cursor:'pointer'}}>{fa(day)}</button>)}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',gap:8,marginTop:10}}><button type="button" onClick={()=>{const g=toGregorian(today.jy,today.jm,today.jd);onChange(isoDate(g.gy,g.gm,g.gd));setYear(today.jy);setMonth(today.jm);setOpen(false);}} style={{...style,cursor:'pointer'}}>امروز</button><button type="button" onClick={()=>setOpen(false)} style={{...style,cursor:'pointer'}}>بستن</button></div>
    </div>}
  </div>;
}
