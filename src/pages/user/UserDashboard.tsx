import React, { useEffect, useState } from 'react';
import type { Student, Course } from '../../types';
import { useStore } from '../../store/useStore';
import { BookOpen, LogOut, Video, FileText, Send, Sun, Moon, CheckCircle, Bell, Volume2, Presentation, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface BackendSession {
  id: string;
  title: string;
  sessionNumber: number;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  meetingLink: string | null;
  status: string;
}

interface BackendFile {
  id: string;
  courseId: string;
  sessionId: string | null;
  title: string;
  type: 'PDF' | 'POWERPOINT' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LINK';
  mimeType: string | null;
  fileSize: string | null;
  externalUrl: string | null;
}

interface UserDashboardProps {
  student: Student;
  courses: Course[];
  onLogout: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  student,
  courses,
  onLogout,
}) => {
  const { 
    theme, 
    toggleTheme, 

  } = useStore();

  const [activeTab, setActiveTab] = useState<'courses' | 'notifications' | 'messages'>('courses');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  
  const [offlineMsg, setOfflineMsg] = useState<{ courseId: string; text: string; success: boolean } | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState('');
  const [courseSessions, setCourseSessions] = useState<Record<string, BackendSession[]>>({});
  const [courseFiles, setCourseFiles] = useState<Record<string, BackendFile[]>>({});
  const [contentLoading, setContentLoading] = useState(false);
  const [studentNotifications, setStudentNotifications] = useState<Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    createdAt: string;
    readAt: string | null;
  }>>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [supportTickets, setSupportTickets] = useState<Array<{ id: string; subject: string; status: 'OPEN' | 'ANSWERED' | 'CLOSED'; createdAt: string; messages: Array<{ id: string; content: string; createdAt: string; senderUserId: string }> }>>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [offlineRequests, setOfflineRequests] = useState<Array<{
    id: string;
    courseId: string;
    sessionId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    meetingLink: string | null;
    createdAt: string;
    course: { id: string; title: string };
    session: { id: string; title: string; sessionNumber: number; sessionDate: string; status: string };
  }>>([]);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [editingOfflineRequestId, setEditingOfflineRequestId] = useState<string | null>(null);
  const [editingOfflineSessionId, setEditingOfflineSessionId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const response = await fetch('/api/notifications', {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('دریافت اطلاعیه‌ها انجام نشد.');
        }
        const data = await response.json();
        if (!cancelled) {
          setStudentNotifications(data);
        }
      } catch {
        if (!cancelled) {
          setStudentNotifications([]);
        }
      } finally {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [student.id]);

  useEffect(() => {
    let cancelled = false;

    const loadEnrollments = async () => {
      setCoursesLoading(true);
      setCoursesError('');

      try {
        const response = await fetch('/api/student/enrollments', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('دریافت دوره‌های هنرجو انجام نشد.');
        }

        const enrollments = await response.json();

        const mappedCourses: Course[] = enrollments.map((enrollment: any) => {
          const course = enrollment.course;
          return {
            id: course.id,
            title: course.title,
            professor: course.professor ?? '',
            level: course.level ?? '',
            schedule: '',
            startDate: '',
            description: course.description ?? '',
            term: course.term,
            price: course.price == null ? undefined : Number(course.price),
            category: course.category,
            coverImage: course.coverImage,
            syllabus: [],
          };
        });

        if (!cancelled) {
          setEnrolledCourses(mappedCourses);
          setContentLoading(true);

          const contentResults = await Promise.all(
            mappedCourses.map(async (course) => {
              const [sessionsResponse, filesResponse] = await Promise.all([
                fetch(`/api/courses/${course.id}/sessions`, { credentials: 'include' }),
                fetch(`/api/courses/${course.id}/files`, { credentials: 'include' }),
              ]);

              if (!sessionsResponse.ok || !filesResponse.ok) {
                throw new Error(`دریافت محتوای دوره «${course.title}» انجام نشد.`);
              }

              const sessions = await sessionsResponse.json();
              const files = await filesResponse.json();

              const sessionFiles = await Promise.all(
                sessions.map(async (session: BackendSession) => {
                  const response = await fetch(`/api/sessions/${session.id}/files`, {
                    credentials: 'include',
                  });
                  if (!response.ok) {
                    throw new Error(`دریافت فایل‌های جلسه «${session.title}» انجام نشد.`);
                  }
                  return [session.id, await response.json()] as const;
                }),
              );

              return {
                courseId: course.id,
                sessions: sessions as BackendSession[],
                files: [
                  ...(files as BackendFile[]),
                  ...sessionFiles.flatMap(([sessionId, sessionFiles]) =>
                    (sessionFiles as BackendFile[]).map(file => ({ ...file, sessionId })),
                  ),
                ],
              };
            }),
          );

          if (!cancelled) {
            setCourseSessions(
              Object.fromEntries(contentResults.map(result => [result.courseId, result.sessions])),
            );
            setCourseFiles(
              Object.fromEntries(contentResults.map(result => [result.courseId, result.files])),
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setCoursesError(error instanceof Error ? error.message : 'دریافت دوره‌های هنرجو انجام نشد.');
          setEnrolledCourses([]);
          setCourseSessions({});
          setCourseFiles({});
        }
      } finally {
        if (!cancelled) {
          setCoursesLoading(false);
          setContentLoading(false);
        }
      }
    };

    void loadEnrollments();

    return () => {
      cancelled = true;
    };
  }, [student.id]);

  void courses;

  const studentMessages = supportTickets;
  const studentOfflineRequests = offlineRequests;

  const unreadCount = studentNotifications.filter(n => !n.readAt).length;

  useEffect(() => {
    let cancelled = false;
    const loadOfflineRequests = async () => {
      setOfflineLoading(true);
      try {
        const response = await fetch('/api/offline-requests', { credentials: 'include' });
        if (!response.ok) throw new Error('دریافت درخواست‌های آفلاین انجام نشد.');
        const data = await response.json();
        if (!cancelled) setOfflineRequests(data);
      } catch {
        if (!cancelled) setOfflineRequests([]);
      } finally {
        if (!cancelled) setOfflineLoading(false);
      }
    };
    void loadOfflineRequests();
    return () => { cancelled = true; };
  }, [student.id]);

  useEffect(() => {
    if (activeTab !== 'messages') return;
    let cancelled = false;
    const loadSupportTickets = async () => {
      setSupportLoading(true);
      setSupportError('');
      try {
        const response = await fetch('/api/support/tickets', { credentials: 'include' });
        if (!response.ok) throw new Error('دریافت تیکت‌های پشتیبانی انجام نشد.');
        const data = await response.json();
        if (!cancelled) setSupportTickets(data);
      } catch (error) {
        if (!cancelled) {
          setSupportError(error instanceof Error ? error.message : 'دریافت تیکت‌های پشتیبانی انجام نشد.');
          setSupportTickets([]);
        }
      } finally {
        if (!cancelled) setSupportLoading(false);
      }
    };
    void loadSupportTickets();
    return () => { cancelled = true; };
  }, [activeTab, student.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim() || supportSubmitting) return;
    setSupportSubmitting(true);
    setSupportError('');
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), content: content.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'ثبت تیکت انجام نشد.');
      }
      const ticket = await response.json();
      setSupportTickets(current => [ticket, ...current]);
      setSubject('');
      setContent('');
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
    } catch (error) {
      setSupportError(error instanceof Error ? error.message : 'ثبت تیکت انجام نشد.');
    } finally {
      setSupportSubmitting(false);
    }
  };

  const handleOfflineRequestSubmit = async (courseId: string) => {
    const selectEl = document.getElementById(`session-select-${courseId}`) as HTMLSelectElement;
    const sessionId = selectEl?.value;

    if (!sessionId) {
      setOfflineMsg({ courseId, text: 'لطفاً ابتدا جلسه مورد نظر را انتخاب کنید.', success: false });
      setTimeout(() => setOfflineMsg(null), 4000);
      return;
    }

    try {
      const response = await fetch('/api/offline-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, sessionId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'ثبت درخواست انجام نشد.');
      setOfflineRequests(current => [data, ...current]);
      setOfflineMsg({ courseId, text: 'درخواست آفلاین با موفقیت ثبت شد.', success: true });
    } catch (error) {
      setOfflineMsg({ courseId, text: error instanceof Error ? error.message : 'ثبت درخواست انجام نشد.', success: false });
    }
    setTimeout(() => setOfflineMsg(null), 4000);
  };

  const handleEditOfflineRequest = async (request: typeof offlineRequests[number]) => {
    if (!editingOfflineSessionId || editingOfflineSessionId === request.sessionId) {
      setEditingOfflineRequestId(null);
      return;
    }
    try {
      const response = await fetch(`/api/offline-requests/${request.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: request.courseId, sessionId: editingOfflineSessionId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'ویرایش درخواست انجام نشد.');
      setOfflineRequests(current => current.map(item => item.id === request.id ? data : item));
      setOfflineMsg({ courseId: request.courseId, text: 'درخواست با موفقیت ویرایش شد.', success: true });
      setEditingOfflineRequestId(null);
      setEditingOfflineSessionId('');
    } catch (error) {
      setOfflineMsg({ courseId: request.courseId, text: error instanceof Error ? error.message : 'ویرایش درخواست انجام نشد.', success: false });
    }
    setTimeout(() => setOfflineMsg(null), 4000);
  };

  const handleDeleteOfflineRequest = async (request: typeof offlineRequests[number]) => {
    if (!confirm('آیا از حذف این درخواست اطمینان دارید؟')) return;
    try {
      const response = await fetch(`/api/offline-requests/${request.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'حذف درخواست انجام نشد.');
      setOfflineRequests(current => current.filter(item => item.id !== request.id));
      setOfflineMsg({ courseId: request.courseId, text: 'درخواست حذف شد.', success: true });
    } catch (error) {
      setOfflineMsg({ courseId: request.courseId, text: error instanceof Error ? error.message : 'حذف درخواست انجام نشد.', success: false });
    }
    setTimeout(() => setOfflineMsg(null), 4000);
  };

  const handleOpenNotificationTab = async () => {
    setActiveTab('notifications');

    const unreadNotifications = studentNotifications.filter(n => !n.readAt);
    if (unreadNotifications.length === 0) return;

    await Promise.all(
      unreadNotifications.map(async (notification) => {
        const response = await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'POST',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setStudentNotifications(current =>
            current.map(item =>
              item.id === notification.id ? { ...item, readAt: data.readAt } : item,
            ),
          );
        }
      }),
    );
  };

  const isDark = theme === 'dark';
  const bgColors = isDark ? '#050505' : '#f8fafc';
  const cardBg = isDark ? 'rgba(14, 14, 17, 0.75)' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const subText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
  const innerCardBg = isDark ? 'rgba(20, 20, 25, 0.8)' : '#f1f5f9';

  return (
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: bgColors, color: textColor, direction: 'rtl', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box', margin: 0, padding: '40px', overflowY: 'auto' }}>
      
      {/* هدر پنل دانشجو */}
      <div style={{ maxWidth: '1100px', margin: '0 auto 30px auto', background: 'linear-gradient(135deg, rgba(109, 0, 26, 0.25) 0%, rgba(10, 10, 10, 0.85) 100%)', border: '1px solid rgba(109, 0, 26, 0.4)', padding: '28px 36px', borderRadius: '24px', backdropFilter: 'blur(16px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0' }}>سامانه آموزشی شمسه - پنل دانشجو</h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>خوش آمدید، <strong style={{ color: '#ff3366' }}>{student.fullName}</strong> (کد ملی: {student.nationalId})</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={toggleTheme} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', border: `1px solid ${borderColor}`, color: textColor, padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
            {isDark ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#64748b" />}
            {isDark ? 'حالت روز' : 'حالت شب'}
          </button>
          
          <button onClick={onLogout} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
            <LogOut size={16} /> خروج از حساب
          </button>
        </div>
      </div>

      {/* تب‌بندی ناوبری پنل */}
      <div style={{ maxWidth: '1100px', margin: '0 auto 20px auto', display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => setActiveTab('courses')}
          style={{ padding: '10px 20px', borderRadius: '12px', border: `1px solid ${borderColor}`, backgroundColor: activeTab === 'courses' ? '#6D001A' : cardBg, color: textColor, fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
        >
          دوره‌های آموزشی من
        </button>
        <button 
          onClick={handleOpenNotificationTab}
          style={{ padding: '10px 20px', borderRadius: '12px', border: `1px solid ${borderColor}`, backgroundColor: activeTab === 'notifications' ? '#6D001A' : cardBg, color: textColor, fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Bell size={14} /> صندوق اطلاعیه‌ها 
          {unreadCount > 0 && (
            <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '50%', fontWeight: 800 }}>
              {unreadCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          style={{ padding: '10px 20px', borderRadius: '12px', border: `1px solid ${borderColor}`, backgroundColor: activeTab === 'messages' ? '#6D001A' : cardBg, color: textColor, fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
        >
          ارسال پیام و تیکت پشتیبانی
        </button>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {activeTab === 'courses' && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(16px)', padding: '32px', borderRadius: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: textColor, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="#ff3366" /> دوره‌های آموزشی من ({enrolledCourses.length})
            </h2>

            {coursesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: subText, fontSize: '13px' }}>
                در حال دریافت دوره‌های شما...
              </div>
            ) : coursesError ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#f87171', fontSize: '13px' }}>
                {coursesError}
              </div>
            ) : enrolledCourses.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {enrolledCourses.map(course => {
                  const files = courseFiles[course.id] || [];
                  const sessions = courseSessions[course.id] || [];
                  const courseRequests = studentOfflineRequests.filter(request => request.courseId === course.id);
                  const usedOffline = courseRequests.length;
                  const remainingOffline = Math.max(0, 3 - usedOffline);

                  return (
                    <div key={course.id} style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 900, color: textColor, margin: 0 }}>{course.title}</h3>
                        <span style={{ fontSize: '10px', backgroundColor: 'rgba(109, 0, 26, 0.2)', color: '#ff3366', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>{course.level}</span>
                      </div>

                      <p style={{ fontSize: '12px', color: subText, margin: 0 }}>استاد مدرس: <strong>{course.professor}</strong></p>
                                            {sessions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <span style={{ fontSize: '11px', color: subText, fontWeight: 700 }}>
                            جلسات دوره: {sessions.length} جلسه
                          </span>
                          {sessions.slice(0, 3).map(session => (
                            <span key={session.id} style={{ fontSize: '10px', color: subText }}>
                              جلسه {session.sessionNumber}: {session.title}
                              {session.startTime ? ` — ${session.startTime}` : ''}
                            </span>
                          ))}
                          {sessions.length > 3 && (
                            <span style={{ fontSize: '10px', color: '#ff3366' }}>
                              + {sessions.length - 3} جلسه دیگر
                            </span>
                          )}
                        </div>
                      )}
                      {contentLoading && (
                        <span style={{ fontSize: '10px', color: subText }}>در حال دریافت محتوای دوره...</span>
                      )}
                      <p style={{ fontSize: '12px', color: textColor, margin: 0, lineHeight: 1.5 }}>{course.description}</p>

                      {course.adobeConnectUrl && (
                        <a href={course.adobeConnectUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#6D001A', color: '#fff', padding: '10px', borderRadius: '12px', textDecoration: 'none', fontSize: '12px', fontWeight: 800, marginTop: '4px', boxShadow: '0 4px 12px rgba(109,0,26,0.3)' }}>
                          <Video size={16} /> ورود به کلاس آنلاین (ادوبی کانکت)
                        </a>
                      )}

                      {/* بخش درخواست کلاس آفلاین همراه با لیست انتخاب جلسه */}
                      <div style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)', padding: '16px', borderRadius: '12px', border: `1px solid ${borderColor}`, marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: subText, fontWeight: 700 }}>درخواست کلاس آفلاین / رفع اشکال:</span>
                          <span style={{ fontSize: '11px', color: remainingOffline > 0 ? '#10b981' : '#f87171', fontWeight: 800 }}>
                            {usedOffline} از ۳ استفاده شده ({remainingOffline} باقی‌مانده)
                          </span>
                        </div>

                        <select 
                          id={`session-select-${course.id}`}
                          disabled={remainingOffline === 0}
                          style={{ width: '100%', backgroundColor: cardBg, border: `1px solid ${borderColor}`, color: textColor, padding: '10px 12px', borderRadius: '10px', fontSize: '11px', outline: 'none' }}
                        >
                          <option value="">انتخاب جلسه مربوطه...</option>
                          {sessions.length > 0 ? (
                            sessions.map(session => (
                              <option key={session.id} value={session.id}>
                                جلسه {session.sessionNumber}: {session.title}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>هنوز جلسه‌ای برای این دوره ثبت نشده است.</option>
                          )}
                        </select>

                        <button 
                          onClick={() => handleOfflineRequestSubmit(course.id)}
                          disabled={remainingOffline === 0}
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: remainingOffline > 0 ? '#2563eb' : '#475569', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: remainingOffline > 0 ? 'pointer' : 'not-allowed' }}
                        >
                          {remainingOffline > 0 ? 'ثبت درخواست برای جلسه انتخابی' : 'سقف درخواست به پایان رسیده است'}
                        </button>

                        {offlineMsg && offlineMsg.courseId === course.id && (
                          <div style={{ marginTop: '4px', fontSize: '10px', color: offlineMsg.success ? '#10b981' : '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {offlineMsg.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                            {offlineMsg.text}
                          </div>
                        )}
                      </div>

                      {/* نمایش وضعیت درخواست‌های آفلاین و امکان ویرایش/حذف در حالت انتظار */}
                      <div style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)', padding: '14px', borderRadius: '12px', border: `1px solid ${borderColor}`, marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: subText, fontWeight: 700, display: 'block', marginBottom: '8px' }}>وضعیت درخواست‌های این دوره:</span>
                        {offlineLoading ? (
                          <span style={{ fontSize: '10px', color: subText }}>در حال دریافت وضعیت درخواست‌ها...</span>
                        ) : courseRequests.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {courseRequests.map(req => (
                              <div key={req.id} style={{ backgroundColor: cardBg, padding: '10px', borderRadius: '8px', border: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                <div>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: textColor, display: 'block' }}>جلسه {req.session.sessionNumber}: {req.session.title}</span>
                                  <span style={{ fontSize: '9px', color: subText }}>ثبت: {new Date(req.createdAt).toLocaleString('fa-IR')}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: req.status === 'APPROVED' ? '#34d399' : req.status === 'REJECTED' ? '#f87171' : '#fbbf24' }}>
                                    {req.status === 'APPROVED' ? 'تأیید شده' : req.status === 'REJECTED' ? 'رد شده' : 'در انتظار بررسی'}
                                  </span>
                                  {req.status === 'PENDING' && (
                                    <>
                                      {editingOfflineRequestId === req.id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', marginTop: '4px' }}>
                                          <select value={editingOfflineSessionId} onChange={e => setEditingOfflineSessionId(e.target.value)} style={{ backgroundColor: innerCardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '5px 8px', borderRadius: '6px', fontSize: '9px' }}>
                                            <option value="">انتخاب جلسه جدید...</option>
                                            {sessions.map(session => <option key={session.id} value={session.id}>جلسه {session.sessionNumber}: {session.title}</option>)}
                                          </select>
                                          <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => void handleEditOfflineRequest(req)} style={{ backgroundColor: 'rgba(52,211,153,.1)', color: '#34d399', border: '1px solid rgba(52,211,153,.2)', padding: '3px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}>ذخیره</button>
                                            <button onClick={() => { setEditingOfflineRequestId(null); setEditingOfflineSessionId(''); }} style={{ backgroundColor: 'rgba(255,255,255,.05)', color: subText, border: `1px solid ${borderColor}`, padding: '3px 8px', borderRadius: '6px', fontSize: '9px', cursor: 'pointer' }}>انصراف</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                          <button onClick={() => { setEditingOfflineRequestId(req.id); setEditingOfflineSessionId(req.sessionId); }} style={{ backgroundColor: 'rgba(56,189,248,.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,.2)', padding: '3px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}>ویرایش</button>
                                          <button onClick={() => void handleDeleteOfflineRequest(req)} style={{ backgroundColor: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)', padding: '3px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}>حذف</button>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {req.status === 'APPROVED' && req.meetingLink && (
                                    <a href={req.meetingLink} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', fontSize: '10px', fontWeight: 700 }}>
                                      ورود به جلسه تأیید شده
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '10px', color: subText }}>هنوز درخواستی برای این دوره ثبت نکرده‌اید.</span>
                        )}
                      </div>

                      {files.length > 0 && (
                        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '10px' }}>
                          <span style={{ fontSize: '11px', color: subText, fontWeight: 700, display: 'block', marginBottom: '6px' }}>فایل‌ها و جزوات آموزشی:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {files.map(file => (
                              <div 
                                key={file.id}
                                onClick={() => {
                                  if (file.externalUrl) {
                                    window.open(file.externalUrl, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: cardBg, padding: '8px 12px', borderRadius: '8px', cursor: file.externalUrl ? 'pointer' : 'default', border: `1px solid ${borderColor}` }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {file.type === 'PDF' && <FileText size={14} color="#ef4444" />}
                                  {file.type === 'POWERPOINT' && <Presentation size={14} color="#f59e0b" />}
                                  {file.type === 'AUDIO' && <Volume2 size={14} color="#10b981" />}
                                  {file.type === 'VIDEO' && <Video size={14} color="#3b82f6" />}
                                  {file.type === 'LINK' && <LinkIcon size={14} color="#a855f7" />}
                                  {file.type === 'DOCUMENT' && <FileText size={14} color="#64748b" />}
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: textColor }}>{file.title}</span>
                                </div>
                                <span style={{ fontSize: '9px', color: file.externalUrl ? '#ff3366' : subText, fontWeight: 700 }}>
                                  {file.externalUrl ? 'مشاهده' : 'فایل داخلی'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: subText, fontSize: '13px' }}>
                شما هنوز به هیچ دوره‌ای دسترسی ندارید. لطفاً با مدیر سیستم تماس بگیرید.
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(16px)', padding: '32px', borderRadius: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: textColor, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="#ff3366" /> صندوق اطلاعیه‌ها و پیام‌های سیستمی
            </h2>

            {notificationsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: subText, fontSize: '13px' }}>
                در حال دریافت اطلاعیه‌ها...
              </div>
            ) : studentNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: subText, fontSize: '13px' }}>
                هیچ اطلاعیه‌ای وجود ندارد.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {studentNotifications.map(n => (
                  <div key={n.id} style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, color: textColor, margin: 0 }}>{n.title}</h4>
                      <span style={{ fontSize: '10px', color: subText }}>
                        {new Date(n.createdAt).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: subText, margin: 0, lineHeight: 1.6 }}>{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(16px)', padding: '32px', borderRadius: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: textColor, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} color="#ff3366" /> ارسال پیام یا سوال به پشتیبانی
            </h2>

            {successMsg && (
              <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '12px', borderRadius: '12px', fontSize: '12px', marginBottom: '16px', border: '1px solid rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <CheckCircle size={16} /> پیام شما با موفقیت ثبت شد و به زودی توسط پشتیبانی پاسخ داده خواهد شد.
              </div>
            )}

            {supportError && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '12px', borderRadius: '12px', fontSize: '12px', marginBottom: '16px' }}>{supportError}</div>}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: subText, display: 'block', marginBottom: '6px', fontWeight: 700 }}>موضوع پیام *</label>
                <input 
                  type="text" 
                  placeholder="مثلا: مشکل در باز شدن لینک کلاس" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  required 
                  style={{ width: '100%', backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, color: textColor, padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: subText, display: 'block', marginBottom: '6px', fontWeight: 700 }}>متن پیام *</label>
                <textarea 
                  placeholder="متن خود را اینجا بنویسید..." 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  rows={4} 
                  required 
                  style={{ width: '100%', backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, color: textColor, padding: '12px 16px', borderRadius: '12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} 
                />
              </div>
              <button type="submit" disabled={supportSubmitting} style={{ padding: '14px', background: 'linear-gradient(135deg, #6D001A 0%, #a21c3a 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '13px', cursor: supportSubmitting ? 'wait' : 'pointer', opacity: supportSubmitting ? 0.7 : 1, boxShadow: '0 8px 20px rgba(109, 0, 26, 0.4)' }}>
                {supportSubmitting ? 'در حال ثبت...' : 'ارسال پیام به پشتیبانی'}
              </button>
            </form>

            <div style={{ marginTop: '30px', borderTop: `1px solid ${borderColor}`, paddingTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: textColor, margin: '0 0 16px 0' }}>تاریخچه تیکت‌های شما</h3>
              {supportLoading ? (
                <div style={{ textAlign: 'center', padding: '25px 0', color: subText, fontSize: '12px' }}>در حال دریافت تیکت‌ها...</div>
              ) : studentMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '25px 0', color: subText, fontSize: '12px' }}>هنوز تیکتی ثبت نکرده‌اید.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {studentMessages.map(ticket => (
                    <div key={ticket.id} style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: textColor }}>موضوع: {ticket.subject}</span>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', backgroundColor: ticket.status === 'ANSWERED' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: ticket.status === 'ANSWERED' ? '#34d399' : '#f87171', fontWeight: 700 }}>
                          {ticket.status === 'ANSWERED' ? 'پاسخ داده شده' : ticket.status === 'CLOSED' ? 'بسته شده' : 'در انتظار پاسخ'}
                        </span>
                      </div>
                      {ticket.messages.map(message => (
                        <div key={message.id} style={{ backgroundColor: cardBg, padding: '10px', borderRadius: '9px' }}>
                          <p style={{ fontSize: '12px', color: textColor, margin: 0 }}>{message.content}</p>
                          <span style={{ fontSize: '9px', color: subText }}>{new Date(message.createdAt).toLocaleString('fa-IR')}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};