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

      {(isAllowed('offlineRequests') || isAllowed('counseling') || admin?.role === 'super_admin') && <section className="admin-panel-card admin-operations-panel admin-master-panel">
        <div className="admin-panel-heading"><div><span>پیگیری عملیات روزانه</span><h2>وضعیت درخواست‌ها</h2></div></div>
        <div className="admin-followup-grid">
          {isAllowed('offlineRequests') && <button className="admin-followup-card" onClick={() => onNavigate('offlineRequests')}><span className="admin-followup-icon"><CalendarClock size={16}/></span><span><small>درخواست آفلاین</small><strong>{pendingOfflineRequests === null ? '—' : numberFa(pendingOfflineRequests.length)}</strong></span><ArrowLeft size={14}/></button>}
          {isAllowed('counseling') && <button className="admin-followup-card" onClick={() => onNavigate('counseling')}><span className="admin-followup-icon"><Users size={16}/></span><span><small>درخواست مشاوره</small><strong>{pendingCounselingRequests === null ? '—' : numberFa(pendingCounselingRequests.length)}</strong></span><ArrowLeft size={14}/></button>}
          {admin?.role === 'super_admin' && <button className="admin-followup-card" onClick={() => onNavigate('managementContact')}><span className="admin-followup-icon"><MessageSquare size={16}/></span><span><small>انتقادات و پیشنهادات باز</small><strong>{openManagementTickets === null ? '—' : numberFa(openManagementTickets.length)}</strong></span><ArrowLeft size={14}/></button>}
          {admin?.role === 'super_admin' && <button className="admin-followup-card" onClick={() => onNavigate('messages')}><span className="admin-followup-icon"><MessageSquare size={16}/></span><span><small>تیکت پشتیبانی باز</small><strong>{openTickets === null ? '—' : numberFa(openTickets.length)}</strong></span><ArrowLeft size={14}/></button>}
        </div>
      </section>}

      {isAllowed('logs') && <section className="admin-panel-card admin-recent-activity admin-master-panel">
        <div className="admin-panel-heading"><div><span>ردپای مدیریتی</span><h2>آخرین فعالیت‌های سامانه</h2></div><button onClick={() => onNavigate('logs')}>مشاهده گزارش‌ها <ArrowLeft size={13}/></button></div>
        {recentLogs === null ? <div className="admin-empty">گزارش فعالیت‌ها در دسترس نیست.</div> : recentLogs.length === 0 ? <div className="admin-empty">هنوز فعالیتی ثبت نشده است.</div> :
          <div className="admin-activity-list">{recentLogs.map(log => <div className="admin-activity-row" key={log.id}>
            <span className="admin-activity-mark"><Activity size={14}/></span><span className="admin-activity-copy"><strong>{log.action}</strong><small>{log.entityType || 'رویداد سامانه'} · {log.performedBy || 'کاربر سامانه'}</small></span><time>{dateFa(log.timestamp)}</time>
          </div>)}</div>}
      </section>}

      
    </div>
  );
};
