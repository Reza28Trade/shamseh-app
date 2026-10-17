import React, { useCallback, useEffect, useState } from 'react';
import type { Admin } from '../../types';
import {
  ArrowLeft, CalendarClock, ClipboardList,
  CreditCard, FileCheck2, RefreshCw, Wallet, MessageSquare,
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
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin, onNavigate }) => {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
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
    } catch {
      setRefreshError('بروزرسانی داشبورد کامل نشد. بخش‌هایی که داده معتبر دریافت نکرده‌اند با خط تیره مشخص می‌شوند.');
    } finally {
      setLoading(false);
    }
  }, [admin?.role, isAllowed, loadList]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const pendingRegistrations = data.registrations?.filter(item => item.status === 'PENDING_REVIEW' || item.status === 'NEEDS_CORRECTION') ?? null;
  const pendingPayments = data.registrations?.flatMap(item => item.payments || []).filter(payment => payment.status === 'PENDING') ?? null;
  const openRefunds = data.refunds?.filter(item => item.status === 'REQUESTED' || item.status === 'RESERVED') ?? null;
  const openTickets = data.tickets?.filter(item => item.status === 'OPEN') ?? null;
  const pendingOfflineRequests = data.offlineRequests?.filter(item => item.status === 'PENDING') ?? null;
  const pendingCounselingRequests = data.counselingRequests?.filter(item => item.status === 'PENDING') ?? null;
  const openManagementTickets = data.managementTickets?.filter(item => item.status === 'OPEN') ?? null;
  const actionItems = [
    ...(isAllowed('finance') ? [{
      id: 'pending-registrations', label: 'ثبت‌نام‌های نیازمند بررسی', detail: 'بررسی اطلاعات ثبت‌نام و موارد نیازمند اصلاح',
      count: pendingRegistrations?.length ?? null, status: pendingRegistrations ? (pendingRegistrations.length ? 'نیازمند اقدام مدیر' : 'اقدامی لازم نیست') : 'وضعیت دریافت نشد', tab: 'registrations' as const, icon: FileCheck2,
    }] : []),
    ...(isAllowed('finance') ? [{
      id: 'pending-payments', label: 'رسیدهای پرداخت در انتظار تأیید', detail: 'بررسی رسیدها و تعیین وضعیت پرداخت',
      count: pendingPayments?.length ?? null, status: pendingPayments ? (pendingPayments.length ? 'نیازمند اقدام مدیر' : 'اقدامی لازم نیست') : 'وضعیت دریافت نشد', tab: 'registrations' as const, icon: CreditCard,
    }] : []),
    ...(isAllowed('finance') ? [{
      id: 'open-refunds', label: 'درخواست‌های بازپرداخت', detail: 'بررسی درخواست‌های باز یا مبلغ رزروشده',
      count: openRefunds?.length ?? null, status: openRefunds ? (openRefunds.length ? 'نیازمند اقدام مدیر' : 'اقدامی لازم نیست') : 'وضعیت دریافت نشد', tab: 'registrations' as const, icon: Wallet,
    }] : []),
    ...(admin?.role === 'super_admin' ? [{
      id: 'open-tickets', label: 'تیکت‌های پشتیبانی باز', detail: 'بررسی پیام‌ها و پاسخ‌گویی به هنرجویان',
      count: openTickets?.length ?? null, status: openTickets ? (openTickets.length ? 'نیازمند اقدام مدیر' : 'اقدامی لازم نیست') : 'وضعیت دریافت نشد', tab: 'messages' as const, icon: MessageSquare,
    }] : []),
    ...(isAllowed('offlineRequests') ? [{
      id: 'offline-requests', label: 'درخواست‌های آفلاین در انتظار', detail: 'بررسی درخواست دسترسی به جلسات آفلاین',
      count: pendingOfflineRequests?.length ?? null, status: pendingOfflineRequests ? (pendingOfflineRequests.length ? 'نیازمند اقدام مدیر' : 'اقدامی لازم نیست') : 'وضعیت دریافت نشد', tab: 'offlineRequests' as const, icon: ClipboardList,
    }] : []),
    ...(isAllowed('counseling') ? [{
      id: 'counseling-requests', label: 'درخواست‌های مشاوره در انتظار', detail: 'بررسی و تعیین تکلیف درخواست‌های مشاوره',
      count: pendingCounselingRequests?.length ?? null, status: pendingCounselingRequests ? (pendingCounselingRequests.length ? 'نیازمند اقدام مدیر' : 'اقدامی لازم نیست') : 'وضعیت دریافت نشد', tab: 'counseling' as const, icon: CalendarClock,
    }] : []),
    ...(admin?.role === 'super_admin' ? [{
      id: 'management-tickets', label: 'انتقادات و پیشنهادات نیازمند پاسخ', detail: 'بررسی پیام‌های باز ارسال‌شده برای مدیریت',
      count: openManagementTickets?.length ?? null, status: openManagementTickets ? (openManagementTickets.length ? 'نیازمند اقدام مدیر' : 'اقدامی لازم نیست') : 'وضعیت دریافت نشد', tab: 'managementContact' as const, icon: MessageSquare,
    }] : []),
  ];

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-controls">
        <button className="admin-refresh-button" onClick={() => void loadDashboard()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'admin-spinning' : ''} />
          {loading ? 'در حال بروزرسانی' : 'بروزرسانی اطلاعات'}
        </button>
      </div>

      {refreshError && <div className="admin-dashboard-notice" role="status">{refreshError}</div>}

      {loading && actionItems.length === 0 ? (
        <div className="admin-no-actions"><RefreshCw size={20} className="admin-spinning" /><strong>در حال دریافت وضعیت بخش‌های پنل…</strong></div>
      ) : (
        <section className="admin-action-grid" aria-label="وضعیت بخش‌های نیازمند پیگیری">
          {actionItems.map(item => {
            const Icon = item.icon;
            const needsAction = item.count !== null && item.count > 0;
            return (
              <button key={item.id} className={`admin-action-card ${needsAction ? 'needs-action' : item.count === null ? 'unknown' : 'all-clear'}`} onClick={() => onNavigate(item.tab)}>
                <span className="admin-action-card-top">
                  <span className="admin-action-icon"><Icon size={19} /></span>
                  <span className={`admin-action-status ${needsAction ? 'pending' : item.count === null ? 'unknown' : 'clear'}`}>{item.status}</span>
                </span>
                <span className="admin-action-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
                <span className="admin-action-card-bottom">
                  <strong>{numberFa(item.count)}</strong>
                  <small>{item.count === null ? 'مورد قابل بررسی نیست' : 'مورد'}</small>
                  <ArrowLeft size={16} className="admin-action-arrow" />
                </span>
              </button>
            );
          })}
        </section>
      )}

      <style>{`
        .admin-dashboard-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 2px 2px}
        
        
        
        
        .admin-action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .admin-action-card{display:flex;flex-direction:column;align-items:stretch;gap:13px;width:100%;min-width:0;min-height:148px;padding:15px 16px;border:1px solid var(--admin-border);border-radius:15px;background:var(--admin-card);color:var(--admin-text);text-align:right;cursor:pointer;box-shadow:var(--admin-shadow);transition:border-color .18s,transform .18s}.admin-action-card.needs-action{border-right:3px solid #c58a27}.admin-action-card.all-clear{border-right:3px solid #23946e}.admin-action-card.unknown{border-right:3px solid var(--admin-sub)}.admin-action-card-top,.admin-action-card-bottom{display:flex;align-items:center;gap:9px}.admin-action-card-top{justify-content:space-between}.admin-action-card-bottom{padding-top:10px;border-top:1px solid var(--admin-border)}.admin-action-card-bottom>strong{font-size:19px;font-weight:900}.admin-action-card-bottom>small{font-size:9px;color:var(--admin-sub);flex:1}.admin-action-status{font-size:9px;font-weight:850;padding:5px 8px;border-radius:8px;white-space:nowrap}.admin-action-status.pending{background:rgba(197,138,39,.13);color:#c58a27}.admin-action-status.clear{background:rgba(35,148,110,.12);color:#23946e}.admin-action-status.unknown{background:var(--admin-inner);color:var(--admin-sub)}
        .admin-action-card:hover{border-color:var(--admin-accent);transform:translateY(-1px)}
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
        @media(max-width:680px){.admin-action-grid{grid-template-columns:1fr}.admin-dashboard-controls{align-items:flex-start;flex-direction:column}.admin-action-card{min-height:130px;padding:13px}.admin-action-icon{width:34px;height:34px}.admin-action-copy strong{font-size:11px}}
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
