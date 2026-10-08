import React, { useEffect, useState } from 'react';
import type { Student, Course } from '../../types';
import { useStore } from '../../store/useStore';
import { FileViewer } from '../../components/FileViewer';
import { BookOpen, LogOut, Video, FileText, Send, Sun, Moon, CheckCircle, Bell, Volume2, Presentation, Link as LinkIcon, AlertCircle, CalendarClock, Clock, ClipboardList, ExternalLink, Home } from 'lucide-react';

interface BackendSession {
  id: string;
  courseId: string;
  sessionNumber: number;
  createdAt: string;
  updatedAt: string;
}

interface BackendFile {
  id: string;
  courseId: string;
  title: string;
  type: 'PDF' | 'POWERPOINT' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LINK';
  mimeType: string | null;
  fileSize: string | null;
  externalUrl: string | null;
  streamUrl: string | null;
}

interface BackendMockExam {
  id: string;
  title: string;
  level: string | null;
  field: string | null;
  examDate: string;
  examUrl: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'LINK_AVAILABLE' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

interface UserDashboardProps {
  student: Student;
  courses: Course[];
  onLogout: () => void;
}

const ShamsehMark: React.FC<{ size?: number; opacity?: number }> = ({ size = 46, opacity = 1 }) => (
  <svg viewBox="0 0 2000 2000" width={size} height={size} aria-hidden="true" style={{ display: 'block', opacity }}>
    <g fill="#3c8d95"><path d="M 449,873 L 450,882 L 463,888 L 549,904 L 654,916 L 660,922 L 659,928 L 623,972 L 628,997 L 628,1019 L 622,1034 L 605,1048 L 572,1064 L 543,1073 L 511,1078 L 451,1154 L 450,1163 L 464,1170 L 528,1184 L 652,1197 L 659,1205 L 666,1231 L 676,1250 L 703,1279 L 742,1300 L 799,1313 L 874,1315 L 959,1303 L 1040,1279 L 1112,1246 L 1120,1247 L 1124,1251 L 1128,1275 L 1137,1293 L 1147,1303 L 1162,1310 L 1183,1311 L 1208,1302 L 1229,1287 L 1256,1259 L 1260,1259 L 1294,1282 L 1339,1301 L 1385,1311 L 1437,1312 L 1447,1302 L 1446,1272 L 1439,1228 L 1425,1184 L 1411,1159 L 1398,1144 L 1383,1133 L 1365,1126 L 1335,1127 L 1308,1142 L 1266,1187 L 1257,1189 L 1241,1175 L 1223,1149 L 1211,1119 L 1210,1096 L 1231,1065 L 1248,1051 L 1256,1056 L 1265,1073 L 1276,1082 L 1293,1089 L 1316,1090 L 1333,1086 L 1355,1075 L 1392,1040 L 1400,1043 L 1409,1065 L 1425,1080 L 1448,1089 L 1481,1088 L 1510,1076 L 1528,1061 L 1536,1048 L 1549,1009 L 1549,996 L 1542,980 L 1542,972 L 1549,959 L 1548,952 L 1494,888 L 1484,889 L 1476,900 L 1470,917 L 1469,932 L 1479,962 L 1518,1009 L 1514,1019 L 1503,1023 L 1472,1026 L 1450,1021 L 1437,1014 L 1426,1003 L 1419,984 L 1412,980 L 1406,981 L 1366,1007 L 1345,1013 L 1320,1012 L 1306,1005 L 1297,995 L 1292,981 L 1291,956 L 1283,950 L 1272,951 L 1243,981 L 1224,1008 L 1208,1039 L 1196,1076 L 1191,1113 L 1194,1156 L 1206,1192 L 1225,1223 L 1225,1229 L 1219,1236 L 1204,1242 L 1184,1242 L 1167,1232 L 1157,1212 L 1157,1185 L 1148,1175 L 1142,1175 L 1077,1209 L 1031,1226 L 967,1242 L 904,1250 L 842,1251 L 773,1243 L 734,1229 L 707,1207 L 705,1200 L 708,1198 L 781,1197 L 784,1204 L 773,1218 L 773,1223 L 782,1226 L 841,1148 L 835,1140 L 689,1141 L 684,1137 L 684,996 L 681,958 L 675,930 L 676,923 L 681,919 L 832,927 L 836,934 L 838,960 L 846,988 L 855,1006 L 874,1030 L 911,1054 L 942,1063 L 973,1065 L 978,1069 L 973,1122 L 969,1125 L 932,1124 L 910,1118 L 889,1106 L 871,1086 L 861,1063 L 857,1042 L 847,1039 L 842,1043 L 838,1061 L 838,1082 L 847,1121 L 857,1140 L 876,1161 L 908,1179 L 934,1185 L 965,1186 L 998,1182 L 1036,1173 L 1076,1158 L 1105,1143 L 1134,1124 L 1161,1100 L 1173,1058 L 1173,1027 L 1165,998 L 1150,972 L 1108,927 L 1054,881 L 1005,845 L 932,799 L 926,800 L 917,814 L 914,827 L 915,842 L 921,857 L 930,868 L 977,896 L 982,903 L 981,999 L 975,1003 L 947,1000 L 909,986 L 883,963 L 868,932 L 873,925 L 968,923 L 971,916 L 899,875 L 871,869 L 866,865 L 864,752 L 858,700 L 861,698 L 977,762 L 980,770 L 982,805 L 1006,824 L 1011,823 L 1013,775 L 1010,706 L 1012,696 L 1027,676 L 1031,664 L 997,540 L 987,516 L 991,513 L 1029,511 L 1073,504 L 1075,509 L 1040,552 L 1044,559 L 1051,557 L 1129,460 L 1130,450 L 1124,444 L 1042,457 L 976,458 L 927,451 L 880,438 L 868,447 L 839,484 L 838,492 L 843,497 L 898,509 L 947,529 L 975,548 L 980,560 L 962,585 L 959,594 L 970,649 L 969,664 L 941,660 L 884,639 L 878,642 L 853,671 L 842,643 L 835,641 L 802,683 L 801,693 L 817,730 L 830,787 L 836,856 L 835,864 L 831,868 L 683,860 L 601,850 L 555,841 L 557,834 L 576,824 L 611,798 L 660,817 L 714,828 L 779,828 L 791,826 L 797,821 L 797,790 L 791,752 L 773,704 L 765,692 L 744,673 L 728,666 L 710,664 L 691,670 L 671,685 L 622,745 L 598,766 L 567,783 L 513,799 L 502,806 Z"/><path d="M 1031,743 L 1032,790 L 1035,798 L 1101,853 L 1098,861 L 1076,863 L 1073,871 L 1120,911 L 1150,911 L 1154,914 L 1162,931 L 1152,947 L 1169,970 L 1174,966 L 1189,916 L 1199,906 L 1297,891 L 1383,874 L 1388,876 L 1390,884 L 1323,966 L 1323,974 L 1327,977 L 1333,976 L 1448,827 L 1443,815 L 1429,813 L 1278,841 L 1191,853 L 1171,853 L 1159,847 L 1112,798 L 1057,752 L 1037,738 Z"/><path d="M 1233,655 L 1227,646 L 1218,644 L 1147,658 L 1057,668 L 1050,672 L 1032,693 L 1029,703 L 1030,715 L 1050,717 L 1088,714 L 1177,699 L 1181,703 L 1181,708 L 1139,760 L 1141,767 L 1148,768 L 1228,668 Z"/><path d="M 1219,761 L 1223,768 L 1248,784 L 1271,806 L 1278,806 L 1309,770 L 1320,775 L 1350,805 L 1355,806 L 1373,786 L 1382,771 L 1381,759 L 1374,748 L 1356,731 L 1341,722 L 1334,723 L 1305,757 L 1269,729 L 1256,722 L 1250,722 Z"/><path d="M 731,985 L 726,994 L 727,1007 L 753,1034 L 711,1081 L 725,1074 L 758,1041 L 761,1041 L 766,1049 L 737,1082 L 730,1105 L 737,1119 L 746,1123 L 762,1123 L 780,1115 L 795,1096 L 798,1072 L 783,1043 L 801,1019 L 804,998 L 800,989 L 794,987 L 764,1020 L 760,1015 L 762,1008 Z"/><path d="M 1280,659 L 1251,694 L 1251,700 L 1280,718 L 1299,735 L 1306,736 L 1327,711 L 1330,703 L 1329,693 L 1325,686 L 1306,670 L 1289,660 Z"/></g>
  </svg>
);

export const UserDashboard: React.FC<UserDashboardProps> = ({
  student,
  courses,
  onLogout,
}) => {
  const { 
    theme, 
    toggleTheme, 

  } = useStore();

  const [activeTab, setActiveTab] = useState<'home' | 'courses' | 'mockExams' | 'notifications' | 'messages' | 'counseling'>('home');
  const [mockExams, setMockExams] = useState<BackendMockExam[]>([]);
  const [mockExamsLoading, setMockExamsLoading] = useState(false);
  const [mockExamsError, setMockExamsError] = useState('');
  const [selectedMockExam, setSelectedMockExam] = useState<BackendMockExam | null>(null);
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
    session: { id: string; sessionNumber: number };
  }>>([]);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [editingOfflineRequestId, setEditingOfflineRequestId] = useState<string | null>(null);
  const [editingOfflineSessionId, setEditingOfflineSessionId] = useState<string>('');
  const [viewerFile, setViewerFile] = useState<BackendFile | null>(null);
  const [counselingSlots, setCounselingSlots] = useState<Array<{ id: string; startAt: string }>>([]);
  const [counselingRequests, setCounselingRequests] = useState<Array<{
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
    slot: { id: string; startAt: string; status: string };
  }>>([]);
  const [counselingLoading, setCounselingLoading] = useState(false);
  const [counselingSubmitting, setCounselingSubmitting] = useState(false);
  const [counselingError, setCounselingError] = useState('');

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

