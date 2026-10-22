import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Admin } from '../../types';
import {
  Activity, ArrowLeft, Bell, BookOpen, CalendarClock, CreditCard,
  FileCheck2, RefreshCw, Users, Wallet, MessageSquare,
} from 'lucide-react';
type CourseRow = { id: string; title: string; professor?: string | null; status?: string | null; startDate?: string | null };
type StudentRow = { id: string; fullName?: string; nationalId?: string; isArchived?: boolean };
type PaymentRow = { id: string; purpose?: string; status: string; claimedAmount?: number; approvedAmount?: number | null; createdAt?: string; paymentDate?: string | null; trackingCode?: string | null };
type RegistrationRow = { id: string; applicantFullName: string; status: string; createdAt?: string; finalTuition?: number; balance?: number; payments?: PaymentRow[]; courses?: Array<{ courseTitleSnapshot: string }> };
type RefundRow = { id: string; status: string; amountRequested?: number; amountReserved?: number | null; requestedAt?: string; student?: { fullName?: string } };
type ExamRow = { id: string; title: string; examDate?: string; status?: string };
type TicketRow = { id: string; subject: string; status: string; updatedAt?: string; student?: { fullName?: string } };
type CounselorRow = { id: string; displayName?: string; isActive?: boolean; user?: { status?: string } };
type ConversationRow = { id: string; updatedAt?: string; student?: { fullName?: string }; counselor?: { displayName?: string }; _count?: { messages?: number } };
type AuditRow = { id: string; action: string; entityType?: string; performedBy?: string; timestamp?: string; details?: unknown };

type DashboardData = {
  courses: CourseRow[] | null;
  students: StudentRow[] | null;
  registrations: RegistrationRow[] | null;
  refunds: RefundRow[] | null;
  exams: ExamRow[] | null;
  tickets: TicketRow[] | null;
  counselors: CounselorRow[] | null;
  conversations: ConversationRow[] | null;
  logs: AuditRow[] | null;
};
const emptyData: DashboardData = { courses: null, students: null, registrations: null, refunds: null, exams: null, tickets: null, counselors: null, conversations: null, logs: null };
type DashboardTab = 'dashboard' | 'courses' | 'students' | 'admins' | 'logs' | 'messages' | 'notifications' | 'rules' | 'offlineRequests' | 'mockExams' | 'counseling' | 'finance' | 'registrations';

interface AdminDashboardProps {
  adminName?: string;
  admin?: Admin;
  onNavigate: (tab: DashboardTab) => void;
}

