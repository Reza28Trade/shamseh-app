import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Admin } from '../../types';
import {
  Activity, ArrowLeft, Bell, BookOpen, CalendarClock, ClipboardList,
  CreditCard, FileCheck2, RefreshCw, ShieldAlert, Users, Wallet, MessageSquare,
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
type OfflineRequestRow = { id: string; status: string; createdAt?: string; student?: { fullName?: string }; course?: { title?: string } };
type ManagementTicketRow = { id: string; subject?: string; status: string; updatedAt?: string; student?: { fullName?: string } };
type CounselingRequestRow = { id: string; status: string; createdAt?: string; slot?: { startAt?: string } };
type AdminAccountRow = { id: string; username: string; status: string; permissions?: string[]; lastLoginAt?: string | null };
type PublicContentRow = { id: string; type: 'RULES' | 'EXAM_ANALYSIS'; title?: string; examYear?: string | null; published: boolean; updatedAt?: string };
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
  offlineRequests: OfflineRequestRow[] | null;
  managementTickets: ManagementTicketRow[] | null;
  counselingRequests: CounselingRequestRow[] | null;
  admins: AdminAccountRow[] | null;
  publicContent: PublicContentRow[] | null;
  logs: AuditRow[] | null;
};
const emptyData: DashboardData = { courses: null, students: null, registrations: null, refunds: null, exams: null, tickets: null, counselors: null, conversations: null, offlineRequests: null, managementTickets: null, counselingRequests: null, admins: null, publicContent: null, logs: null };
type DashboardTab = 'dashboard' | 'courses' | 'students' | 'admins' | 'logs' | 'messages' | 'notifications' | 'rules' | 'offlineRequests' | 'mockExams' | 'counseling' | 'finance' | 'registrations' | 'managementContact';

interface AdminDashboardProps {
  adminName?: string;
  admin?: Admin;
  onNavigate: (tab: DashboardTab) => void;
}

const numberFa = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('fa-IR').format(value);
const moneyFa = (value: number) => new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
const dateFa = (value?: string | null) => {
  if (!value) return 'تاریخ ثبت نشده';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};