              return {
                courseId: course.id,
                sessions: sessions as BackendSession[],
                files: files as BackendFile[],
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
    if (activeTab !== 'home' && activeTab !== 'mockExams') return;
    let cancelled = false;

    const loadMockExams = async () => {
      setMockExamsLoading(true);
      setMockExamsError('');
      try {
        const response = await fetch('/api/student/mock-exams', {
          credentials: 'include',
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || 'دریافت آزمون‌های آزمایشی انجام نشد.');
        }
        const data = await response.json();
        if (!cancelled) {
          setMockExams(data as BackendMockExam[]);
        }
      } catch (error) {
        if (!cancelled) {
          setMockExamsError(error instanceof Error ? error.message : 'دریافت آزمون‌های آزمایشی انجام نشد.');
          setMockExams([]);
        }
      } finally {
        if (!cancelled) setMockExamsLoading(false);
      }
    };

    void loadMockExams();
    return () => { cancelled = true; };
  }, [activeTab, student.id]);

  useEffect(() => {
    if (activeTab !== 'counseling') return;
    let cancelled = false;

    const loadCounseling = async () => {
      setCounselingLoading(true);
      setCounselingError('');
      try {
        const [slotsResponse, requestsResponse] = await Promise.all([
          fetch('/api/counseling/slots', { credentials: 'include' }),
          fetch('/api/counseling/requests', { credentials: 'include' }),
        ]);
        if (!slotsResponse.ok || !requestsResponse.ok) {
          throw new Error('دریافت اطلاعات مشاوره انجام نشد.');
        }
        const [slots, requests] = await Promise.all([
          slotsResponse.json(),
          requestsResponse.json(),
        ]);
        if (!cancelled) {
          setCounselingSlots(slots);
          setCounselingRequests(requests);
        }
      } catch (error) {
        if (!cancelled) {
          setCounselingError(error instanceof Error ? error.message : 'دریافت اطلاعات مشاوره انجام نشد.');
          setCounselingSlots([]);
          setCounselingRequests([]);
        }
      } finally {
        if (!cancelled) setCounselingLoading(false);
      }
    };

    void loadCounseling();
    return () => { cancelled = true; };
  }, [activeTab, student.id]);

  const handleCounselingBook = async (slotId: string) => {
    if (counselingSubmitting) return;
    setCounselingSubmitting(true);
    setCounselingError('');
    try {
      const response = await fetch('/api/counseling/requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'ثبت درخواست مشاوره انجام نشد.');
      setCounselingRequests(current => [data, ...current]);
      setCounselingSlots(current => current.filter(slot => slot.id !== slotId));
    } catch (error) {
      setCounselingError(error instanceof Error ? error.message : 'ثبت درخواست مشاوره انجام نشد.');
    } finally {
      setCounselingSubmitting(false);
    }
  };

  const handleCounselingCancel = async (requestId: string) => {
    if (counselingSubmitting) return;
    if (!confirm('آیا از لغو درخواست مشاوره اطمینان دارید؟')) return;
    setCounselingSubmitting(true);
    setCounselingError('');
    try {
      const response = await fetch(`/api/counseling/requests/${requestId}/cancel`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'لغو درخواست مشاوره انجام نشد.');
      setCounselingRequests(current => current.map(item => item.id === requestId ? { ...item, status: 'CANCELLED' } : item));
      const slot = data?.slot;
      if (slot) setCounselingSlots(current => [...current, slot].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
    } catch (error) {
      setCounselingError(error instanceof Error ? error.message : 'لغو درخواست مشاوره انجام نشد.');
    } finally {
      setCounselingSubmitting(false);
    }
  };

  const formatCounselingDate = (value: string) =>
    new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Asia/Tehran',
    }).format(new Date(value));

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
  const bgColors = isDark ? '#1a1c1d' : '#f5f7f6';
  const cardBg = isDark ? '#222526' : '#ffffff';
  const textColor = isDark ? '#f1f5f4' : '#172022';
  const subText = isDark ? '#aab5b4' : '#697675';
  const borderColor = isDark ? '#343a3b' : '#e2e8e7';
  const innerCardBg = isDark ? '#282c2d' : '#f8faf9';
  const accent = isDark ? '#3b8faa' : '#3f8f8a';
  const accentSoft = isDark ? 'rgba(56, 131, 138, 0.16)' : '#e8f2f2';

  return (
    <div
      className="student-dashboard"
      style={{
        minHeight:'100vh',
        backgroundColor:bgColors,
        color:textColor,
        direction:'rtl',
        fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        boxSizing:'border-box',
        margin:0,
        padding:'24px',
        overflowX:'hidden',
        ['--sd-card' as any]:cardBg,
        ['--sd-border' as any]:borderColor,
        ['--sd-inner' as any]:innerCardBg,
        ['--sd-accent-soft' as any]:accentSoft
      }}
    >
      <style>{`
        .student-dashboard{position:relative;overflow-x:hidden}
        .student-dashboard::before,.student-dashboard::after{content:"";position:fixed;width:420px;height:420px;border-radius:50%;pointer-events:none;filter:blur(12px);opacity:${isDark ? ".16" : ".48"};z-index:0;animation:shamsehFloat 14s ease-in-out infinite alternate}
        .student-dashboard::before{top:-170px;left:-130px;background:radial-gradient(circle,rgba(91,191,198,.28),transparent 68%)}
        .student-dashboard::after{right:-180px;bottom:-170px;background:radial-gradient(circle,rgba(125,211,215,.20),transparent 68%);animation-delay:-6s}
        @keyframes shamsehFloat{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(18px,24px,0) scale(1.08)}}
        .student-dashboard-shell{max-width:1280px;margin:0 auto;position:relative;z-index:1}
        .student-dashboard-header{max-width:none!important;margin:0 0 16px!important;padding:14px 18px!important;border-radius:18px!important;min-height:72px}
        .student-dashboard-layout{display:grid;grid-template-columns:218px minmax(0,1fr);gap:16px;align-items:start}
        .student-dashboard-nav{width:auto!important;max-width:none!important;margin:0!important;display:flex!important;flex-direction:column!important;gap:5px!important;padding:10px!important;background:var(--sd-card);border:1px solid var(--sd-border);border-radius:18px;position:sticky;top:16px;box-sizing:border-box;box-shadow:0 12px 30px rgba(0,0,0,.08);backdrop-filter:blur(18px)}
        .student-dashboard-nav button{width:100%;min-height:42px;justify-content:flex-start;box-sizing:border-box;text-align:right;padding:9px 11px!important;border-radius:11px!important;font-size:11px!important;transition:transform .18s ease,background-color .18s ease}
        .student-dashboard-nav button:hover{transform:translateX(-2px)}
        .student-dashboard-main{max-width:none!important;margin:0!important;gap:14px!important;min-width:0}
        .student-dashboard-main>div{border-radius:18px!important;padding:20px!important}
        .student-dashboard-main h2{font-size:18px!important}
        .student-dashboard-home-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:12px;align-items:start}
        .student-dashboard-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .student-sidebar-brand{padding:6px 6px 13px;border-bottom:1px solid var(--sd-border);margin-bottom:2px}
        .student-sidebar-logo{display:flex;align-items:center;gap:10px}
        .student-sidebar-logo-copy{min-width:0}
        .student-sidebar-title{color:var(--sd-text);font-size:13px;font-weight:900}
        .student-sidebar-subtitle{color:var(--sd-sub);font-size:8px;margin-top:3px}
        .student-sidebar-spacer{flex:1;min-height:20px}
        .student-sidebar-logout{margin-top:8px!important}
        .student-home-hero{position:relative;overflow:hidden;min-height:184px}
        .student-home-hero-content{position:relative;z-index:2;max-width:68%}
        .student-home-hero-art{position:absolute;left:-20px;bottom:-52px;width:248px;height:248px;border-radius:50%;background:radial-gradient(circle at center,rgba(91,191,198,.18),transparent 64%);pointer-events:none}
        .student-home-hero-art:before,.student-home-hero-art:after{content:"";position:absolute;inset:24px;border:1px solid rgba(91,191,198,.16);border-radius:50%;transform:rotate(18deg)}
        .student-home-hero-art:after{inset:60px;transform:rotate(45deg);border-radius:22px}
        .student-home-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(56,131,138,.025) 58%,rgba(56,131,138,.07) 100%);pointer-events:none}
        .student-home-exam{min-height:196px}
        .student-home-panel{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
        .student-home-panel:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(0,0,0,.06);border-color:rgba(56,131,138,.32)!important}
        .student-home-stat{transition:transform .18s ease,box-shadow .18s ease}
        .student-home-stat:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.06)}
        .student-home-exam-inner{position:relative;overflow:hidden}
        .student-home-exam-inner:after{content:"";position:absolute;left:-28px;bottom:-45px;width:130px;height:130px;border:1px solid rgba(56,131,138,.12);border-radius:50%;pointer-events:none}
        .student-course-cover{height:78px;border-radius:12px;position:relative;overflow:hidden;background:linear-gradient(135deg,#d9efee 0%,#f8fbfa 48%,#b9dedc 100%)}
        .student-course-cover:before{content:"";position:absolute;width:90px;height:90px;border:1px solid rgba(56,131,138,.25);border-radius:28px;transform:rotate(45deg);right:-12px;top:-42px}
        .student-course-cover:after{content:"";position:absolute;width:110px;height:110px;border-radius:50%;border:1px solid rgba(56,131,138,.20);left:-28px;bottom:-74px}
        .student-file-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--sd-border);background:var(--sd-inner);border-radius:11px}
        .student-file-action{border:1px solid var(--sd-border);background:var(--sd-card);color:var(--sd-accent);border-radius:9px;padding:7px 9px;font-size:9px;font-weight:900;cursor:pointer}
        .student-file-action:hover{background:var(--sd-accent-soft)}
        @media(max-width:1020px){.student-dashboard-home-grid{grid-template-columns:1fr}.student-home-hero-content{max-width:72%}}
        @media(max-width:820px){.student-dashboard{padding:14px!important}.student-dashboard-layout{grid-template-columns:1fr}.student-dashboard-nav{position:static;flex-direction:row!important;overflow-x:auto;padding:6px!important}.student-dashboard-nav button{width:auto;min-width:max-content;justify-content:center}.student-sidebar-brand,.student-sidebar-spacer{display:none}.student-sidebar-logout{margin-top:0!important}}
        @media(max-width:620px){.student-dashboard-header{padding:12px 14px!important}.student-dashboard-stat-grid{grid-template-columns:1fr}.student-home-hero-content{max-width:100%}.student-home-hero-art{opacity:.35}.student-file-row{grid-template-columns:minmax(0,1fr) auto}.student-file-action{grid-column:2}}
      `}</style>

      <div className="student-dashboard-shell">
        <div className="student-dashboard-header" style={{background:isDark?'linear-gradient(135deg,rgba(43,53,54,.96),rgba(30,38,39,.94))':'linear-gradient(135deg,rgba(255,255,255,.97),rgba(239,247,246,.95))',border:`1px solid ${isDark?'rgba(78,145,151,.34)':'#d6e8e6'}`,display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px',backdropFilter:'blur(18px)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{width:'42px',height:'42px',borderRadius:'13px',backgroundColor:accentSoft,display:'grid',placeItems:'center',flexShrink:0}}><ShamsehMark size={30}/></div>
            <div><div style={{fontSize:'9px',fontWeight:900,color:accent,marginBottom:'2px'}}>سامانه آموزشی شمسه</div><h1 style={{fontSize:'18px',fontWeight:900,color:textColor,margin:0}}>پنل دانشجو</h1><p style={{fontSize:'10px',color:subText,margin:'3px 0 0'}}>خوش آمدید، <strong style={{color:accent}}>{student.fullName}</strong></p></div>
          </div>
          <button aria-label={isDark?'فعال‌کردن حالت روز':'فعال‌کردن حالت شب'} onClick={toggleTheme} style={{width:'40px',height:'40px',backgroundColor:isDark?'rgba(255,255,255,.05)':'#fff',border:`1px solid ${borderColor}`,color:textColor,borderRadius:'12px',cursor:'pointer',display:'grid',placeItems:'center',flexShrink:0}}>{isDark?<Sun size={17} color="#fbbf24"/>:<Moon size={17} color="#64748b"/>}</button>
        </div>

        <div className="student-dashboard-layout">
          <div className="student-dashboard-nav">
            <div className="student-sidebar-brand"><div className="student-sidebar-logo"><div style={{width:'42px',height:'42px',flexShrink:0}}><ShamsehMark size={42}/></div><div className="student-sidebar-logo-copy"><div style={{color:textColor,fontSize:'13px',fontWeight:900}}>شمسه</div><div style={{color:subText,fontSize:'8px',marginTop:'3px'}}>سامانه آموزشی دانشجو</div></div></div></div>
            <button onClick={() => setActiveTab('home')} style={{border:`1px solid ${borderColor}`,backgroundColor:activeTab==='home'?accent:cardBg,color:activeTab==='home'?'#fff':textColor,display:'flex',alignItems:'center',gap:'7px'}}><Home size={14}/> نمای کلی</button>
            <button onClick={() => setActiveTab('courses')} style={{border:`1px solid ${borderColor}`,backgroundColor:activeTab==='courses'?accent:cardBg,color:activeTab==='courses'?'#fff':textColor,display:'flex',alignItems:'center',gap:'7px'}}><BookOpen size={14}/> دوره‌های من</button>
            <button onClick={() => setActiveTab('mockExams')} style={{border:`1px solid ${borderColor}`,backgroundColor:activeTab==='mockExams'?accent:cardBg,color:activeTab==='mockExams'?'#fff':textColor,display:'flex',alignItems:'center',gap:'7px'}}><ClipboardList size={14}/> آزمون‌های من</button>
            <button onClick={handleOpenNotificationTab} style={{border:`1px solid ${borderColor}`,backgroundColor:activeTab==='notifications'?accent:cardBg,color:activeTab==='notifications'?'#fff':textColor,display:'flex',alignItems:'center',gap:'7px'}}><Bell size={14}/> اطلاعیه‌ها {unreadCount>0&&<span style={{marginRight:'auto',backgroundColor:'#ef5d68',color:'#fff',fontSize:'8px',padding:'2px 6px',borderRadius:'999px',fontWeight:900}}>{unreadCount}</span>}</button>
            <button onClick={() => setActiveTab('counseling')} style={{border:`1px solid ${borderColor}`,backgroundColor:activeTab==='counseling'?accent:cardBg,color:activeTab==='counseling'?'#fff':textColor,display:'flex',alignItems:'center',gap:'7px'}}><CalendarClock size={14}/> مشاوره</button>
            <button onClick={() => setActiveTab('messages')} style={{border:`1px solid ${borderColor}`,backgroundColor:activeTab==='messages'?accent:cardBg,color:activeTab==='messages'?'#fff':textColor,display:'flex',alignItems:'center',gap:'7px'}}><Send size={14}/> پشتیبانی</button>
            <div className="student-sidebar-spacer"/>
            <button className="student-sidebar-logout" onClick={onLogout} style={{display:'flex',alignItems:'center',gap:'7px',border:`1px solid ${isDark?'rgba(170,92,100,.45)':'#ead9d9'}`,color:isDark?'#dba2a7':'#b75d5d',background:isDark?'rgba(130,45,52,.08)':'#fffafa'}}><LogOut size={14}/> خروج از حساب</button>
          </div>

          <div className="student-dashboard-main">
            {activeTab === 'home' && (
              <div className="student-home" style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                <div className="student-home-hero" style={{border:`1px solid ${borderColor}`,background:isDark?'linear-gradient(135deg,rgba(38,54,55,.98),rgba(29,47,48,.98))':'linear-gradient(135deg,rgba(255,255,255,.98),rgba(232,245,244,.96))',padding:'22px 24px',boxSizing:'border-box',boxShadow:isDark?'0 16px 36px rgba(0,0,0,.16)':'0 12px 28px rgba(35,90,90,.06)'}}>
                  <div className="student-home-hero-content">
                    <div style={{display:'inline-flex',alignItems:'center',gap:'7px',color:accent,fontSize:'9px',fontWeight:900,marginBottom:'8px'}}><span style={{width:'7px',height:'7px',borderRadius:'50%',backgroundColor:accent}}/> مسیر آموزشی شما</div>
                    <h2 style={{color:textColor,fontSize:'23px',fontWeight:900,margin:'0 0 6px',letterSpacing:'-.3px'}}>خوش آمدید، {student.fullName}</h2>
                    <p style={{color:subText,fontSize:'11px',lineHeight:1.85,margin:0,maxWidth:'540px'}}>دوره‌ها، آزمون‌ها، اطلاعیه‌ها و فایل‌های آموزشی شما در یک نمای ساده و حرفه‌ای.</p>
                    <div style={{display:'flex',gap:'8px',marginTop:'14px',flexWrap:'wrap'}}><button type="button" onClick={() => setActiveTab('courses')} style={{border:'none',backgroundColor:accent,color:'#fff',borderRadius:'10px',padding:'9px 13px',fontSize:'10px',fontWeight:900,cursor:'pointer'}}>ادامه دوره‌های من</button><button type="button" onClick={() => setActiveTab('mockExams')} style={{border:`1px solid ${borderColor}`,backgroundColor:cardBg,color:textColor,borderRadius:'10px',padding:'8px 12px',fontSize:'10px',fontWeight:800,cursor:'pointer'}}>مشاهده آزمون‌ها</button></div>
                  </div>
                  <div className="student-home-hero-art"><div style={{position:'absolute',left:'54px',top:'54px'}}><ShamsehMark size={108} opacity={.26}/></div></div>
                </div>

                <div className="student-dashboard-stat-grid">
                  {[
                    {label:'دوره‌های فعال',value:enrolledCourses.length,icon:BookOpen,note:'دوره آموزشی'},
                    {label:'آزمون‌های پیش‌رو',value:mockExams.filter(exam=>new Date(exam.examDate).getTime()>=Date.now()&&exam.status!=='CANCELLED').length,icon:ClipboardList,note:'در برنامه'},
                    {label:'اطلاعیه جدید',value:unreadCount,icon:Bell,note:unreadCount?'نیازمند توجه':'همه خوانده شده'}
                  ].map(stat=>{const Icon=stat.icon;return <div key={stat.label} className="student-home-stat" style={{backgroundColor:cardBg,border:`1px solid ${borderColor}`,borderRadius:'14px',padding:'13px 14px',minHeight:'80px',boxSizing:'border-box'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}><div style={{width:'31px',height:'31px',borderRadius:'10px',backgroundColor:accentSoft,color:accent,display:'grid',placeItems:'center'}}><Icon size={15}/></div><span style={{color:subText,fontSize:'9px',fontWeight:700}}>{stat.note}</span></div><div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginTop:'8px'}}><span style={{color:textColor,fontSize:'21px',fontWeight:900}}>{stat.value}</span><span style={{color:subText,fontSize:'10px',fontWeight:800}}>{stat.label}</span></div></div>})}
                </div>

                <div className="student-dashboard-home-grid">
                  <div style={{display:'flex',flexDirection:'column',gap:'12px',minWidth:0}}>
                    <div className="student-home-exam student-home-panel" style={{backgroundColor:cardBg,border:`1px solid ${borderColor}`,padding:'18px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',gap:'10px'}}><div><div style={{color:accent,fontSize:'9px',fontWeight:900,marginBottom:'3px'}}>آزمون پیش‌رو</div><h3 style={{color:textColor,fontSize:'17px',fontWeight:900,margin:0}}>نزدیک‌ترین آزمون</h3></div><button type="button" onClick={() => setActiveTab('mockExams')} style={{border:'none',background:'transparent',color:accent,fontSize:'10px',fontWeight:900,cursor:'pointer'}}>مشاهده همه</button></div>
                      {(() => { const nextExam=[...mockExams].filter(exam=>new Date(exam.examDate).getTime()>=Date.now()&&exam.status!=='CANCELLED').sort((a,b)=>new Date(a.examDate).getTime()-new Date(b.examDate).getTime())[0]; return nextExam ? <div className="student-home-exam-inner" style={{backgroundColor:innerCardBg,border:`1px solid ${borderColor}`,borderRadius:'13px',padding:'15px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px'}}><div style={{color:textColor,fontSize:'15px',fontWeight:900}}>{nextExam.title}</div><span style={{backgroundColor:accentSoft,color:accent,borderRadius:'999px',padding:'4px 8px',fontSize:'9px',fontWeight:900}}>پیش‌رو</span></div><div style={{color:subText,fontSize:'10px',marginTop:'7px'}}>{new Intl.DateTimeFormat('fa-IR',{dateStyle:'full',timeStyle:'short',timeZone:'Asia/Tehran'}).format(new Date(nextExam.examDate))}</div><div style={{display:'flex',gap:'7px',marginTop:'11px',flexWrap:'wrap'}}>{nextExam.level&&<span style={{backgroundColor:accentSoft,color:accent,borderRadius:'7px',padding:'4px 8px',fontSize:'9px',fontWeight:800}}>{nextExam.level}</span>}{nextExam.field&&<span style={{backgroundColor:isDark?'rgba(255,255,255,.05)':'#eef1f0',color:subText,borderRadius:'7px',padding:'4px 8px',fontSize:'9px',fontWeight:700}}>{nextExam.field}</span>}</div><button type="button" onClick={() => setSelectedMockExam(nextExam)} style={{width:'100%',marginTop:'12px',border:'none',backgroundColor:accent,color:'#fff',borderRadius:'10px',padding:'10px',fontSize:'10px',fontWeight:900,cursor:'pointer'}}>مشاهده جزئیات آزمون</button></div>:<div style={{color:subText,fontSize:'11px',lineHeight:1.8,padding:'24px 8px',textAlign:'center',backgroundColor:innerCardBg,borderRadius:'12px'}}>در حال حاضر آزمون پیش‌روئی برای شما ثبت نشده است.</div>})()}
                    </div>

                    <div style={{backgroundColor:cardBg,border:`1px solid ${borderColor}`,padding:'18px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}><div><div style={{color:accent,fontSize:'9px',fontWeight:900,marginBottom:'3px'}}>دوره‌های آموزشی</div><h3 style={{color:textColor,fontSize:'17px',fontWeight:900,margin:0}}>دوره‌های من</h3></div><button type="button" onClick={() => setActiveTab('courses')} style={{border:'none',background:'transparent',color:accent,fontSize:'10px',fontWeight:900,cursor:'pointer'}}>مشاهده همه</button></div>
                      {enrolledCourses.length===0?<div style={{color:subText,fontSize:'11px',padding:'18px',textAlign:'center'}}>هنوز دوره‌ای برای شما ثبت نشده است.</div>:<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'10px'}}>{enrolledCourses.slice(0,4).map(course=><button key={course.id} type="button" onClick={() => setActiveTab('courses')} style={{textAlign:'right',border:`1px solid ${borderColor}`,backgroundColor:innerCardBg,borderRadius:'13px',padding:'8px',cursor:'pointer',minWidth:0}}><div className="student-course-cover" style={course.coverImage?{backgroundImage:`url("${course.coverImage}")`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}><span style={{position:'absolute',right:'9px',bottom:'8px',backgroundColor:'rgba(20,80,82,.78)',color:'#fff',padding:'4px 7px',borderRadius:'999px',fontSize:'8px',fontWeight:800}}>فعال</span></div><div style={{color:textColor,fontSize:'10px',fontWeight:900,marginTop:'8px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{course.title}</div><div style={{color:subText,fontSize:'9px',marginTop:'3px'}}>{course.professor||'مدرس مشخص نشده'}</div></button>)}</div>}
                    </div>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:'12px',minWidth:0}}>
                    <div style={{backgroundColor:cardBg,border:`1px solid ${borderColor}`,padding:'18px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}><div><div style={{color:accent,fontSize:'9px',fontWeight:900,marginBottom:'3px'}}>آخرین خبرها</div><h3 style={{color:textColor,fontSize:'17px',fontWeight:900,margin:0}}>آخرین اطلاعیه‌ها</h3></div><button type="button" onClick={handleOpenNotificationTab} style={{border:'none',background:'transparent',color:accent,fontSize:'10px',fontWeight:900,cursor:'pointer'}}>مشاهده همه</button></div>
                      {studentNotifications.length===0?<div style={{color:subText,fontSize:'11px',padding:'18px 4px',textAlign:'center'}}>اطلاعیه جدیدی ندارید.</div>:<div style={{display:'flex',flexDirection:'column',gap:'8px'}}>{studentNotifications.slice(0,3).map(n=><button key={n.id} type="button" onClick={handleOpenNotificationTab} style={{textAlign:'right',border:`1px solid ${borderColor}`,backgroundColor:innerCardBg,borderRadius:'11px',padding:'10px',cursor:'pointer'}}><div style={{color:textColor,fontSize:'10px',fontWeight:900}}>{n.title}</div><div style={{color:subText,fontSize:'8px',marginTop:'4px'}}>{new Date(n.createdAt).toLocaleDateString('fa-IR')}</div></button>)}</div>}
                    </div>
                    <div style={{backgroundColor:cardBg,border:`1px solid ${borderColor}`,padding:'18px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}><CalendarClock size={16} color={accent}/><div><div style={{color:accent,fontSize:'9px',fontWeight:900}}>پشتیبانی و مشاوره</div><h3 style={{color:textColor,fontSize:'17px',fontWeight:900,margin:0}}>مشاوره</h3></div></div>
                      {counselingRequests.length>0?<div style={{backgroundColor:innerCardBg,borderRadius:'11px',padding:'11px',color:textColor,fontSize:'10px',fontWeight:800}}>{formatCounselingDate(counselingRequests[0].slot.startAt)}</div>:<div style={{color:subText,fontSize:'10px',lineHeight:1.8}}>برای دریافت مشاوره، یک زمان مناسب از بخش مشاوره انتخاب کنید.</div>}
                      <button type="button" onClick={() => setActiveTab('counseling')} style={{marginTop:'10px',border:'none',background:'transparent',color:accent,padding:0,fontSize:'10px',fontWeight:900,cursor:'pointer'}}>ورود به مشاوره ←</button>
                    </div>
                  </div>
                </div>

                <div style={{backgroundColor:cardBg,border:`1px solid ${borderColor}`,padding:'18px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',marginBottom:'12px'}}><div><div style={{color:accent,fontSize:'9px',fontWeight:900,marginBottom:'3px'}}>محتوای آموزشی</div><h3 style={{color:textColor,fontSize:'17px',fontWeight:900,margin:0}}>فایل‌های دوره‌های من</h3></div><button type="button" onClick={() => setActiveTab('courses')} style={{border:'none',background:'transparent',color:accent,fontSize:'10px',fontWeight:900,cursor:'pointer'}}>مشاهده فایل‌ها</button></div>
                  {(() => { const dashboardFiles=Object.entries(courseFiles).flatMap(([courseId,files])=>files.map(file=>({file,courseTitle:enrolledCourses.find(c=>c.id===courseId)?.title||'دوره آموزشی'}))).slice(0,6); return dashboardFiles.length===0?<div style={{color:subText,fontSize:'11px',padding:'24px',textAlign:'center',backgroundColor:innerCardBg,borderRadius:'12px'}}>هنوز فایلی برای دوره‌های شما ثبت نشده است.</div>:<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'8px'}}>{dashboardFiles.map(({file,courseTitle})=><div key={file.id} className="student-file-row"><div style={{display:'flex',alignItems:'center',gap:'9px',minWidth:0}}><div style={{width:'34px',height:'34px',borderRadius:'10px',display:'grid',placeItems:'center',backgroundColor:accentSoft,color:accent,fontSize:'8px',fontWeight:900}}>{file.type==='PDF'?'PDF':file.type==='VIDEO'?'MP4':file.type==='POWERPOINT'?'PPT':file.type==='DOCUMENT'?'DOC':file.type==='AUDIO'?'MP3':'LINK'}</div><div style={{minWidth:0}}><div style={{color:textColor,fontSize:'10px',fontWeight:900,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{file.title}</div><div style={{color:subText,fontSize:'8px',marginTop:'3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{courseTitle}</div></div></div><span style={{color:subText,fontSize:'8px',whiteSpace:'nowrap'}}>{file.fileSize||''}</span><button type="button" className="student-file-action" onClick={() => setViewerFile(file)}>{file.type==='LINK'?'بازکردن':'مشاهده فایل'}</button></div>)}</div>})()}
                </div>
              </div>
            )}
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
                              جلسه {session.sessionNumber}
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
                        <a href={course.adobeConnectUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: accent, color: '#fff', padding: '10px', borderRadius: '12px', textDecoration: 'none', fontSize: '12px', fontWeight: 800, marginTop: '4px', boxShadow: isDark ? '0 4px 12px rgba(59,143,170,.24)' : '0 4px 12px rgba(63,143,138,.18)' }}>
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
                                جلسه {session.sessionNumber}
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
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: textColor, display: 'block' }}>جلسه {req.session.sessionNumber}</span>
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
                                            {sessions.map(session => <option key={session.id} value={session.id}>جلسه {session.sessionNumber}</option>)}
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
                                  } else if (file.streamUrl) {
                                    setViewerFile(file);
                                  }
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: cardBg, padding: '8px 12px', borderRadius: '8px', cursor: (file.externalUrl || file.streamUrl) ? 'pointer' : 'default', border: `1px solid ${borderColor}` }}
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
                                <span style={{ fontSize: '9px', color: (file.externalUrl || file.streamUrl) ? '#ff3366' : subText, fontWeight: 700 }}>
                                  {(file.externalUrl || file.streamUrl) ? 'مشاهده فایل' : 'فایل داخلی'}
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

        {activeTab === 'mockExams' && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(16px)', padding: '32px', borderRadius: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: textColor, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={18} color="#ff3366" /> آزمون‌های آزمایشی من
            </h2>
            <p style={{ fontSize: '11px', color: subText, margin: '0 0 20px 0' }}>
              در این بخش فقط آزمون‌هایی نمایش داده می‌شوند که برای شما ثبت شده‌اند.
            </p>

            {mockExamsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: subText, fontSize: '13px' }}>
                در حال دریافت آزمون‌های شما...
              </div>
            ) : mockExamsError ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#f87171', fontSize: '13px' }}>
                {mockExamsError}
              </div>
            ) : mockExams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: subText, fontSize: '13px' }}>
                در حال حاضر آزمون آزمایشی برای شما ثبت نشده است.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {mockExams.map(exam => {
                  const canOpen = Boolean(exam.examUrl) && ['LINK_AVAILABLE', 'LIVE'].includes(exam.status);
                  const statusLabel =
                    exam.status === 'SCHEDULED' ? 'زمان‌بندی شده' :
                    exam.status === 'LINK_AVAILABLE' ? 'لینک آزمون فعال است' :
                    exam.status === 'LIVE' ? 'آزمون در حال برگزاری' :
                    exam.status === 'COMPLETED' ? 'به پایان رسیده' :
                    exam.status === 'CANCELLED' ? 'لغو شده' : 'در انتظار آماده‌سازی';
                  const statusColor =
                    exam.status === 'LIVE' ? '#34d399' :
                    exam.status === 'LINK_AVAILABLE' ? '#38bdf8' :
                    exam.status === 'CANCELLED' ? '#f87171' :
                    exam.status === 'COMPLETED' ? subText : '#fbbf24';

                  return (
                    <div key={exam.id} style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 800, color: textColor, margin: 0 }}>{exam.title}</h3>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '7px' }}>
                            {exam.level && <span style={{ fontSize: '9px', color: subText }}>{exam.level}</span>}
                            {exam.field && <span style={{ fontSize: '9px', color: subText }}>{exam.field}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: statusColor, whiteSpace: 'nowrap' }}>{statusLabel}</span>
                      </div>

                      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarClock size={15} color="#ff3366" />
                        <span style={{ fontSize: '10px', color: textColor, fontWeight: 700 }}>
                          {new Intl.DateTimeFormat('fa-IR', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                            timeZone: 'Asia/Tehran',
                          }).format(new Date(exam.examDate))}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: canOpen ? '1fr 1fr' : '1fr', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedMockExam(exam)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px 14px', borderRadius: '10px', backgroundColor: 'transparent', color: textColor, border: `1px solid ${borderColor}`, fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          <ClipboardList size={14} /> مشاهده جزئیات
                        </button>
                        {canOpen ? (
                          <a
                            href={exam.examUrl!}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px 14px', borderRadius: '10px', background: accent, color: '#fff', textDecoration: 'none', fontSize: '11px', fontWeight: 800 }}
                          >
                            <ExternalLink size={14} /> ورود به آزمون
                          </a>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(148,163,184,0.08)', color: subText, fontSize: '10px', fontWeight: 700 }}>
                            {exam.status === 'CANCELLED' ? 'این آزمون لغو شده است.' : exam.status === 'COMPLETED' ? 'این آزمون به پایان رسیده است.' : 'لینک آزمون هنوز فعال نشده است.'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedMockExam && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setSelectedMockExam(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ width: 'min(520px, 100%)', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '20px', padding: '24px', boxShadow: '0 24px 80px rgba(0,0,0,.45)', direction: 'rtl' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ color: textColor, margin: 0, fontSize: '16px', fontWeight: 900 }}>{selectedMockExam.title}</h3>
                  <p style={{ color: subText, margin: '6px 0 0', fontSize: '10px' }}>اطلاعات آزمون آزمایشی</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMockExam(null)}
                  style={{ border: 'none', background: 'rgba(148,163,184,.1)', color: textColor, borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}
                >×</button>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '13px' }}>
                  <div style={{ color: subText, fontSize: '9px', marginBottom: '5px' }}>تاریخ و ساعت آزمون</div>
                  <div style={{ color: textColor, fontSize: '12px', fontWeight: 800 }}>
                    {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(selectedMockExam.examDate))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '13px' }}>
                    <div style={{ color: subText, fontSize: '9px', marginBottom: '5px' }}>مقطع</div>
                    <div style={{ color: textColor, fontSize: '12px', fontWeight: 800 }}>{selectedMockExam.level || '—'}</div>
                  </div>
                  <div style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '13px' }}>
                    <div style={{ color: subText, fontSize: '9px', marginBottom: '5px' }}>رشته</div>
                    <div style={{ color: textColor, fontSize: '12px', fontWeight: 800 }}>{selectedMockExam.field || '—'}</div>
                  </div>
                </div>
                <div style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '13px' }}>
                  <div style={{ color: subText, fontSize: '9px', marginBottom: '5px' }}>وضعیت</div>
                  <div style={{ color: selectedMockExam.status === 'LIVE' ? '#34d399' : selectedMockExam.status === 'CANCELLED' ? '#f87171' : textColor, fontSize: '12px', fontWeight: 800 }}>
                    {selectedMockExam.status === 'SCHEDULED' ? 'زمان‌بندی شده' : selectedMockExam.status === 'LINK_AVAILABLE' ? 'لینک آزمون فعال است' : selectedMockExam.status === 'LIVE' ? 'آزمون در حال برگزاری' : selectedMockExam.status === 'COMPLETED' ? 'به پایان رسیده' : selectedMockExam.status === 'CANCELLED' ? 'لغو شده' : 'در انتظار آماده‌سازی'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '18px' }}>
                {selectedMockExam.examUrl && ['LINK_AVAILABLE', 'LIVE'].includes(selectedMockExam.status) ? (
                  <a href={selectedMockExam.examUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', width: '100%', boxSizing: 'border-box', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #6D001A 0%, #a21c3a 100%)', color: '#fff', textDecoration: 'none', fontSize: '11px', fontWeight: 800 }}>
                    <ExternalLink size={14} /> ورود به آزمون
                  </a>
                ) : (
                  <div style={{ textAlign: 'center', padding: '11px', borderRadius: '10px', backgroundColor: 'rgba(148,163,184,0.08)', color: subText, fontSize: '10px', fontWeight: 700 }}>
                    {selectedMockExam.status === 'CANCELLED' ? 'این آزمون لغو شده است.' : selectedMockExam.status === 'COMPLETED' ? 'این آزمون به پایان رسیده است.' : 'لینک آزمون هنوز فعال نشده است.'}
                  </div>
                )}
              </div>
            </div>
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

        {activeTab === 'counseling' && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(16px)', padding: '32px', borderRadius: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: textColor, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarClock size={18} color="#ff3366" /> درخواست مشاوره
            </h2>
            <p style={{ fontSize: '11px', color: subText, margin: '0 0 20px 0' }}>
              زمان مناسب خود را از بین زمان‌های آزاد انتخاب کنید. مشاوره به‌صورت تلفنی انجام می‌شود.
            </p>

            {counselingError && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '12px', borderRadius: '12px', fontSize: '11px', marginBottom: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
                {counselingError}
              </div>
            )}

            {counselingLoading ? (
              <div style={{ textAlign: 'center', padding: '35px 0', color: subText, fontSize: '12px' }}>در حال دریافت زمان‌های مشاوره...</div>
            ) : (
              <>
                <div style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: textColor, margin: '0 0 12px 0' }}>زمان‌های آزاد</h3>
                  {counselingSlots.length === 0 ? (
                    <div style={{ color: subText, fontSize: '11px', padding: '20px 0', textAlign: 'center' }}>در حال حاضر زمان آزادی برای مشاوره ثبت نشده است.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                      {counselingSlots.map(slot => (
                        <div key={slot.id} style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                            <Clock size={15} color="#ff3366" />
                            <span style={{ fontSize: '10px', color: textColor, fontWeight: 700 }}>{formatCounselingDate(slot.startAt)}</span>
                          </div>
                          <button onClick={() => void handleCounselingBook(slot.id)} disabled={counselingSubmitting} style={{ flexShrink: 0, padding: '7px 10px', borderRadius: '8px', border: 'none', backgroundColor: '#6D001A', color: '#fff', fontSize: '10px', fontWeight: 800, cursor: counselingSubmitting ? 'wait' : 'pointer', opacity: counselingSubmitting ? 0.6 : 1 }}>
                            درخواست
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: innerCardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: textColor, margin: '0 0 12px 0' }}>درخواست‌های من</h3>
                  {counselingRequests.length === 0 ? (
                    <div style={{ color: subText, fontSize: '11px', padding: '20px 0', textAlign: 'center' }}>هنوز درخواست مشاوره‌ای ثبت نکرده‌اید.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                      {counselingRequests.map(request => (
                        <div key={request.id} style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: textColor }}>{formatCounselingDate(request.slot.startAt)}</div>
                            <div style={{ fontSize: '9px', color: subText, marginTop: '4px' }}>ثبت درخواست: {new Date(request.createdAt).toLocaleString('fa-IR')}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: request.status === 'APPROVED' ? '#34d399' : request.status === 'REJECTED' ? '#f87171' : request.status === 'COMPLETED' ? '#38bdf8' : request.status === 'CANCELLED' ? subText : '#fbbf24' }}>
                              {request.status === 'APPROVED' ? 'تأیید شده' : request.status === 'REJECTED' ? 'رد شده' : request.status === 'COMPLETED' ? 'انجام شده' : request.status === 'CANCELLED' ? 'لغو شده' : 'در انتظار بررسی'}
                            </span>
                            {(request.status === 'PENDING' || request.status === 'APPROVED') && (
                              <button onClick={() => void handleCounselingCancel(request.id)} disabled={counselingSubmitting} style={{ padding: '5px 9px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '9px', fontWeight: 700, cursor: counselingSubmitting ? 'wait' : 'pointer' }}>
                                لغو درخواست
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
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

      {viewerFile && (
        <FileViewer
          file={viewerFile}
          isDark={isDark}
          borderColor={borderColor}
          textColor={textColor}
          onClose={() => setViewerFile(null)}
        />
      )}
      </div>
    </div>
  );
};