import { useEffect, useState } from 'react';
import { CalendarClock, Wallet, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';

type Installment = {
  id: string;
  sequence: number;
  amount: number;
  paid: number;
  balance: number;
  dueDate: string;
  status: string;
};
type Registration = { id: string; installments: Installment[] };

const money = (value: number) => new Intl.NumberFormat('fa-IR').format(Math.round(value)) + ' تومان';
const dateText = (value: string) => new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tehran',
}).format(new Date(value));

export function StudentNextInstallmentSummary({ onOpenFinance }: { onOpenFinance: () => void }) {
  const { theme } = useStore();
  const dark = theme === 'dark';
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/student/registrations', { credentials: 'include' })
      .then(async response => {
        if (!response.ok) throw new Error('finance-summary-unavailable');
        return response.json();
      })
      .then((data: Registration[]) => {
        if (!cancelled) setRegistrations(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const installments = registrations.flatMap(reg => reg.installments || [])
    .filter(inst => Number(inst.balance) > 0 && inst.status !== 'PAID')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      || a.sequence - b.sequence);
  const next = installments[0];
  const overdue = next ? new Date(next.dueDate).getTime() < new Date().setHours(0, 0, 0, 0) || next.status === 'OVERDUE' : false;
  const card = {
    background: dark ? '#1D1B1B' : '#F7F1E8',
    border: '1px solid ' + (dark ? 'rgba(238,229,218,.13)' : 'rgba(38,36,36,.14)'),
    borderRadius: 12,
    padding: 16,
    color: dark ? '#EEE5DA' : '#262424',
    minWidth: 0,
  } as const;
  const muted = dark ? '#B9B0A6' : '#655D55';
  const accent = dark ? '#48D1CC' : '#008080';

  return <section style={card} aria-label="سررسید قسط بعدی">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
      <div>
        <div style={{ color: accent, fontSize: 10, fontWeight: 850, marginBottom: 4 }}>وضعیت مالی</div>
        <h3 style={{ color: 'inherit', fontSize: 16, fontWeight: 850, margin: 0 }}>قسط بعدی</h3>
      </div>
      <span style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 10, background: dark ? 'rgba(72,209,204,.13)' : 'rgba(0,128,128,.10)', color: accent }}>
        <CalendarClock size={17} />
      </span>
    </div>
    {loading ? <p style={{ color: muted, fontSize: 11, margin: 0 }}>در حال دریافت اطلاعات قسط…</p>
      : failed ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: muted, fontSize: 11, lineHeight: 1.8 }}><AlertCircle size={16} /> اطلاعات قسط در حال حاضر در دسترس نیست.</div>
      : !next ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: muted, fontSize: 11, lineHeight: 1.8 }}><CheckCircle2 size={17} color="#1d9a72" /> در حال حاضر قسط پرداخت‌نشده‌ای ندارید.</div>
      : <>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 19, fontWeight: 900, color: 'inherit' }}>{money(next.balance)}</strong>
          <span style={{ fontSize: 10, color: overdue ? '#dc6863' : muted, fontWeight: 800 }}>{overdue ? 'سررسید گذشته' : 'مانده قسط ' + new Intl.NumberFormat('fa-IR').format(next.sequence)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: overdue ? '#dc6863' : muted, fontSize: 11, marginTop: 9 }}>
          <CalendarClock size={14} />
          <span>تاریخ سررسید: {dateText(next.dueDate)}</span>
        </div>
      </>}
    <button type="button" onClick={onOpenFinance} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 13, padding: '9px 11px', border: '1px solid ' + (dark ? 'rgba(238,229,218,.13)' : 'rgba(38,36,36,.14)'), borderRadius: 9, background: dark ? '#302D2D' : '#E5D9CB', color: 'inherit', fontFamily: 'inherit', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
      <Wallet size={14} /> مشاهده وضعیت مالی <ArrowLeft size={14} />
    </button>
  </section>;
}
