import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Admin } from '../../types';
import {
  Activity, ArrowLeft, Bell, BookOpen, CalendarClock, CreditCard,
  FileCheck2, RefreshCw, Users, Wallet, MessageSquare,
} from 'lucide-react';
type CourseRow = { id: string; title: string; professor?: string | null; status?: string | null; startDate?: string | null };
type StudentRow = { id: string; fullName?: string; nationalId?: string; isArchived?: boolean };
type PaymentRow = { id: string; purpose?: string; status: string; claimedAmount?: number; approvedAmount?: number | null; createdAt?: string; paymentDate?: string | null; trackingCode?: string | null };
type RegistrationRow = { id: string; applicantFullName: string; status: string; createdAt?: string; finalTuition?: number; balance?: number; payments?: PaymentRow[]; installments?: Array<{ id: string; amount: number; paid?: number; dueDate: string; status?: string }>; courses?: Array<{ courseTitleSnapshot: string }> };
type OfflineRequestRow = { id: string; status: string; createdAt?: string; student?: { fullName?: string }; course?: { title?: string }; session?: { sessionNumber?: number } };
type CounselingRequestRow = { id: string; status: string; createdAt?: string; slot?: { startAt?: string }; student?: { fullName?: string } };
type ManagementTicketRow = { id: string; subject: string; status: string; updatedAt?: string; student?: { fullName?: string } };
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
  offlineRequests: OfflineRequestRow[] | null;
  counselingRequests: CounselingRequestRow[] | null;
  managementTickets: ManagementTicketRow[] | null;
  counselors: CounselorRow[] | null;
  conversations: ConversationRow[] | null;
  logs: AuditRow[] | null;
};
const emptyData: DashboardData = { courses: null, students: null, registrations: null, refunds: null, exams: null, tickets: null, offlineRequests: null, counselingRequests: null, managementTickets: null, counselors: null, conversations: null, logs: null };
type DashboardTab = 'dashboard' | 'courses' | 'students' | 'admins' | 'logs' | 'messages' | 'managementContact' | 'notifications' | 'rules' | 'offlineRequests' | 'mockExams' | 'counseling' | 'finance' | 'registrations';

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
      const [courses, students, registrations, refunds, exams, tickets, offlineRequests, counselingRequests, managementTickets, logs] = await Promise.all([
        loadList<CourseRow>('/api/courses', isAllowed('courses')),
        loadList<StudentRow>('/api/admin/students', isAllowed('students')),
        loadList<RegistrationRow>('/api/admin/registrations?status=ALL', isAllowed('finance')),
        loadList<RefundRow>('/api/admin/refunds?status=ALL', isAllowed('finance')),
        loadList<ExamRow>('/api/admin/mock-exams', isAllowed('mockExams')),
        loadList<TicketRow>('/api/admin/support/tickets', admin?.role === 'super_admin'),
        loadList<OfflineRequestRow>('/api/admin/offline-requests', isAllowed('offlineRequests')),
        loadList<CounselingRequestRow>('/api/admin/counseling/requests', isAllowed('counseling')),
        loadList<ManagementTicketRow>('/api/admin/management-contact/tickets', admin?.role === 'super_admin'),
        loadList<AuditRow>('/api/admin/audit-logs', isAllowed('logs')),
      ]);
      setData({ courses, students, registrations, refunds, exams, tickets, offlineRequests, counselingRequests, managementTickets, counselors: null, conversations: null, logs });
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
  const pendingOfflineRequests = data.offlineRequests?.filter(item => item.status === 'PENDING') ?? null;
  const pendingCounselingRequests = data.counselingRequests?.filter(item => item.status === 'PENDING') ?? null;
  const openManagementTickets = data.managementTickets?.filter(item => item.status === 'OPEN') ?? null;
  const overdueInstallments = data.registrations?.flatMap(registration => (registration.installments || []).map(installment => ({ ...installment, registration })))
    .filter(item => item.registration.status === 'APPROVED' && new Date(item.dueDate).getTime() < Date.now() && Number(item.amount) - Number(item.paid || 0) > 0.0001) ?? null;
  const recentLogs = data.logs?.slice(0, 6) ?? null;
  const upcomingExams = data.exams?.filter(exam => {
    if (!exam.examDate || ['COMPLETED', 'CANCELLED'].includes(String(exam.status || '').toUpperCase())) return false;
    const timestamp = new Date(exam.examDate).getTime();
    return Number.isFinite(timestamp) && timestamp >= Date.now();
  }) ?? null;

  const statCards = [
    { label: 'دوره‌های فعال', value: activeCourses ? numberFa(activeCourses.length) : '—', note: 'وضعیت فعلی دوره‌ها', icon: BookOpen, tab: 'courses' as const, permission: 'courses' },
    { label: 'هنرجویان ثبت‌شده', value: data.students ? numberFa(data.students.length) : '—', note: 'تعداد هنرجویان', icon: Users, tab: 'students' as const, permission: 'students' },
    { label: 'ثبت‌نام‌های در انتظار', value: pendingRegistrations ? numberFa(pendingRegistrations.length) : '—', note: 'نیازمند بررسی مدیریت', icon: FileCheck2, tab: 'registrations' as const, permission: 'finance' },
    { label: 'رسیدهای در انتظار', value: pendingPayments ? numberFa(pendingPayments.length) : '—', note: 'پرداخت‌های بررسی‌نشده', icon: CreditCard, tab: 'registrations' as const, permission: 'finance' },
    { label: 'اقساط معوق', value: overdueInstallments ? numberFa(overdueInstallments.length) : '—', note: 'قسط با مانده پس از سررسید', icon: Wallet, tab: 'registrations' as const, permission: 'finance' },
    { label: 'تیکت‌های پشتیبانی باز', value: openTickets ? numberFa(openTickets.length) : '—', note: 'در انتظار پاسخ یا پیگیری', icon: MessageSquare, tab: 'messages' as const, permission: 'super_admin' },
  ].filter(item => item.permission === 'super_admin' ? admin?.role === 'super_admin' : isAllowed(item.permission));

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
            (admin?.role === 'super_admin' ? (openTickets?.length || 0) + (openManagementTickets?.length || 0) : 0) +
            (pendingOfflineRequests?.length || 0) + (pendingCounselingRequests?.length || 0)
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
          {isAllowed('offlineRequests') && pendingOfflineRequests !== null && pendingOfflineRequests.length > 0 &&
            <button className="admin-action-row" onClick={() => onNavigate('offlineRequests')}>
              <span className="admin-action-icon"><CalendarClock size={18}/></span><span className="admin-action-copy"><strong>درخواست‌های آفلاین</strong><small>درخواست‌های منتظر بررسی و زمان‌بندی</small></span><b>{numberFa(pendingOfflineRequests.length)}</b><ArrowLeft size={15}/>
            </button>}
          {isAllowed('counseling') && pendingCounselingRequests !== null && pendingCounselingRequests.length > 0 &&
            <button className="admin-action-row" onClick={() => onNavigate('counseling')}>
              <span className="admin-action-icon"><Users size={18}/></span><span className="admin-action-copy"><strong>درخواست‌های مشاوره</strong><small>درخواست‌های در انتظار تعیین وضعیت</small></span><b>{numberFa(pendingCounselingRequests.length)}</b><ArrowLeft size={15}/>
            </button>}
          {admin?.role === 'super_admin' && openManagementTickets !== null && openManagementTickets.length > 0 &&
            <button className="admin-action-row" onClick={() => onNavigate('managementContact')}>
              <span className="admin-action-icon"><MessageSquare size={18}/></span><span className="admin-action-copy"><strong>انتقادات و پیشنهادات باز</strong><small>پیام‌های منتظر پاسخ مدیریت</small></span><b>{numberFa(openManagementTickets.length)}</b><ArrowLeft size={15}/>
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
            (pendingOfflineRequests?.length || 0) === 0 &&
            (pendingCounselingRequests?.length || 0) === 0 &&
            (admin?.role !== 'super_admin' || (openTickets?.length || 0) === 0 && (openManagementTickets?.length || 0) === 0) &&
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

      {(isAllowed('offlineRequests') || isAllowed('counseling') || admin?.role === 'super_admin') && <section className="admin-panel-card admin-operations-panel">
        <div className="admin-panel-heading"><div><span>پیگیری عملیات روزانه</span><h2>وضعیت درخواست‌ها</h2></div></div>
        <div className="admin-followup-grid">
          {isAllowed('offlineRequests') && <button className="admin-followup-card" onClick={() => onNavigate('offlineRequests')}><span className="admin-followup-icon"><CalendarClock size={16}/></span><span><small>درخواست آفلاین</small><strong>{pendingOfflineRequests === null ? '—' : numberFa(pendingOfflineRequests.length)}</strong></span><ArrowLeft size={14}/></button>}
          {isAllowed('counseling') && <button className="admin-followup-card" onClick={() => onNavigate('counseling')}><span className="admin-followup-icon"><Users size={16}/></span><span><small>درخواست مشاوره</small><strong>{pendingCounselingRequests === null ? '—' : numberFa(pendingCounselingRequests.length)}</strong></span><ArrowLeft size={14}/></button>}
          {admin?.role === 'super_admin' && <button className="admin-followup-card" onClick={() => onNavigate('managementContact')}><span className="admin-followup-icon"><MessageSquare size={16}/></span><span><small>انتقادات و پیشنهادات باز</small><strong>{openManagementTickets === null ? '—' : numberFa(openManagementTickets.length)}</strong></span><ArrowLeft size={14}/></button>}
          {admin?.role === 'super_admin' && <button className="admin-followup-card" onClick={() => onNavigate('messages')}><span className="admin-followup-icon"><MessageSquare size={16}/></span><span><small>تیکت پشتیبانی باز</small><strong>{openTickets === null ? '—' : numberFa(openTickets.length)}</strong></span><ArrowLeft size={14}/></button>}
        </div>
      </section>}

      {isAllowed('logs') && <section className="admin-panel-card admin-recent-activity">
        <div className="admin-panel-heading"><div><span>ردپای مدیریتی</span><h2>آخرین فعالیت‌های سامانه</h2></div><button onClick={() => onNavigate('logs')}>مشاهده گزارش‌ها <ArrowLeft size={13}/></button></div>
        {recentLogs === null ? <div className="admin-empty">گزارش فعالیت‌ها در دسترس نیست.</div> : recentLogs.length === 0 ? <div className="admin-empty">هنوز فعالیتی ثبت نشده است.</div> :
          <div className="admin-activity-list">{recentLogs.map(log => <div className="admin-activity-row" key={log.id}>
            <span className="admin-activity-mark"><Activity size={14}/></span><span className="admin-activity-copy"><strong>{log.action}</strong><small>{log.entityType || 'رویداد سامانه'} · {log.performedBy || 'کاربر سامانه'}</small></span><time>{dateFa(log.timestamp)}</time>
          </div>)}</div>}
      </section>}

      <style>{`
        .admin-page-content:has(> .admin-dashboard-page){width:100%;max-width:none;margin:0}
        .admin-dashboard-page{width:100%;max-width:none;margin:0;padding:0;box-sizing:border-box;display:flex;flex-direction:column;align-items:flex-start;gap:18px;color:var(--admin-text);font-family:Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif}
        .admin-dashboard-page *{box-sizing:border-box}
        .admin-dashboard-tools{display:flex;direction:rtl;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:30px}
        .admin-dashboard-updated{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--admin-sub)}
        .admin-dashboard-updated svg{color:var(--admin-accent);flex:none}
        .admin-dashboard-page .admin-refresh-button{display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--admin-brand-border);border-radius:10px;padding:9px 12px;background:var(--admin-accent-soft);color:#262424!important;-webkit-text-fill-color:#262424;font-size:11px;font-weight:800;white-space:nowrap;cursor:pointer;transition:color .18s,border-color .18s,background .18s}\n        .admin-dashboard-page .admin-refresh-button:hover:not(:disabled){color:var(--admin-accent)!important;-webkit-text-fill-color:var(--admin-accent);border-color:var(--admin-accent);background:var(--admin-brand-soft)}
        .admin-refresh-button:disabled{opacity:.6;cursor:wait}
        .admin-spinning{animation:admin-spin 1s linear infinite}
        @keyframes admin-spin{to{transform:rotate(360deg)}}
        .admin-dashboard-notice{border:1px solid #c38b37;background:rgba(195,139,55,.09);color:var(--admin-text);border-radius:12px;padding:10px 13px;font-size:11px;line-height:1.8}
        .admin-stat-grid{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));justify-content:stretch;gap:14px;width:100%;min-width:0;padding:0!important;margin:0!important;background:transparent!important;background-color:transparent!important;background-image:none!important;border:0!important;border-top:0!important;border-radius:0!important;outline:0!important;box-shadow:none!important;filter:none!important}
        .admin-stat-grid::before,.admin-stat-grid::after{display:none!important;content:none!important;background:none!important;background-image:none!important;border:0!important;box-shadow:none!important}
        .admin-dashboard-page > section.admin-stat-grid{
          display:grid!important;
          position:static!important;
          width:100%!important;
          max-width:none!important;
          min-width:0!important;
          justify-content:stretch!important;
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
        .admin-stat{position:relative;width:100%;max-width:none;height:108px;min-height:108px;min-width:0;border:1px solid var(--admin-border)!important;border-top:1px solid var(--admin-border)!important;background:var(--admin-card)!important;background-image:none!important;color:var(--admin-text);border-radius:16px;padding:17px 16px;display:flex;align-items:center;gap:12px;text-align:right;cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s;box-shadow:0 8px 18px rgba(38,36,36,.10),0 2px 5px rgba(38,36,36,.055),inset 1px 1px 2px rgba(255,255,255,.68),inset -2px -2px 4px rgba(38,36,36,.055)!important}
        .admin-stat::before,.admin-stat::after{display:none!important;content:none!important;background:none!important;background-image:none!important;border:0!important;box-shadow:none!important}
        .admin-stat:hover{transform:translateY(-2px);border-color:var(--admin-accent)!important;box-shadow:0 12px 28px rgba(0,128,128,.12)!important}\n        .admin-stat:focus-visible,.admin-followup-card:focus-visible,.admin-refresh-button:focus-visible{outline:2px solid var(--admin-accent);outline-offset:3px}
        .admin-stat-icon{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;color:var(--admin-accent);background:var(--admin-accent-soft);flex:none}
        .admin-stat-copy{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
        .admin-stat-copy strong{font-size:23px;line-height:1.2;font-weight:900;overflow-wrap:anywhere}
        .admin-stat-copy span{font-size:12px;font-weight:800;line-height:1.6}
        .admin-stat-copy small{font-size:10px;color:var(--admin-sub);line-height:1.6}
        .admin-stat-arrow{color:var(--admin-sub);flex:none}
        .admin-followup-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
        .admin-operations-panel,.admin-recent-activity{width:100%;min-width:0}
        .admin-dashboard-page>.admin-operations-panel,.admin-dashboard-page>.admin-recent-activity{box-sizing:border-box!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;padding:17px!important;border:1px solid var(--admin-border)!important;border-radius:17px!important;background:var(--admin-card)!important;background-image:none!important;color:var(--admin-text)!important;box-shadow:0 8px 18px rgba(38,36,36,.10),0 2px 5px rgba(38,36,36,.055),inset 1px 1px 2px rgba(255,255,255,.68),inset -2px -2px 4px rgba(38,36,36,.055)!important}
        .admin-dashboard-page>.admin-operations-panel .admin-panel-heading,.admin-dashboard-page>.admin-recent-activity .admin-panel-heading{padding:0 0 12px!important;margin:0 0 13px!important;border-bottom:1px solid var(--admin-border)!important}
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card{min-height:76px!important;border:1px solid var(--admin-border)!important;border-radius:12px!important;background:var(--admin-inner)!important;color:var(--admin-text)!important;box-shadow:var(--admin-shadow),inset 1px 1px 2px rgba(255,255,255,.48),inset -1px -1px 2px rgba(0,0,0,.035)!important}
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card:hover{border-color:var(--admin-accent)!important;background:var(--admin-accent-soft)!important;box-shadow:var(--admin-shadow)!important}
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card{position:relative!important;min-height:108px!important;padding:17px 16px!important;gap:12px!important;border:1px solid var(--admin-border)!important;border-radius:16px!important;background:var(--admin-card)!important;color:var(--admin-text)!important;box-shadow:0 8px 18px rgba(38,36,36,.10),0 2px 5px rgba(38,36,36,.055),inset 1px 1px 2px rgba(255,255,255,.68),inset -2px -2px 4px rgba(38,36,36,.055)!important;transition:transform .18s,border-color .18s,box-shadow .18s!important}
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card:hover{transform:translateY(-2px)!important;border-color:var(--admin-accent)!important;background:var(--admin-card)!important;box-shadow:0 12px 28px rgba(0,128,128,.12),var(--admin-shadow),inset 1px 1px 2px rgba(255,255,255,.58)!important}
        .admin-dashboard-page>.admin-operations-panel .admin-followup-icon{width:36px!important;height:36px!important;border-radius:11px!important;background:var(--admin-accent-soft)!important;color:var(--admin-accent)!important;box-shadow:none!important}
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card>span:nth-child(2){gap:5px!important}
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card small{font-size:10px!important;font-weight:700!important}
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card strong{font-size:23px!important;line-height:1.2!important;font-weight:900!important}
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card>svg{color:var(--admin-sub)!important}
        .admin-dashboard-page>.admin-recent-activity .admin-activity-row{min-height:62px!important;padding:12px 14px!important;border:1px solid var(--admin-border)!important;border-radius:13px!important;background:var(--admin-card)!important;box-shadow:0 8px 18px rgba(38,36,36,.10),0 2px 5px rgba(38,36,36,.055),inset 1px 1px 2px rgba(255,255,255,.68),inset -2px -2px 4px rgba(38,36,36,.055)!important}
        .admin-dashboard-page>.admin-recent-activity .admin-activity-row:hover{transform:translateY(-2px)!important;border-color:var(--admin-accent)!important;box-shadow:0 12px 28px rgba(0,128,128,.10),var(--admin-shadow),inset 1px 1px 2px rgba(255,255,255,.58)!important}
        .admin-dashboard-page>.admin-recent-activity .admin-activity-mark{width:36px!important;height:36px!important;border-radius:11px!important;box-shadow:2px 2px 5px rgba(0,0,0,.08),-2px -2px 5px rgba(255,255,255,.62)!important}
        @media(max-width:600px){.admin-dashboard-page>.admin-operations-panel .admin-followup-card{min-height:94px!important;padding:14px!important}.admin-dashboard-page>.admin-operations-panel .admin-followup-card strong{font-size:20px!important}}
        .admin-dashboard-page .admin-stat,.admin-dashboard-page>.admin-operations-panel .admin-followup-card,.admin-dashboard-page>.admin-recent-activity .admin-activity-row{background:var(--admin-card)!important;background-image:none!important;border-color:var(--admin-border)!important;box-shadow:0 8px 18px rgba(38,36,36,.10),0 2px 5px rgba(38,36,36,.055),inset 1px 1px 2px rgba(255,255,255,.68),inset -2px -2px 4px rgba(38,36,36,.055)!important}
        .admin-dashboard-page .admin-stat-icon,.admin-dashboard-page>.admin-operations-panel .admin-followup-icon,.admin-dashboard-page>.admin-recent-activity .admin-activity-mark{background:var(--admin-accent-soft)!important;color:var(--admin-accent)!important;box-shadow:none!important}
        .admin-dashboard-page .admin-stat:hover,.admin-dashboard-page>.admin-operations-panel .admin-followup-card:hover,.admin-dashboard-page>.admin-recent-activity .admin-activity-row:hover{background:var(--admin-card)!important;border-color:var(--admin-accent)!important;box-shadow:0 12px 28px rgba(0,128,128,.12)!important}

        .admin-activity-list{display:flex;flex-direction:column;gap:8px}
        .admin-activity-row{display:flex;align-items:center;gap:10px;min-width:0;padding:12px;border:1px solid var(--admin-border);border-radius:12px;background:var(--admin-inner);box-shadow:var(--admin-shadow),inset 1px 1px 2px rgba(255,255,255,.48),inset -1px -1px 2px rgba(0,0,0,.035);transition:border-color .18s,transform .18s,box-shadow .18s}
        .admin-activity-row:hover{border-color:var(--admin-accent);transform:translateY(-1px)}
        .admin-activity-mark{width:29px;height:29px;display:grid;place-items:center;flex:none;border-radius:9px;background:var(--admin-accent-soft);color:var(--admin-accent)}
        .admin-activity-copy{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
        .admin-activity-copy strong{font-size:11px;overflow-wrap:anywhere}
        .admin-activity-copy small,.admin-activity-row time{font-size:9px;color:var(--admin-sub)}
        .admin-activity-row time{white-space:nowrap;flex:none}
        .admin-followup-card{min-width:0;min-height:76px;display:flex;align-items:center;gap:9px;text-align:right;padding:13px 14px;border:1px solid var(--admin-border);border-radius:15px;background:var(--admin-card);color:var(--admin-text);cursor:pointer;box-shadow:var(--admin-shadow);transition:transform .18s,border-color .18s,box-shadow .18s}\n        .admin-followup-card:hover{transform:translateY(-2px);border-color:var(--admin-accent);box-shadow:0 12px 28px rgba(0,128,128,.10)}
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
        @media(max-width:1100px){.admin-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-followup-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-dashboard-grid{grid-template-columns:1fr}.admin-dashboard-priority-grid{grid-template-columns:minmax(0,560px) minmax(0,420px)}}
        @media(max-width:760px){.admin-dashboard-priority-grid{grid-template-columns:minmax(0,1fr);width:100%}.admin-dashboard-priority-grid>.admin-action-center,.admin-dashboard-priority-grid>.admin-upcoming-panel{max-width:560px}} 
        @media(max-width:600px){.admin-dashboard-tools{align-items:flex-start;flex-wrap:wrap}.admin-refresh-button{font-size:10px;padding:8px 10px}.admin-stat-grid{grid-template-columns:minmax(0,1fr)}.admin-stat{width:100%;height:104px;min-height:104px}.admin-followup-grid{grid-template-columns:1fr}.admin-quick-grid{grid-template-columns:1fr}.admin-panel-card{padding:14px}.admin-transaction-row{flex-wrap:wrap}.admin-transaction-amount{margin-right:40px}.admin-audit-row{align-items:flex-start;flex-wrap:wrap}.admin-audit-row time{margin-right:40px}}

        .admin-dashboard-priority-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);justify-content:stretch;gap:14px;align-items:stretch;width:100%;min-width:0}
        .admin-dashboard-priority-grid>.admin-action-center,.admin-dashboard-priority-grid>.admin-upcoming-panel{min-width:0;width:100%;height:auto;min-height:190px}
        @media(max-width:1100px){.admin-dashboard-priority-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:760px){.admin-dashboard-priority-grid{grid-template-columns:minmax(0,1fr)}}
        .admin-dashboard-priority-grid .admin-action-center{padding:19px}
        .admin-dashboard-priority-grid .admin-upcoming-panel{padding:19px}
        .admin-dashboard-priority-grid .admin-action-row{padding:10px;gap:9px}
        @media(max-width:760px){.admin-dashboard-priority-grid{grid-template-columns:minmax(0,1fr)}}
        .admin-action-center,.admin-upcoming-panel{box-sizing:border-box;min-width:0;border:1px solid var(--admin-border);border-radius:17px;background:var(--admin-card);box-shadow:var(--admin-shadow);padding:19px}
        .admin-action-center .admin-panel-heading,.admin-upcoming-panel .admin-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;margin-bottom:10px;border-bottom:1px solid var(--admin-border)}
        .admin-action-center .admin-panel-heading>div,.admin-upcoming-panel .admin-panel-heading>div{display:flex;flex-direction:column;gap:3px}
        .admin-action-center .admin-panel-heading span:first-child,.admin-upcoming-panel .admin-panel-heading span:first-child{font-size:10px;color:var(--admin-accent);font-weight:800}
        .admin-action-center .admin-panel-heading h2,.admin-upcoming-panel .admin-panel-heading h2{margin:0;font-size:18px}
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
        .admin-action-copy strong,.admin-upcoming-row strong{font-size:13px;font-weight:800}
        .admin-action-copy small,.admin-upcoming-row small{font-size:11px;color:var(--admin-sub);line-height:1.7}
        .admin-action-row>b{font-size:16px;min-width:28px;text-align:center;color:var(--admin-accent)}
        .admin-action-empty{display:flex;align-items:center;gap:10px;padding:18px 10px;color:var(--admin-sub);font-size:12px}
        .admin-action-empty strong,.admin-action-empty small{display:block}
        .admin-action-empty strong{color:var(--admin-text);font-size:12px;margin-bottom:4px}
        .admin-action-empty small{font-size:10px}
        .admin-upcoming-row>span:nth-child(2){display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
        @media(max-width:600px){.admin-stat-grid{grid-template-columns:1fr}.admin-action-center,.admin-upcoming-panel{padding:14px}.admin-action-row{gap:8px;padding:10px}}


        /* Raised shell + recessed inner tiles for the daily operations panel */
        .admin-dashboard-page{
          --dashboard-card-surface:var(--admin-card);
          --dashboard-card-border:var(--admin-border);
          --dashboard-card-shadow:0 8px 18px rgba(38,36,36,.10),0 2px 5px rgba(38,36,36,.055),inset 1px 1px 2px rgba(255,255,255,.68),inset -2px -2px 4px rgba(38,36,36,.055);
          --dashboard-card-shadow-hover:0 12px 28px rgba(0,128,128,.12),0 3px 7px rgba(38,36,36,.06),inset 1px 1px 2px rgba(255,255,255,.62);
          --dashboard-icon-surface:var(--admin-accent-soft);
        }
        .admin-dashboard-page>.admin-operations-panel{
          background:var(--dashboard-card-surface)!important;
          border:1px solid var(--dashboard-card-border)!important;
          border-radius:17px!important;
          box-shadow:var(--dashboard-card-shadow)!important;
          padding:17px!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card{
          appearance:none!important;
          -webkit-appearance:none!important;
          background:var(--admin-inner)!important;
          background-color:var(--admin-inner)!important;
          background-image:none!important;
          border:1px solid var(--dashboard-card-border)!important;
          border-radius:13px!important;
          box-shadow:inset 3px 3px 7px rgba(38,36,36,.10),inset -3px -3px 7px rgba(255,255,255,.72)!important;
          color:var(--admin-text)!important;
          min-height:108px!important;
          padding:17px 16px!important;
          transition:transform .18s,border-color .18s,box-shadow .18s!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card:hover{
          transform:translateY(-2px)!important;
          border-color:var(--admin-accent)!important;
          box-shadow:inset 2px 2px 5px rgba(38,36,36,.08),inset -2px -2px 5px rgba(255,255,255,.7),0 7px 16px rgba(0,128,128,.10)!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-icon{
          width:36px!important;height:36px!important;border-radius:11px!important;
          background:var(--dashboard-icon-surface)!important;color:var(--admin-accent)!important;
          box-shadow:2px 2px 5px rgba(38,36,36,.10),-2px -2px 5px rgba(255,255,255,.72)!important;
        }
        /* Daily operations must use the same content-card language as the action center. */
        .admin-dashboard-page>.admin-operations-panel{
          min-width:0!important;
          padding:19px!important;
          border:1px solid var(--admin-border)!important;
          border-radius:17px!important;
          background:var(--admin-card)!important;
          box-shadow:var(--admin-shadow)!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-grid{
          display:grid!important;
          grid-template-columns:repeat(4,minmax(0,1fr))!important;
          gap:9px!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card{
          appearance:none!important;
          -webkit-appearance:none!important;
          display:flex!important;
          align-items:center!important;
          gap:12px!important;
          min-width:0!important;
          min-height:64px!important;
          padding:12px!important;
          border:1px solid var(--admin-border)!important;
          border-radius:12px!important;
          background:var(--admin-inner)!important;
          color:var(--admin-text)!important;
          box-shadow:none!important;
          transform:none!important;
          transition:border-color .15s,background-color .15s!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card:hover{
          border-color:var(--admin-accent)!important;
          background:var(--admin-inner)!important;
          box-shadow:none!important;
          transform:translateY(-1px)!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-icon{
          width:36px!important;height:36px!important;flex:none!important;
          border-radius:10px!important;
          background:var(--admin-accent-soft)!important;
          color:var(--admin-accent)!important;
          box-shadow:none!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card>span:nth-child(2){
          display:flex!important;flex:1 1 auto!important;flex-direction:column!important;
          gap:3px!important;min-width:0!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card small{
          color:var(--admin-sub)!important;font-size:10px!important;font-weight:700!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card strong{
          color:var(--admin-accent)!important;font-size:16px!important;line-height:1.4!important;font-weight:800!important;
        }
        .admin-dashboard-page>.admin-operations-panel .admin-followup-card>svg{color:var(--admin-sub)!important;flex:none!important}
        @media(max-width:900px){.admin-dashboard-page>.admin-operations-panel .admin-followup-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
        @media(max-width:600px){.admin-dashboard-page>.admin-operations-panel{padding:14px!important}.admin-dashboard-page>.admin-operations-panel .admin-followup-grid{grid-template-columns:minmax(0,1fr)!important}}
        @media(prefers-reduced-motion:reduce){.admin-dashboard-page *{transition:none!important;animation:none!important}}
      `}</style>
    </div>
  );
};