const numberFa = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('fa-IR').format(value);
const dateFa = (value?: string | null) => {
  if (!value) return 'تاریخ ثبت نشده';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin, onNavigate }) => {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState('');

  const isAllowed = useCallback((permission: string) => admin?.role === 'super_admin' || Boolean(admin?.permissions?.includes(permission)), [admin?.role, admin?.permissions]);
  const loadList = useCallback(async <T,>(url: string, allowed: boolean): Promise<T[] | null> => {
    if (!allowed) return null;
    try {
      const response = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!response.ok) return null;
      const payload: unknown = await response.json();
      return Array.isArray(payload) ? payload as T[] : null;
    } catch {
      return null;
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setRefreshError('');
    try {
      const [courses, students, registrations, refunds, exams, tickets] = await Promise.all([
        loadList<CourseRow>('/api/courses', isAllowed('courses')),
        loadList<StudentRow>('/api/admin/students', isAllowed('students')),
        loadList<RegistrationRow>('/api/admin/registrations?status=ALL', isAllowed('finance')),
        loadList<RefundRow>('/api/admin/refunds?status=ALL', isAllowed('finance')),
        loadList<ExamRow>('/api/admin/mock-exams', isAllowed('mockExams')),
        loadList<TicketRow>('/api/admin/support/tickets', admin?.role === 'super_admin'),
      ]);
      setData({ courses, students, registrations, refunds, exams, tickets, counselors: null, conversations: null, logs: null });
      setLastUpdated(new Date().toISOString());
    } catch {
      setRefreshError('بروزرسانی داشبورد کامل نشد. بخش‌هایی که داده معتبر دریافت نکرده‌اند با خط تیره مشخص می‌شوند.');
    } finally {
      setLoading(false);
    }
  }, [admin?.role, isAllowed, loadList]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const activeCourses = useMemo(() => data.courses?.filter(course => String(course.status || '').toUpperCase() !== 'ARCHIVED') ?? null, [data.courses]);
  const pendingRegistrations = data.registrations?.filter(item => item.status === 'PENDING_REVIEW' || item.status === 'NEEDS_CORRECTION') ?? null;
  const pendingPayments = data.registrations?.flatMap(item => item.payments || []).filter(payment => payment.status === 'PENDING') ?? null;
  const openRefunds = data.refunds?.filter(item => item.status === 'REQUESTED' || item.status === 'RESERVED') ?? null;
  const openTickets = data.tickets?.filter(item => item.status === 'OPEN') ?? null;
  const upcomingExams = data.exams?.filter(exam => {
    if (!exam.examDate || ['COMPLETED', 'CANCELLED'].includes(String(exam.status || '').toUpperCase())) return false;
    const timestamp = new Date(exam.examDate).getTime();
    return Number.isFinite(timestamp) && timestamp >= Date.now();
  }) ?? null;

  const statCards = [
    { label: 'دوره‌های فعال', value: activeCourses ? numberFa(activeCourses.length) : '—', note: 'وضعیت فعلی دوره‌ها', icon: BookOpen, tab: 'courses' as const, permission: 'courses' },
    { label: 'هنرجویان ثبت‌شده', value: data.students ? numberFa(data.students.length) : '—', note: 'تعداد هنرجویان', icon: Users, tab: 'students' as const, permission: 'students' },
  ].filter(item => isAllowed(item.permission));

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-tools">
        <span className="admin-dashboard-updated"><Activity size={13} /><span>{lastUpdated ? 'آخرین بروزرسانی: ' + dateFa(lastUpdated) : loading ? 'در حال دریافت اطلاعات سامانه…' : 'زمان بروزرسانی ثبت نشده است'}</span></span>
        <button className="admin-refresh-button" onClick={() => void loadDashboard()} disabled={loading}><RefreshCw size={14} className={loading ? 'admin-spinning' : ''} />{loading ? 'در حال بروزرسانی' : 'بروزرسانی اطلاعات'}</button>
      </div>

      {refreshError && <div className="admin-dashboard-notice" role="status">{refreshError}</div>}

      <section className="admin-stat-grid" aria-label="آمار کلی سامانه">
        {statCards.map(item => {
          const Icon = item.icon;
          return <button key={item.label} className="admin-stat" onClick={() => onNavigate(item.tab)}>
            <span className="admin-stat-icon"><Icon size={18} /></span>
            <span className="admin-stat-copy"><strong>{loading && item.value === '—' ? '…' : item.value}</strong><span>{item.label}</span><small>{item.note}</small></span>
            <ArrowLeft size={15} className="admin-stat-arrow" />
          </button>;
        })}
      </section>

      <div className="admin-dashboard-priority-grid">
      <section className="admin-action-center" aria-label="اقدامات نیازمند رسیدگی">
        <div className="admin-panel-heading">
          <div><span>اولویت‌های مدیریتی</span><h2>نیازمند اقدام</h2></div>
          <span className="admin-action-summary">{numberFa(
            (pendingRegistrations?.length || 0) +
            (pendingPayments?.length || 0) +
            (openRefunds?.length || 0) +
            (admin?.role === 'super_admin' ? (openTickets?.length || 0) : 0)
          )} مورد</span>
        </div>
        <div className="admin-action-list">
          {isAllowed('finance') && pendingRegistrations !== null && pendingRegistrations.length > 0 &&
            <button className="admin-action-row" onClick={() => onNavigate('registrations')}>
              <span className="admin-action-icon"><FileCheck2 size={18}/></span>
              <span className="admin-action-copy"><strong>ثبت‌نام‌های نیازمند بررسی</strong><small>بررسی درخواست‌های جدید یا اصلاح‌شده</small></span>
              <b>{numberFa(pendingRegistrations.length)}</b><ArrowLeft size={15}/>
            </button>}
          {isAllowed('finance') && pendingPayments !== null && pendingPayments.length > 0 &&
            <button className="admin-action-row" onClick={() => onNavigate('registrations')}>
              <span className="admin-action-icon amber"><CreditCard size={18}/></span>
              <span className="admin-action-copy"><strong>رسیدهای پرداخت در انتظار تأیید</strong><small>بررسی رسید و ثبت نتیجهٔ مالی</small></span>
              <b>{numberFa(pendingPayments.length)}</b><ArrowLeft size={15}/>
            </button>}
          {isAllowed('finance') && openRefunds !== null && openRefunds.length > 0 &&
            <button className="admin-action-row" onClick={() => onNavigate('registrations')}>
              <span className="admin-action-icon amber"><Wallet size={18}/></span>
              <span className="admin-action-copy"><strong>درخواست‌های بازپرداخت</strong><small>درخواست‌هایی که هنوز تعیین تکلیف نشده‌اند</small></span>
              <b>{numberFa(openRefunds.length)}</b><ArrowLeft size={15}/>
            </button>}
          {admin?.role === 'super_admin' && openTickets !== null && openTickets.length > 0 &&
            <button className="admin-action-row" onClick={() => onNavigate('messages')}>
              <span className="admin-action-icon"><MessageSquare size={18}/></span>
              <span className="admin-action-copy"><strong>تیکت‌های باز هنرجویان</strong><small>گفتگوهایی که هنوز بسته نشده‌اند</small></span>
              <b>{numberFa(openTickets.length)}</b><ArrowLeft size={15}/>
            </button>}
          {!loading &&
            (pendingRegistrations?.length || 0) === 0 &&
            (pendingPayments?.length || 0) === 0 &&
            (openRefunds?.length || 0) === 0 &&
            (admin?.role !== 'super_admin' || (openTickets?.length || 0) === 0) &&
            <div className="admin-action-empty"><Bell size={18}/><span><strong>مورد فوری برای رسیدگی وجود ندارد</strong><small>در حال حاضر اقدامی در انتظار شما نیست.</small></span></div>}
          {loading && <div className="admin-action-empty">در حال بررسی موارد نیازمند اقدام…</div>}
        </div>
      </section>
      {isAllowed('mockExams') && <section className="admin-panel-card admin-upcoming-panel">
        <div className="admin-panel-heading"><div><span>برنامه‌ریزی</span><h2>آزمون‌های پیش‌رو</h2></div><button onClick={() => onNavigate('mockExams')}>مدیریت آزمون‌ها <ArrowLeft size={13}/></button></div>
        {upcomingExams === null ? <div className="admin-empty">اطلاعات آزمون‌ها در دسترس نیست.</div> :
          upcomingExams.length === 0 ? <div className="admin-empty">آزمون زمان‌بندی‌شده‌ای در آینده وجود ندارد.</div> :
          <div className="admin-upcoming-list">{[...upcomingExams].sort((a,b)=>new Date(a.examDate || 0).getTime()-new Date(b.examDate || 0).getTime()).slice(0,3).map(exam =>
            <button key={exam.id} className="admin-upcoming-row" onClick={() => onNavigate('mockExams')}>
              <span className="admin-upcoming-icon"><CalendarClock size={17}/></span>
              <span><strong>{exam.title}</strong><small>{dateFa(exam.examDate)}</small></span><ArrowLeft size={14}/>
            </button>)}</div>}
      </section>}
      </div>

      <style>{`
        .admin-page-content:has(> .admin-dashboard-page){width:100%;max-width:none;margin:0}
        .admin-dashboard-page{width:100%;max-width:none;margin:0;padding:0;box-sizing:border-box;display:flex;flex-direction:column;gap:16px;color:var(--admin-text);font-family:Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif}
        .admin-dashboard-page *{box-sizing:border-box}
        .admin-dashboard-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:30px}
        .admin-dashboard-updated{display:flex;align-items:center;gap:6px;font-size:9px;color:var(--admin-sub)}
        .admin-dashboard-updated svg{color:var(--admin-accent);flex:none}
        .admin-refresh-button{display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--admin-brand-border);border-radius:10px;padding:8px 10px;background:var(--admin-accent-soft);color:var(--admin-text);font-size:10px;font-weight:850;white-space:nowrap;cursor:pointer}
        .admin-refresh-button:disabled{opacity:.6;cursor:wait}
        .admin-spinning{animation:admin-spin 1s linear infinite}
        @keyframes admin-spin{to{transform:rotate(360deg)}}
        .admin-dashboard-notice{border:1px solid #c38b37;background:rgba(195,139,55,.09);color:var(--admin-text);border-radius:12px;padding:10px 13px;font-size:11px;line-height:1.8}
        .admin-stat-grid{position:relative;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%;min-width:0;padding:0!important;margin:0!important;background:transparent!important;background-color:transparent!important;background-image:none!important;border:0!important;border-top:0!important;border-radius:0!important;outline:0!important;box-shadow:none!important;filter:none!important}
        .admin-stat-grid::before,.admin-stat-grid::after{display:none!important;content:none!important;background:none!important;background-image:none!important;border:0!important;box-shadow:none!important}
        .admin-dashboard-page > section.admin-stat-grid{
          display:grid!important;
          position:static!important;
          width:100%!important;
          max-width:none!important;
          min-width:0!important;
          margin:0!important;
          padding:0!important;
          background:transparent!important;
          background-color:transparent!important;
          background-image:none!important;
          border:0!important;
          border-style:none!important;
          border-width:0!important;
          border-color:transparent!important;
          outline:0!important;
          border-radius:0!important;
          box-shadow:none!important;
          filter:none!important;
          -webkit-appearance:none!important;
          appearance:none!important;
        }
        .admin-dashboard-page > section.admin-stat-grid::before,
        .admin-dashboard-page > section.admin-stat-grid::after{
          display:none!important;
          content:none!important;
          position:absolute!important;
          width:0!important;
          height:0!important;
          background:transparent!important;
          background-image:none!important;
          border:0!important;
          outline:0!important;
          box-shadow:none!important;
        }
        .admin-stat{position:relative;min-width:0;border:1px solid var(--admin-border)!important;border-top:1px solid var(--admin-border)!important;background:var(--admin-card)!important;background-image:none!important;color:var(--admin-text);border-radius:14px;padding:15px 13px;display:flex;align-items:center;gap:10px;text-align:right;cursor:pointer;transition:transform .18s,border-color .18s;box-shadow:var(--admin-shadow)!important}
        .admin-stat::before,.admin-stat::after{display:none!important;content:none!important;background:none!important;background-image:none!important;border:0!important;box-shadow:none!important}
        .admin-stat:hover{transform:translateY(-2px);border-color:var(--admin-accent)}
        .admin-stat-icon{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;color:var(--admin-accent);background:var(--admin-accent-soft);flex:none}
        .admin-stat-copy{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
        .admin-stat-copy strong{font-size:22px;line-height:1.15;font-weight:900;overflow-wrap:anywhere}
        .admin-stat-copy span{font-size:10px;font-weight:850;line-height:1.6}
        .admin-stat-copy small{font-size:8px;color:var(--admin-sub);line-height:1.5}
        .admin-stat-arrow{color:var(--admin-sub);flex:none}
        .admin-followup-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
        .admin-followup-card{min-width:0;display:flex;align-items:center;gap:9px;text-align:right;padding:12px;border:1px solid var(--admin-border);border-radius:13px;background:var(--admin-inner);color:var(--admin-text);cursor:pointer}
        .admin-followup-card>span:nth-child(2){display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}
        .admin-followup-card small{font-size:9px;line-height:1.6;color:var(--admin-sub)}
        .admin-followup-card strong{font-size:18px;font-weight:900}
        .admin-followup-card>svg{color:var(--admin-sub);flex:none}
        .admin-followup-icon{width:31px;height:31px;border-radius:10px;background:var(--admin-accent-soft);color:var(--admin-accent);display:grid;place-items:center;flex:none}
        .admin-followup-icon.amber{background:rgba(202,145,49,.12);color:#c58a27}
        .admin-dashboard-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:12px}
        .admin-panel-card{min-width:0;border:1px solid var(--admin-border);background:var(--admin-card);border-radius:17px;padding:17px;box-shadow:var(--admin-shadow)}
        .admin-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}
        .admin-panel-heading>div>span{font-size:9px;color:var(--admin-accent);font-weight:900}
        .admin-panel-heading h2{font-size:15px;margin:4px 0 0;font-weight:900}
        .admin-panel-heading button{border:0;background:none;color:var(--admin-accent);font-size:9px;font-weight:900;cursor:pointer;display:flex;gap:5px;align-items:center;white-space:nowrap}
        .admin-quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .admin-quick-grid button{min-width:0;border:1px solid var(--admin-border);background:var(--admin-inner);color:var(--admin-text);border-radius:12px;padding:11px;text-align:right;cursor:pointer;display:grid;grid-template-columns:auto 1fr;gap:4px 9px;align-items:center}
        .admin-quick-grid button>svg{grid-row:span 2;color:var(--admin-accent)}
        .admin-quick-grid button span{font-size:10px;font-weight:900;line-height:1.7}
        .admin-quick-grid button small{font-size:8px;color:var(--admin-sub);line-height:1.6}
        .admin-course-list{display:flex;flex-direction:column;gap:7px}
        .admin-course-list button{min-width:0;border:1px solid var(--admin-border);background:var(--admin-inner);color:var(--admin-text);border-radius:11px;padding:10px;display:flex;align-items:center;gap:9px;text-align:right;cursor:pointer}
        .admin-course-list button>span:nth-child(2){flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
        .admin-course-list strong{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .admin-course-list small{font-size:8px;color:var(--admin-sub)}
        .admin-course-list button>svg{color:var(--admin-sub);flex:none}
        .admin-course-dot{width:7px;height:7px;border-radius:50%;background:var(--admin-accent);flex:none}
        .admin-empty{padding:23px 15px;text-align:center;color:var(--admin-sub);font-size:10px;line-height:1.8;background:var(--admin-inner);border-radius:11px}
        .admin-transaction-list,.admin-module-status-list,.admin-audit-list{display:flex;flex-direction:column;gap:7px}
        .admin-transaction-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--admin-border);min-width:0}
        .admin-transaction-row:last-child{border-bottom:0}
        .admin-transaction-status{flex:none;border-radius:7px;padding:5px 7px;font-size:8px;font-weight:900}
        .admin-transaction-status.success{color:#23946e;background:rgba(35,148,110,.12)}
        .admin-transaction-status.pending{color:#c58a27;background:rgba(197,138,39,.12)}
        .admin-transaction-status.failed{color:#cf6262;background:rgba(207,98,98,.12)}
        .admin-transaction-copy{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
        .admin-transaction-copy strong{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .admin-transaction-copy small{font-size:8px;color:var(--admin-sub);line-height:1.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .admin-transaction-amount{font-size:10px;white-space:nowrap}
        .admin-module-status-list button{display:flex;align-items:center;gap:9px;text-align:right;border:1px solid var(--admin-border);background:var(--admin-inner);color:var(--admin-text);border-radius:11px;padding:10px;cursor:pointer;min-width:0}
        .admin-module-icon{width:31px;height:31px;display:grid;place-items:center;flex:none;border-radius:10px;color:var(--admin-accent);background:var(--admin-accent-soft)}
        .admin-module-status-list button>span:nth-child(2){display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
        .admin-module-status-list strong{font-size:10px}
        .admin-module-status-list small{font-size:8px;color:var(--admin-sub)}
        .admin-module-status-list button>svg{color:var(--admin-sub);flex:none}
        .admin-audit-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--admin-border);min-width:0}
        .admin-audit-row:last-child{border-bottom:0}
        .admin-audit-icon{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--admin-accent-soft);color:var(--admin-accent);flex:none}
        .admin-audit-copy{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
        .admin-audit-copy strong{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .admin-audit-copy small{font-size:8px;color:var(--admin-sub)}
        .admin-audit-row time{font-size:8px;color:var(--admin-sub);white-space:nowrap}
        @media(max-width:1100px){.admin-stat-grid,.admin-followup-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-dashboard-grid{grid-template-columns:1fr}}
        @media(max-width:600px){.admin-dashboard-tools{align-items:flex-start;flex-wrap:wrap}.admin-refresh-button{font-size:9px;padding:8px}.admin-stat-grid,.admin-followup-grid{grid-template-columns:1fr}.admin-quick-grid{grid-template-columns:1fr}.admin-panel-card{padding:14px}.admin-transaction-row{flex-wrap:wrap}.admin-transaction-amount{margin-right:40px}.admin-audit-row{align-items:flex-start;flex-wrap:wrap}.admin-audit-row time{margin-right:40px}}

        .admin-dashboard-priority-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:12px;align-items:stretch;width:100%;min-width:0}
        .admin-dashboard-priority-grid>.admin-action-center,.admin-dashboard-priority-grid>.admin-upcoming-panel{min-width:0;height:100%}
        .admin-dashboard-priority-grid .admin-action-center{padding:17px}
        .admin-dashboard-priority-grid .admin-upcoming-panel{padding:17px}
        .admin-dashboard-priority-grid .admin-action-row{padding:10px;gap:9px}
        @media(max-width:760px){.admin-dashboard-priority-grid{grid-template-columns:minmax(0,1fr)}}
        .admin-action-center,.admin-upcoming-panel{border:1px solid var(--admin-border);border-radius:16px;background:var(--admin-card);box-shadow:var(--admin-shadow);padding:18px}
        .admin-action-center .admin-panel-heading,.admin-upcoming-panel .admin-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;margin-bottom:10px;border-bottom:1px solid var(--admin-border)}
        .admin-action-center .admin-panel-heading>div,.admin-upcoming-panel .admin-panel-heading>div{display:flex;flex-direction:column;gap:3px}
        .admin-action-center .admin-panel-heading span:first-child,.admin-upcoming-panel .admin-panel-heading span:first-child{font-size:10px;color:var(--admin-accent);font-weight:800}
        .admin-action-center .admin-panel-heading h2,.admin-upcoming-panel .admin-panel-heading h2{margin:0;font-size:17px}
        .admin-action-summary{font-size:11px;font-weight:800;color:var(--admin-accent);background:var(--admin-accent-soft);padding:6px 10px;border-radius:9px;white-space:nowrap}
        .admin-action-list,.admin-upcoming-list{display:flex;flex-direction:column;gap:8px}
        .admin-action-list{max-height:392px;overflow-y:auto;overscroll-behavior:contain;padding:2px 3px 2px 2px}
        .admin-action-list::-webkit-scrollbar{width:5px}
        .admin-action-list::-webkit-scrollbar-thumb{background:var(--admin-border);border-radius:8px}
        .admin-action-list::-webkit-scrollbar-track{background:transparent}
        .admin-action-row,.admin-upcoming-row{width:100%;display:flex;align-items:center;gap:12px;text-align:right;padding:12px;border:1px solid var(--admin-border);border-radius:12px;background:var(--admin-inner);color:var(--admin-text);cursor:pointer;transition:border-color .15s,transform .15s}
        .admin-action-row{flex:0 0 auto;min-height:64px}
        .admin-action-row:hover,.admin-upcoming-row:hover{border-color:var(--admin-accent);transform:translateY(-1px)}
        .admin-action-icon,.admin-upcoming-icon{width:36px;height:36px;display:grid;place-items:center;flex:none;border-radius:10px;color:var(--admin-accent);background:var(--admin-accent-soft)}
        .admin-action-icon.amber{color:#b98327;background:rgba(185,131,39,.12)}
        .admin-action-copy{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
        .admin-action-copy strong,.admin-upcoming-row strong{font-size:12px;font-weight:850}
        .admin-action-copy small,.admin-upcoming-row small{font-size:10px;color:var(--admin-sub);line-height:1.6}
        .admin-action-row>b{font-size:16px;min-width:28px;text-align:center;color:var(--admin-accent)}
        .admin-action-empty{display:flex;align-items:center;gap:10px;padding:18px 10px;color:var(--admin-sub);font-size:12px}
        .admin-action-empty strong,.admin-action-empty small{display:block}
        .admin-action-empty strong{color:var(--admin-text);font-size:12px;margin-bottom:4px}
        .admin-action-empty small{font-size:10px}
        .admin-upcoming-row>span:nth-child(2){display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
        @media(max-width:600px){.admin-stat-grid{grid-template-columns:1fr}.admin-action-center,.admin-upcoming-panel{padding:14px}.admin-action-row{gap:8px;padding:10px}}
        @media(prefers-reduced-motion:reduce){.admin-dashboard-page *{transition:none!important;animation:none!important}}
      `}</style>
    </div>
  );
};
