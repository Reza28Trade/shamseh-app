import { create } from 'zustand';
import type { Course, Student, Admin, StudentMessage, AuditLog } from '../types';

export interface CourseFile {
  id: string;
  title: string;
  type: 'pdf' | 'powerpoint' | 'audio' | 'video_link' | 'class_link';
  url: string;
}

export interface OfflineRequest {
  id: string;
  studentId: string;
  studentName: string;
  courseTitle: string;
  sessionTitle: string;
  status: 'pending' | 'approved' | 'rejected';
  meetingLink?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  targetType: 'all' | 'course' | 'student';
  targetId?: string;
  date: string;
  sender: string;
  readBy: string[];
}

interface StoreState {
  theme: 'dark' | 'light';
  courses: Course[];
  students: Student[];
  admins: Admin[];
  messages: StudentMessage[];
  offlineRequests: Record<string, Record<string, number>>;
  offlineRequestsList: OfflineRequest[];
  notifications: NotificationItem[];
  courseFiles: Record<string, CourseFile[]>;
  rulesText: string;
  auditLogs: AuditLog[];
  currentAdmin: Admin | null;
  currentStudent: Student | null;

  // Actions
  toggleTheme: () => void;
  setCurrentAdmin: (admin: Admin | null) => void;
  setCurrentStudent: (student: Student | null) => void;

  addCourse: (course: Course, adminName?: string) => void;
  updateCourse: (course: Course, adminName?: string) => void;
  deleteCourse: (id: string, adminName?: string) => void;
  
  addStudent: (student: Student, adminName?: string) => void;
  updateStudent: (student: Student, adminName?: string) => void;
  deleteStudent: (id: string, adminName?: string) => void;
  
  sendStudentMessage: (msg: Omit<StudentMessage, 'id' | 'status' | 'createdAt'>) => void;
  answerMessage: (msgId: string, reply: string) => void;
  
  requestOfflineClass: (studentId: string, courseId: string, sessionTitle: string) => { success: boolean; message: string };
  updateRequestStatus: (id: string, status: 'approved' | 'rejected', meetingLink?: string) => void;
  updateOfflineRequest: (id: string, newSessionTitle: string) => void;
  deleteOfflineRequest: (id: string) => void;
  
  sendNotification: (notification: Omit<NotificationItem, 'id' | 'date' | 'sender' | 'readBy'>, senderName: string) => void;
  markNotificationAsRead: (notifId: string, nationalId: string) => void;
  
  addCourseFile: (courseId: string, file: CourseFile, adminName: string) => void;
  deleteCourseFile: (courseId: string, fileId: string, adminName: string) => void;
  
  setRulesText: (text: string) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  courses: [
    {
      id: 'course-1',
      title: 'متون هنری و تاریخ هنر ارشد',
      professor: 'دکتر احمدی',
      level: 'ارشد',
      schedule: 'پنجشنبه‌ها ۱۵ الی ۱۹',
      startDate: '۱۴۰۵/۰۷/۱۰',
      description: 'بررسی جامع منابع و سوالات سنوات گذشته کنکور ارشد پژوهش هنر.',
      term: 'پاییز',
      price: 1500000,
      adobeConnectUrl: 'https://connect.shamseh.ir/art1',
      syllabus: ['کلیات و تعاریف هنر باستان', 'هنر قرون وسطی و رنسانس', 'هنر مدرن و معاصر', 'تست و رفع اشکال جامع']
    }
  ],
  students: [
    {
      id: 'student-1',
      fullName: 'علی رضایی',
      nationalId: '0012345678',
      enrolledCourseIds: ['course-1']
    }
  ],
  admins: [
    {
      id: 'admin-1',
      fullName: 'مدیر ارشد سیستم',
      username: 'admin',
      password: '123',
      role: 'super_admin'
    }
  ],
  messages: [],
  offlineRequests: {},
  offlineRequestsList: [],
  notifications: [],
  courseFiles: {},
  rulesText: '۱. حضور به موقع در کلاس‌های آنلاین الزامی است.\n۲. انتشار محتوای دوره‌ها پیگرد قانونی دارد.',
  auditLogs: [],
  currentAdmin: null,
  currentStudent: null,

  setCurrentAdmin: (admin) => set({ currentAdmin: admin }),
  setCurrentStudent: (student) => set({ currentStudent: student }),

  addCourse: (course, adminName = 'مدیر سیستم') => set((state) => ({
    courses: [...state.courses, course],
    auditLogs: [{ id: `log-${Date.now()}`, action: 'افزودن دوره', performedBy: adminName, timestamp: new Date().toLocaleDateString('fa-IR'), details: `دوره ${course.title} ایجاد شد.` }, ...state.auditLogs]
  })),
  
  updateCourse: (updatedCourse, adminName = 'مدیر سیستم') => set((state) => ({
    courses: state.courses.map(c => c.id === updatedCourse.id ? updatedCourse : c),
    auditLogs: [{ id: `log-${Date.now()}`, action: 'ویرایش دوره', performedBy: adminName, timestamp: new Date().toLocaleDateString('fa-IR'), details: `دوره ${updatedCourse.title} ویرایش شد.` }, ...state.auditLogs]
  })),

  deleteCourse: (id, adminName = 'مدیر سیستم') => set((state) => ({
    courses: state.courses.filter(c => c.id !== id),
    auditLogs: [{ id: `log-${Date.now()}`, action: 'حذف دوره', performedBy: adminName, timestamp: new Date().toLocaleDateString('fa-IR'), details: `دوره با شناسه ${id} حذف شد.` }, ...state.auditLogs]
  })),

