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
      const [courses, students, registrations, refunds, exams, tickets, counselors, conversations, logs] = await Promise.all([
        loadList<CourseRow>('/api/courses', isAllowed('courses')),
        loadList<StudentRow>('/api/admin/students', isAllowed('students')),
        loadList<RegistrationRow>('/api/admin/registrations?status=ALL', isAllowed('finance')),
        loadList<RefundRow>('/api/admin/refunds?status=ALL', isAllowed('finance')),
        loadList<ExamRow>('/api/admin/mock-exams', isAllowed('mockExams')),
        loadList<TicketRow>('/api/admin/support/tickets', admin?.role === 'super_admin'),
        loadList<CounselorRow>('/api/admin/counselors', isAllowed('counseling')),
        loadList<ConversationRow>('/api/counseling/conversations', isAllowed('counseling')),
        loadList<AuditRow>('/api/admin/audit-logs', isAllowed('logs')),
      ]);
      setData({ courses, students, registrations, refunds, exams, tickets, counselors, conversations, logs });
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
    { label: 'آزمون‌های آزمایشی', note: 'زمان‌بندی و شرکت‌کنندگان', icon: ClipboardList, tab: 'mockExams' as const, permission: 'mockExams' },
    { label: 'مشاوره و گفتگوها', note: 'مشاوران و مکالمات', icon: CalendarClock, tab: 'counseling' as const, permission: 'counseling' },
    { label: 'پیام‌ها و پرسش‌ها', note: 'پیگیری تیکت‌های هنرجویان', icon: MessageSquare, tab: 'messages' as const, permission: 'messages' },
    { label: 'امور مالی و ثبت‌نام', note: 'شهریه، رسیدها و بازپرداخت', icon: Wallet, tab: 'registrations' as const, permission: 'finance' },
    { label: 'ارسال اطلاعیه', note: 'اطلاع‌رسانی به هنرجویان', icon: Bell, tab: 'notifications' as const, permission: 'notifications' },
    { label: 'گزارش‌های سیستمی', note: 'رویدادهای مدیریتی ثبت‌شده', icon: ShieldAlert, tab: 'logs' as const, permission: 'logs' },
  ].filter(item => item.tab === 'messages' ? admin?.role === 'super_admin' : isAllowed(item.permission));

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

      <section className="admin-followup-grid" aria-label="موارد نیازمند پیگیری">
        {isAllowed('finance') && <>
          <button className="admin-followup-card" onClick={() => onNavigate('registrations')}><span className="admin-followup-icon amber"><FileCheck2 size={17} /></span><span><small>ثبت‌نام‌های نیازمند پیگیری</small><strong>{pendingRegistrations ? numberFa(pendingRegistrations.length) : '—'}</strong></span><ArrowLeft size={14} /></button>
          <button className="admin-followup-card" onClick={() => onNavigate('registrations')}><span className="admin-followup-icon amber"><CreditCard size={17} /></span><span><small>رسیدهای در انتظار بررسی</small><strong>{pendingPayments ? numberFa(pendingPayments.length) : '—'}</strong></span><ArrowLeft size={14} /></button>
          <button className="admin-followup-card" onClick={() => onNavigate('registrations')}><span className="admin-followup-icon amber"><Wallet size={17} /></span><span><small>درخواست‌های بازپرداخت</small><strong>{openRefunds ? numberFa(openRefunds.length) : '—'}</strong></span><ArrowLeft size={14} /></button>
        </>}
        {admin?.role === 'super_admin' && <button className="admin-followup-card" onClick={() => onNavigate('messages')}><span className="admin-followup-icon"><MessageSquare size={17} /></span><span><small>تیکت‌های در انتظار پاسخ</small><strong>{openTickets ? numberFa(openTickets.length) : '—'}</strong></span><ArrowLeft size={14} /></button>}
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel-card">
          <div className="admin-panel-heading"><div><span>دسترسی سریع</span><h2>مدیریت روزانه</h2></div></div>
          <div className="admin-quick-grid">
            {quickLinks.map(item => {
              const Icon = item.icon;
              return <button key={item.tab} onClick={() => onNavigate(item.tab)}><Icon size={17} /><span>{item.label}</span><small>{item.note}</small></button>;
            })}
          </div>
        </section>

        <section className="admin-panel-card">
          <div className="admin-panel-heading"><div><span>نمای کلی</span><h2>دوره‌های آموزشی</h2></div><button onClick={() => onNavigate('courses')}>مشاهده همه <ArrowLeft size={13} /></button></div>
          {activeCourses === null ? <div className="admin-empty">اطلاعات دوره‌ها در دسترس نیست یا مجوز مشاهده آن وجود ندارد.</div> :
            activeCourses.length === 0 ? <div className="admin-empty">در حال حاضر دوره‌ای ثبت نشده است.</div> :
            <div className="admin-course-list">{activeCourses.slice(0, 5).map(course => <button key={course.id} onClick={() => onNavigate('courses')}>
              <span className="admin-course-dot" /><span><strong>{course.title}</strong><small>{course.professor || 'مدرس مشخص نشده'}</small></span><ArrowLeft size={13} />
            </button>)}</div>}
        </section>
      </div>

      <div className="admin-dashboard-grid admin-dashboard-lower">
        <section className="admin-panel-card">
          <div className="admin-panel-heading"><div><span>پیگیری مالی</span><h2>آخرین پرداخت‌ها و رسیدها</h2></div><button onClick={() => onNavigate('registrations')}>گزارش مالی <ArrowLeft size={13} /></button></div>
          {transactions === null ? <div className="admin-empty">اطلاعات مالی در دسترس نیست یا مجوز مشاهده آن وجود ندارد.</div> :
            transactions.length === 0 ? <div className="admin-empty">تراکنشی برای نمایش ثبت نشده است.</div> :
            <div className="admin-transaction-list">{transactions.map(tx => <div key={tx.id} className="admin-transaction-row">
              <span className={'admin-transaction-status ' + (tx.status === 'APPROVED' ? 'success' : tx.status === 'PENDING' ? 'pending' : 'failed')}>{statusText(tx.status)}</span>
              <span className="admin-transaction-copy"><strong>{tx.student}</strong><small>{tx.purpose} · {tx.course}</small><small>{dateFa(tx.date)}</small></span>
              <strong className="admin-transaction-amount">{moneyFa(tx.amount)}</strong>
            </div>)}</div>}
        </section>

        <section className="admin-panel-card">
          <div className="admin-panel-heading"><div><span>آزمون و ارتباطات</span><h2>وضعیت سایر بخش‌ها</h2></div></div>
          <div className="admin-module-status-list">
            {isAllowed('mockExams') && <button onClick={() => onNavigate('mockExams')}><span className="admin-module-icon"><ClipboardList size={16} /></span><span><strong>آزمون‌های آزمایشی</strong><small>{data.exams === null ? 'اطلاعات در دسترس نیست' : numberFa(data.exams.length) + ' آزمون ثبت‌شده'}</small></span><ArrowLeft size={13} /></button>}
            {isAllowed('mockExams') && <button onClick={() => onNavigate('mockExams')}><span className="admin-module-icon"><CalendarClock size={16} /></span><span><strong>آزمون‌های پیش‌رو</strong><small>{upcomingExams === null ? 'اطلاعات در دسترس نیست' : numberFa(upcomingExams.length) + ' آزمون آینده'}</small></span><ArrowLeft size={13} /></button>}
            {isAllowed('counseling') && <button onClick={() => onNavigate('counseling')}><span className="admin-module-icon"><Users size={16} /></span><span><strong>مشاوران فعال</strong><small>{data.counselors === null ? 'اطلاعات در دسترس نیست' : numberFa(data.counselors.filter(c => c.isActive && c.user?.status === 'ACTIVE').length) + ' مشاور فعال'}</small></span><ArrowLeft size={13} /></button>}
            {isAllowed('counseling') && <button onClick={() => onNavigate('counseling')}><span className="admin-module-icon"><MessageSquare size={16} /></span><span><strong>گفتگوهای مشاوره</strong><small>{data.conversations === null ? 'اطلاعات در دسترس نیست' : numberFa(data.conversations.length) + ' گفتگوی ثبت‌شده'}</small></span><ArrowLeft size={13} /></button>}
          </div>
        </section>
      </div>

      {isAllowed('logs') && <section className="admin-panel-card">
        <div className="admin-panel-heading"><div><span>ردپای مدیریتی</span><h2>آخرین رویدادهای سیستمی</h2></div><button onClick={() => onNavigate('logs')}>مشاهده گزارش‌ها <ArrowLeft size={13} /></button></div>
        {data.logs === null ? <div className="admin-empty">گزارش‌های سیستمی در دسترس نیست یا مجوز مشاهده آن وجود ندارد.</div> :
          data.logs.length === 0 ? <div className="admin-empty">رویدادی برای نمایش ثبت نشده است.</div> :
          <div className="admin-audit-list">{[...data.logs].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 5).map(log => <div className="admin-audit-row" key={log.id}>
            <span className="admin-audit-icon"><ShieldAlert size={15} /></span><span className="admin-audit-copy"><strong>{log.action}</strong><small>{log.entityType || 'رویداد سیستمی'} · {log.performedBy || 'کاربر نامشخص'}</small></span><time>{dateFa(log.timestamp)}</time>
          </div>)}</div>}
      </section>}

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
        .admin-stat-grid{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;width:100%;min-width:0;padding:0!important;margin:0!important;background:transparent!important;background-color:transparent!important;background-image:none!important;border:0!important;border-top:0!important;border-radius:0!important;outline:0!important;box-shadow:none!important;filter:none!important}
        .admin-stat-grid::before,.admin-stat-grid::after{display:none!important;content:none!important;background:none!important;background-image:none!important;border:0!important;box-shadow:none!important}
        section.admin-stat-grid,
        .admin-dashboard-page > section.admin-stat-grid{
          display:grid!important;
          width:100%!important;
          max-width:none!important;
          min-width:0!important;
          margin:0!important;
          padding:0!important;
          background:transparent!important;
          background-color:transparent!important;
          background-image:none!important;
          border:0!important;
          outline:0!important;
          border-radius:0!important;
          box-shadow:none!important;
          filter:none!important;
        }
        section.admin-stat-grid::before,
        section.admin-stat-grid::after,
        .admin-dashboard-page > section.admin-stat-grid::before,
        .admin-dashboard-page > section.admin-stat-grid::after{
          display:none!important;
          content:none!important;
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
        @media(prefers-reduced-motion:reduce){.admin-dashboard-page *{transition:none!important;animation:none!important}}
      `}</style>
    </div>
  );
};