const statusText = (status: string) => ({
  PENDING_REVIEW: 'در انتظار بررسی', NEEDS_CORRECTION: 'نیازمند اصلاح', APPROVED: 'تأیید شده',
  REJECTED: 'رد شده', PENDING: 'در انتظار بررسی', OPEN: 'باز', ANSWERED: 'پاسخ داده شده',
  CLOSED: 'بسته شده', REQUESTED: 'درخواست جدید', RESERVED: 'مبلغ رزرو شده', PAID: 'پرداخت شده',
}[status] || status);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminName = 'مدیر سیستم', admin, onNavigate }) => {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState('');

  const isAllowed = useCallback((permission: string) => admin?.role === 'super_admin' || Boolean(admin?.permissions?.includes(permission)), [admin?.role, admin?.permissions]);
  const loadList = useCallback(async <T,>(url: string, allowed: boolean): Promise<T[] | null> => {
    if (!allowed) return null;
    try {
      const response = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!response.ok) {
        setRefreshError('بخشی از اطلاعات داشبورد دریافت نشد؛ وضعیت همان بخش با خط تیره مشخص می‌شود.');
        return null;
      }
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) {
        setRefreshError('ساختار پاسخ یکی از بخش‌ها قابل نمایش نیست؛ وضعیت همان بخش با خط تیره مشخص می‌شود.');
        return null;
      }
      return payload as T[];
    } catch {
      setRefreshError('بخشی از اطلاعات داشبورد دریافت نشد؛ وضعیت همان بخش با خط تیره مشخص می‌شود.');
      return null;
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setRefreshError('');
    try {
      const [courses, students, registrations, refunds, exams, tickets, counselors, conversations, offlineRequests, managementTickets, counselingRequests, admins, publicContent, logs] = await Promise.all([
        loadList<CourseRow>('/api/courses', isAllowed('courses')),
        loadList<StudentRow>('/api/admin/students', isAllowed('students')),
        loadList<RegistrationRow>('/api/admin/registrations?status=ALL', isAllowed('finance')),
        loadList<RefundRow>('/api/admin/refunds?status=ALL', isAllowed('finance')),
        loadList<ExamRow>('/api/admin/mock-exams', isAllowed('mockExams')),
        loadList<TicketRow>('/api/admin/support/tickets', admin?.role === 'super_admin'),
        loadList<CounselorRow>('/api/admin/counselors', isAllowed('counseling')),
        loadList<ConversationRow>('/api/counseling/conversations', isAllowed('counseling')),
        loadList<OfflineRequestRow>('/api/admin/offline-requests', isAllowed('offlineRequests')),
        loadList<ManagementTicketRow>('/api/admin/management-contact/tickets', admin?.role === 'super_admin'),
        loadList<CounselingRequestRow>('/api/admin/counseling/requests', isAllowed('counseling')),
        loadList<AdminAccountRow>('/api/auth/admin/admins', admin?.role === 'super_admin'),
        loadList<PublicContentRow>('/api/admin/public-content', isAllowed('rules')),
        loadList<AuditRow>('/api/admin/audit-logs', admin?.role === 'super_admin'),
      ]);
      setData({ courses, students, registrations, refunds, exams, tickets, counselors, conversations, offlineRequests, managementTickets, counselingRequests, admins, publicContent, logs });
      setLastUpdated(new Date().toISOString());
    } catch {
      setRefreshError('بروزرسانی داشبورد کامل نشد. بخش‌هایی که داده معتبر دریافت نکرده‌اند با خط تیره مشخص می‌شوند.');
    } finally {
      setLoading(false);
    }
  }, [admin?.role, isAllowed, loadList]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const activeCourses = useMemo(() => data.courses?.filter(course => String(course.status || '').toUpperCase() === 'ACTIVE') ?? null, [data.courses]);
  const pendingRegistrations = data.registrations?.filter(item => item.status === 'PENDING_REVIEW' || item.status === 'NEEDS_CORRECTION') ?? null;
  const pendingPayments = data.registrations?.flatMap(item => item.payments || []).filter(payment => payment.status === 'PENDING') ?? null;
  const openRefunds = data.refunds?.filter(item => item.status === 'REQUESTED' || item.status === 'RESERVED') ?? null;
  const openTickets = data.tickets?.filter(item => item.status === 'OPEN') ?? null;
  const pendingOfflineRequests = data.offlineRequests?.filter(item => item.status === 'PENDING') ?? null;
  const pendingCounselingRequests = data.counselingRequests?.filter(item => item.status === 'PENDING') ?? null;
  const openManagementTickets = data.managementTickets?.filter(item => item.status === 'OPEN') ?? null;
  const activeAdmins = data.admins?.filter(item => item.status === 'ACTIVE') ?? null;
  const publicRules = data.publicContent?.filter(item => item.type === 'RULES' && item.published) ?? null;
  const publishedAnalyses = data.publicContent?.filter(item => item.type === 'EXAM_ANALYSIS' && item.published) ?? null;
  const upcomingExams = data.exams?.filter(exam => {
    if (!exam.examDate || ['COMPLETED', 'CANCELLED'].includes(String(exam.status || '').toUpperCase())) return false;
    const timestamp = new Date(exam.examDate).getTime();
    return Number.isFinite(timestamp) && timestamp >= Date.now();
  }) ?? null;

  const transactions = useMemo(() => {
    if (!data.registrations) return null;
    return data.registrations.flatMap(registration => (registration.payments || []).map(payment => ({
      id: payment.id,
      student: registration.applicantFullName,
      course: registration.courses?.map(course => course.courseTitleSnapshot).filter(Boolean).join('، ') || 'ثبت‌نام دوره',
      amount: payment.approvedAmount ?? payment.claimedAmount ?? 0,
      status: payment.status,
      date: payment.paymentDate || payment.createdAt || registration.createdAt,
      purpose: payment.purpose === 'INITIAL' ? 'پیش‌پرداخت ثبت‌نام' : 'پرداخت قسط',
    }))).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 5);
  }, [data.registrations]);

  const statCards = [
    { label: 'دوره‌های فعال', value: activeCourses ? numberFa(activeCourses.length) : '—', note: activeCourses ? 'بر اساس فهرست دوره‌ها' : 'داده در دسترس نیست', icon: BookOpen, tab: 'courses' as const, permission: 'courses' },
    { label: 'هنرجویان ثبت‌شده', value: data.students ? numberFa(data.students.length) : '—', note: data.students ? 'بر اساس فهرست هنرجویان' : 'داده در دسترس نیست', icon: Users, tab: 'students' as const, permission: 'students' },
    { label: 'ثبت‌نام‌های نیازمند بررسی', value: pendingRegistrations ? numberFa(pendingRegistrations.length) : '—', note: pendingRegistrations ? 'در انتظار بررسی یا اصلاح' : 'داده در دسترس نیست', icon: FileCheck2, tab: 'registrations' as const, permission: 'finance' },
    { label: 'رسیدهای پرداخت در انتظار', value: pendingPayments ? numberFa(pendingPayments.length) : '—', note: pendingPayments ? 'نیازمند بررسی مالی' : 'داده در دسترس نیست', icon: CreditCard, tab: 'registrations' as const, permission: 'finance' },
  ].filter(item => isAllowed(item.permission));

  const quickLinks = [
    { label: 'مدیریت دوره‌ها', note: 'دوره‌ها و محتوای آموزشی', icon: BookOpen, tab: 'courses' as const, permission: 'courses' },
    { label: 'مدیریت هنرجویان', note: 'حساب‌ها و وضعیت هنرجویان', icon: Users, tab: 'students' as const, permission: 'students' },
    { label: 'درخواست‌های آفلاین', note: 'بررسی درخواست دسترسی به جلسات', icon: ClipboardList, tab: 'offlineRequests' as const, permission: 'offlineRequests' },
    { label: 'آزمون‌های آزمایشی', note: 'زمان‌بندی و شرکت‌کنندگان', icon: ClipboardList, tab: 'mockExams' as const, permission: 'mockExams' },
    { label: 'مشاوره و گفتگوها', note: 'مشاوران، درخواست‌ها و مکالمات', icon: CalendarClock, tab: 'counseling' as const, permission: 'counseling' },
    { label: 'پیام‌ها و پرسش‌ها', note: 'پیگیری تیکت‌های هنرجویان', icon: MessageSquare, tab: 'messages' as const, permission: 'messages' },
    { label: 'امور مالی و ثبت‌نام', note: 'شهریه، رسیدها و بازپرداخت', icon: Wallet, tab: 'registrations' as const, permission: 'finance' },
    { label: 'قوانین و تحلیل کنکور', note: 'قوانین آموزشی و تحلیل‌های منتشرشده', icon: FileCheck2, tab: 'rules' as const, permission: 'rules' },
    { label: 'ارسال اطلاعیه', note: 'اطلاع‌رسانی به هنرجویان', icon: Bell, tab: 'notifications' as const, permission: 'notifications' },
    { label: 'گزارش‌های سیستمی', note: 'رویدادهای مدیریتی ثبت‌شده', icon: ShieldAlert, tab: 'logs' as const, permission: 'logs' },
    { label: 'مدیریت مدیران و دسترسی‌ها', note: 'حساب‌های مدیریتی و سطح دسترسی', icon: Users, tab: 'admins' as const, permission: 'admins' },
    { label: 'ارتباط مستقیم با مدیریت', note: 'درخواست‌ها و پیام‌های هنرجویان', icon: MessageSquare, tab: 'managementContact' as const, permission: 'managementContact' },
  ].filter(item => item.tab === 'admins' || item.tab === 'managementContact' || item.tab === 'messages' ? admin?.role === 'super_admin' : isAllowed(item.permission));

  const actionItems = [
    ...(isAllowed('finance') && pendingRegistrations && pendingRegistrations.length > 0 ? [{
      id: 'pending-registrations', label: 'ثبت‌نام‌های نیازمند بررسی', detail: 'بررسی اطلاعات ثبت‌نام و موارد نیازمند اصلاح',
      count: pendingRegistrations.length, tab: 'registrations' as const, icon: FileCheck2,
    }] : []),
    ...(isAllowed('finance') && pendingPayments && pendingPayments.length > 0 ? [{
      id: 'pending-payments', label: 'رسیدهای پرداخت در انتظار تأیید', detail: 'بررسی رسیدها و تعیین وضعیت پرداخت',
      count: pendingPayments.length, tab: 'registrations' as const, icon: CreditCard,
    }] : []),
    ...(isAllowed('finance') && openRefunds && openRefunds.length > 0 ? [{
      id: 'open-refunds', label: 'درخواست‌های بازپرداخت', detail: 'بررسی درخواست‌های باز یا مبلغ رزروشده',
      count: openRefunds.length, tab: 'registrations' as const, icon: Wallet,
    }] : []),
    ...(admin?.role === 'super_admin' && openTickets && openTickets.length > 0 ? [{
      id: 'open-tickets', label: 'تیکت‌های پشتیبانی باز', detail: 'بررسی پیام‌ها و پاسخ‌گویی به هنرجویان',
      count: openTickets.length, tab: 'messages' as const, icon: MessageSquare,
    }] : []),
    ...(isAllowed('offlineRequests') && pendingOfflineRequests && pendingOfflineRequests.length > 0 ? [{
      id: 'offline-requests', label: 'درخواست‌های آفلاین در انتظار', detail: 'بررسی درخواست دسترسی به جلسات آفلاین',
      count: pendingOfflineRequests.length, tab: 'offlineRequests' as const, icon: ClipboardList,
    }] : []),
    ...(isAllowed('counseling') && pendingCounselingRequests && pendingCounselingRequests.length > 0 ? [{
      id: 'counseling-requests', label: 'درخواست‌های مشاوره در انتظار', detail: 'بررسی و تعیین تکلیف درخواست‌های مشاوره',
      count: pendingCounselingRequests.length, tab: 'counseling' as const, icon: CalendarClock,
    }] : []),
    ...(admin?.role === 'super_admin' && openManagementTickets && openManagementTickets.length > 0 ? [{
      id: 'management-tickets', label: 'انتقادات و پیشنهادات نیازمند پاسخ', detail: 'بررسی پیام‌های باز ارسال‌شده برای مدیریت',
      count: openManagementTickets.length, tab: 'managementContact' as const, icon: MessageSquare,
    }] : []),
  ];

  return (
    <div className="admin-dashboard-page">
      <div className="admin-action-toolbar">
        <div>
          <span className="admin-action-eyebrow">مرکز مدیریت شمسه</span>
          <h1>موارد نیازمند اقدام</h1>
          <p>فقط مواردی نمایش داده می‌شوند که نیاز به بررسی یا پیگیری دارند.</p>
          <span className="admin-dashboard-updated">
            <Activity size={13} />
            {lastUpdated ? 'آخرین بروزرسانی: ' + dateFa(lastUpdated) : loading ? 'در حال دریافت اطلاعات سامانه…' : 'زمان بروزرسانی ثبت نشده است'}
          </span>
        </div>
        <button className="admin-refresh-button" onClick={() => void loadDashboard()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'admin-spinning' : ''} />
          {loading ? 'در حال بروزرسانی' : 'بروزرسانی اطلاعات'}
        </button>
      </div>

      {refreshError && <div className="admin-dashboard-notice" role="status">{refreshError}</div>}

      {loading && actionItems.length === 0 ? (
        <div className="admin-no-actions"><RefreshCw size={20} className="admin-spinning" /><strong>در حال بررسی موارد نیازمند اقدام…</strong></div>
      ) : actionItems.length > 0 ? (
        <section className="admin-action-list" aria-label="موارد نیازمند اقدام">
          {actionItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} className="admin-action-item" onClick={() => onNavigate(item.tab)}>
                <span className="admin-action-icon"><Icon size={19} /></span>
                <span className="admin-action-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
                <span className="admin-action-count">{numberFa(item.count)} مورد</span>
                <ArrowLeft size={16} className="admin-action-arrow" />
              </button>
            );
          })}
        </section>
      ) : !refreshError ? (
        <div className="admin-no-actions">
          <FileCheck2 size={23} />
          <strong>در حال حاضر موردی برای اقدام وجود ندارد.</strong>
          <span>برای مشاهده آخرین وضعیت، دکمهٔ «بروزرسانی اطلاعات» را بزنید.</span>
        </div>
      ) : null}

      <style>{`
        .admin-action-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border:1px solid var(--admin-border);border-radius:16px;background:var(--admin-card);box-shadow:var(--admin-shadow)}
        .admin-action-toolbar h1{margin:4px 0 5px;font-size:20px;font-weight:900}
        .admin-action-toolbar p{margin:0;color:var(--admin-sub);font-size:11px;line-height:1.8}
        .admin-action-eyebrow{font-size:10px;color:var(--admin-accent);font-weight:900}
        .admin-action-toolbar .admin-dashboard-updated{margin-top:9px}
        .admin-action-list{display:flex;flex-direction:column;gap:9px}
        .admin-action-item{display:flex;align-items:center;gap:13px;width:100%;min-width:0;padding:14px 16px;border:1px solid var(--admin-border);border-radius:14px;background:var(--admin-card);color:var(--admin-text);text-align:right;cursor:pointer;box-shadow:var(--admin-shadow);transition:border-color .18s,transform .18s}
        .admin-action-item:hover{border-color:var(--admin-accent);transform:translateY(-1px)}
        .admin-action-icon{width:40px;height:40px;display:grid;place-items:center;flex:none;border-radius:12px;background:var(--admin-accent-soft);color:var(--admin-accent)}
        .admin-action-copy{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}
        .admin-action-copy strong{font-size:12px;font-weight:900}
        .admin-action-copy small{font-size:10px;line-height:1.7;color:var(--admin-sub)}
        .admin-action-count{flex:none;padding:6px 10px;border:1px solid var(--admin-brand-border);border-radius:9px;background:var(--admin-accent-soft);color:var(--admin-accent);font-size:10px;font-weight:900;white-space:nowrap}
        .admin-action-arrow{flex:none;color:var(--admin-sub)}
        .admin-no-actions{min-height:170px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;border:1px dashed var(--admin-border);border-radius:15px;background:var(--admin-card);color:var(--admin-sub);text-align:center}
        .admin-no-actions>svg{color:var(--admin-accent)}
        .admin-no-actions strong{font-size:13px;color:var(--admin-text)}
        .admin-no-actions span{font-size:10px;line-height:1.8}
        @media(max-width:600px){.admin-action-toolbar{align-items:flex-start;flex-direction:column;padding:16px}.admin-action-toolbar h1{font-size:18px}.admin-action-item{gap:9px;padding:11px}.admin-action-icon{width:34px;height:34px}.admin-action-copy strong{font-size:11px}.admin-action-count{font-size:9px;padding:5px 7px}}
        .admin-dashboard-page{max-width:1240px;margin:0 auto;display:flex;flex-direction:column;gap:16px;color:var(--admin-text);font-family:Vazirmatn,IRANSansX,Tahoma,system-ui,sans-serif}
        .admin-dashboard-page *{box-sizing:border-box}
        .admin-welcome{min-height:150px;border:1px solid var(--admin-border);background:linear-gradient(110deg,var(--admin-card),var(--admin-inner));border-radius:20px;padding:23px 25px;display:flex;align-items:center;justify-content:space-between;gap:18px;overflow:hidden;position:relative;box-shadow:var(--admin-shadow)}
        .admin-welcome:after{content:"";position:absolute;width:280px;height:280px;border:1px solid var(--admin-accent-soft);border-radius:50%;left:-100px;bottom:-180px;pointer-events:none}
        .admin-welcome-copy{min-width:0;position:relative;z-index:1}
        .admin-eyebrow{color:var(--admin-accent);font-size:10px;font-weight:900;display:flex;align-items:center;gap:7px;margin-bottom:8px}
        .admin-eyebrow span{width:7px;height:7px;border-radius:50%;background:var(--admin-accent);box-shadow:0 0 0 4px var(--admin-accent-soft)}
        .admin-welcome h1{font-size:23px;margin:0 0 7px;font-weight:900;letter-spacing:-.3px}
        .admin-welcome p{margin:0;color:var(--admin-sub);font-size:11px;line-height:1.9}
        .admin-dashboard-updated{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:9px;color:var(--admin-sub)}
        .admin-dashboard-updated svg{color:var(--admin-accent)}
        .admin-welcome-actions{display:flex;flex-direction:column;align-items:center;gap:10px;z-index:1;flex:none}
        .admin-welcome-mark{width:58px;height:58px;border-radius:16px;display:grid;place-items:center;color:var(--admin-accent);background:var(--admin-accent-soft);border:1px solid var(--admin-brand-border)}
        .admin-refresh-button{display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--admin-brand-border);border-radius:10px;padding:8px 10px;background:var(--admin-accent-soft);color:var(--admin-text);font-size:10px;font-weight:850;white-space:nowrap;cursor:pointer}
        .admin-refresh-button:disabled{opacity:.6;cursor:wait}
        .admin-spinning{animation:admin-spin 1s linear infinite}
        @keyframes admin-spin{to{transform:rotate(360deg)}}
        .admin-dashboard-notice{border:1px solid #c38b37;background:rgba(195,139,55,.09);color:var(--admin-text);border-radius:12px;padding:10px 13px;font-size:11px;line-height:1.8}
        .admin-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}
        .admin-stat{min-width:0;border:1px solid var(--admin-border);background:var(--admin-card);color:var(--admin-text);border-radius:15px;padding:15px 13px;display:flex;align-items:center;gap:10px;text-align:right;cursor:pointer;transition:transform .18s,border-color .18s;box-shadow:var(--admin-shadow)}
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
        @media(max-width:600px){.admin-welcome{padding:18px;align-items:flex-start}.admin-welcome h1{font-size:20px}.admin-welcome-actions{gap:8px}.admin-welcome-mark{display:none}.admin-refresh-button{font-size:9px;padding:8px}.admin-stat-grid,.admin-followup-grid{grid-template-columns:1fr}.admin-quick-grid{grid-template-columns:1fr}.admin-panel-card{padding:14px}.admin-transaction-row{flex-wrap:wrap}.admin-transaction-amount{margin-right:40px}.admin-audit-row{align-items:flex-start;flex-wrap:wrap}.admin-audit-row time{margin-right:40px}}
        @media(prefers-reduced-motion:reduce){.admin-dashboard-page *{transition:none!important;animation:none!important}}
      `}</style>
    </div>
  );
};