  addStudent: (student, adminName = 'مدیر سیستم') => set((state) => ({
    students: [...state.students, student],
    auditLogs: [{ id: `log-${Date.now()}`, action: 'ثبت هنرجو', performedBy: adminName, timestamp: new Date().toLocaleDateString('fa-IR'), details: `هنرجو ${student.fullName} ثبت‌نام شد.` }, ...state.auditLogs]
  })),
  
  updateStudent: (updatedStudent, adminName = 'مدیر سیستم') => set((state) => ({
    students: state.students.map(s => s.id === updatedStudent.id ? updatedStudent : s),
    auditLogs: [{ id: `log-${Date.now()}`, action: 'ویرایش هنرجو', performedBy: adminName, timestamp: new Date().toLocaleDateString('fa-IR'), details: `اطلاعات هنرجو ویرایش شد.` }, ...state.auditLogs]
  })),

  deleteStudent: (id, adminName = 'مدیر سیستم') => set((state) => ({
    students: state.students.filter(s => s.id !== id),
    auditLogs: [{ id: `log-${Date.now()}`, action: 'حذف هنرجو', performedBy: adminName, timestamp: new Date().toLocaleDateString('fa-IR'), details: `هنرجو حذف شد.` }, ...state.auditLogs]
  })),

  sendStudentMessage: (msgData) => set((state) => ({
    messages: [{ id: `msg-${Date.now()}`, ...msgData, status: 'pending', createdAt: new Date().toLocaleDateString('fa-IR') }, ...state.messages]
  })),

  answerMessage: (msgId, reply) => set((state) => ({
    messages: state.messages.map(m => m.id === msgId ? { ...m, adminReply: reply, status: 'answered' } : m)
  })),

  requestOfflineClass: (studentId, courseId, sessionTitle) => {
    const state = get();
    const studentRequests = state.offlineRequests[studentId] || {};
    const currentCount = studentRequests[courseId] || 0;

    if (currentCount >= 3) {
      return { success: false, message: 'سقف درخواست کلاس آفلاین برای این دوره (۳ بار) به اتمام رسیده است.' };
    }

    const targetCourse = state.courses.find(c => c.id === courseId);
    const targetStudent = state.students.find(s => s.id === studentId);

    const newRequest: OfflineRequest = {
      id: `req-${Date.now()}`,
      studentId,
      studentName: targetStudent?.fullName || 'هنرجو',
      courseTitle: targetCourse?.title || 'دوره آموزشی',
      sessionTitle,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('fa-IR')
    };

    set({
      offlineRequests: {
        ...state.offlineRequests,
        [studentId]: {
          ...studentRequests,
          [courseId]: currentCount + 1
        }
      },
      offlineRequestsList: [newRequest, ...state.offlineRequestsList]
    });

    return { success: true, message: 'درخواست شما با موفقیت ثبت شد و به دست مدیریت رسید.' };
  },

  updateRequestStatus: (id, status, meetingLink = '') => set((state) => ({
    offlineRequestsList: state.offlineRequestsList.map(r => r.id === id ? { ...r, status, meetingLink: meetingLink || r.meetingLink } : r)
  })),

  updateOfflineRequest: (id, newSessionTitle) => set((state) => ({
    offlineRequestsList: state.offlineRequestsList.map(r => r.id === id && r.status === 'pending' ? { ...r, sessionTitle: newSessionTitle } : r)
  })),

  deleteOfflineRequest: (id) => set((state) => {
    const target = state.offlineRequestsList.find(r => r.id === id);
    if (!target || target.status !== 'pending') return state;

    // کاهش یک واحد از سهمیه مصرفی دانشجو
    const studentReqs = state.offlineRequests[target.studentId] || {};
    // پیدا کردن کلید دوره بر اساس عنوان دوره
    const targetCourse = state.courses.find(c => c.title === target.courseTitle);
    const courseId = targetCourse ? targetCourse.id : null;

    let updatedStudentReqs = { ...studentReqs };
    if (courseId && updatedStudentReqs[courseId] > 0) {
      updatedStudentReqs[courseId] -= 1;
    }

    return {
      offlineRequests: {
        ...state.offlineRequests,
        [target.studentId]: updatedStudentReqs
      },
      offlineRequestsList: state.offlineRequestsList.filter(r => r.id !== id)
    };
  }),

  sendNotification: (notifData, senderName) => set((state) => ({
    notifications: [{ id: `notif-${Date.now()}`, ...notifData, date: new Date().toLocaleDateString('fa-IR'), sender: senderName, readBy: [] }, ...state.notifications]
  })),

  markNotificationAsRead: (notifId, nationalId) => set((state) => ({
    notifications: state.notifications.map(n => n.id === notifId && !n.readBy.includes(nationalId) ? { ...n, readBy: [...n.readBy, nationalId] } : n)
  })),

  addCourseFile: (courseId, file, adminName) => set((state) => ({
    courseFiles: { ...state.courseFiles, [courseId]: [...(state.courseFiles[courseId] || []), file] },
    auditLogs: [{ id: `log-${Date.now()}`, action: 'افزودن فایل دوره', performedBy: adminName, timestamp: new Date().toLocaleDateString('fa-IR'), details: `فایل افزوده شد.` }, ...state.auditLogs]
  })),

  deleteCourseFile: (courseId, fileId, adminName) => set((state) => ({
    courseFiles: { ...state.courseFiles, [courseId]: (state.courseFiles[courseId] || []).filter(f => f.id !== fileId) },
    auditLogs: [{ id: `log-${Date.now()}`, action: 'حذف فایل دوره', performedBy: adminName, timestamp: new Date().toLocaleDateString('fa-IR'), details: `فایل حذف شد.` }, ...state.auditLogs]
  })),

  setRulesText: (text) => set({ rulesText: text })
}));