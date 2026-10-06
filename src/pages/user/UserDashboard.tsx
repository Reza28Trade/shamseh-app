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
    sendStudentMessage, 
    messages, 
    notifications, 
    offlineRequests, 
    offlineRequestsList,
    requestOfflineClass, 
    updateOfflineRequest,
    deleteOfflineRequest,
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

  const studentMessages = messages.filter(m => m.studentId === student.id);
  const studentOfflineRequests = offlineRequestsList ? offlineRequestsList.filter(r => r.studentId === student.id) : [];

  const unreadCount = studentNotifications.filter(n => !n.readAt).length;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !content) return;

    sendStudentMessage({
      studentId: student.id,
      studentName: student.fullName,
      subject,
      content,
    });

    setSubject('');
    setContent('');
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 4000);
  };

  const handleOfflineRequestSubmit = (courseId: string) => {
    const selectEl = document.getElementById(`session-select-${courseId}`) as HTMLSelectElement;
    const sessionTitle = selectEl?.value;

    if (!sessionTitle) {
      setOfflineMsg({ courseId, text: 'لطفاً ابتدا جلسه یا سرفصل مورد نظر را انتخاب کنید.', success: false });
      setTimeout(() => setOfflineMsg(null), 4000);
      return;
    }

    const result = requestOfflineClass(student.id, courseId, sessionTitle);
    setOfflineMsg({ courseId, text: result.message, success: result.success });
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
                  const usedOffline = offlineRequests[student.id]?.[course.id] || 0;
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
                              <option key={session.id} value={session.title}>
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
                        {studentOfflineRequests.filter(r => r.courseTitle.includes(course.title)).length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {studentOfflineRequests.filter(r => r.courseTitle.includes(course.title)).map(req => (
                              <div key={req.id} style={{ backgroundColor: cardBg, padding: '10px', borderRadius: '8px', border: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                <div>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: textColor, display: 'block' }}>{req.sessionTitle}</span>
                                  <span style={{ fontSize: '9px', color: subText }}>ثبت: {req.createdAt}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: req.status === 'approved' ? '#34d399' : req.status === 'rejected' ? '#f87171' : '#fbbf24' }}>
                                    {req.status === 'approved' ? 'تأیید شده' : req.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}
                                  </span>

                                  {req.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                      <button 
                                        onClick={() => {
                                          const newTitle = prompt('ویرایش عنوان جلسه:', req.sessionTitle);
                                          if (newTitle) updateOfflineRequest(req.id, newTitle);
                                        }}
                                        style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '3px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        ویرایش
                                      </button>
                                      <button 
                                        onClick={() => {
                                          if (confirm('آیا از لغو این درخواست اطمینان دارید؟')) {
                                            deleteOfflineRequest(req.id);
                                          }
                                        }}
                                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '3px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        لغو
                                      </button>
                                    </div>
                                  )}

                                  {req.status === 'approved' && req.meetingLink && (
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
              <button type="submit" style={{ padding: '14px', background: 'linear-gradient(135deg, #6D001A 0%, #a21c3a 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(109, 0, 26, 0.4)' }}>
                ارسال پیام به پشتیبانی
              </button>
            </form>

            {studentMessages.length > 0 && (
              <div style={{ marginTop: '30px', borderTop: `1px solid ${borderColor}`, paddingTop: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: textColor, margin: '0 0 16px 0' }}>تاریخچه پیام‌های شما</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {studentMessages.map(msg => (
                    <div key={msg.id} style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: textColor }}>موضوع: {msg.subject}</span>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', backgroundColor: msg.status === 'answered' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: msg.status === 'answered' ? '#34d399' : '#f87171', fontWeight: 700 }}>
                          {msg.status === 'answered' ? 'پاسخ داده شده' : 'در انتظار پاسخ'}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: subText, margin: 0 }}>{msg.content}</p>
                      <span style={{ fontSize: '10px', color: subText }}>تاریخ: {msg.createdAt}</span>

                      {msg.adminReply && (
                        <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '12px', borderRadius: '10px', marginTop: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 800, display: 'block', marginBottom: '4px' }}>پاسخ پشتیبانی:</span>
                          <p style={{ fontSize: '12px', color: textColor, margin: 0 }}>{msg.adminReply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};