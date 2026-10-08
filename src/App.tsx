import { useState } from 'react';
import { useStore } from './store/useStore';
import { AdminLayout } from './layouts/AdminLayout';
import { ManageCourses } from './pages/admin/ManageCourses';
import { ManageStudents } from './pages/admin/ManageStudents';
import { AuditLogs } from './pages/admin/AuditLogs';
import { ManageMessages } from './pages/admin/ManageMessages';
import { ManageOfflineRequests } from './pages/admin/ManageOfflineRequests';
import { ManageMockExams } from './pages/admin/ManageMockExams';
import { ManageNotifications } from './pages/admin/ManageNotifications';
import { ManagePublicContent } from './pages/admin/ManagePublicContent';
import { ManageFinance } from './pages/admin/ManageFinance';
import { Login } from './pages/user/Login';
import { UserDashboard } from './pages/user/UserDashboard';
import type { Student, Admin } from './types';

type AuthUser = { id: string; username: string; role: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT'; studentId: string | null; student?: { fullName: string; nationalId: string } | null };

export function App() {
  const {
    currentAdmin,
    admins,
    setCurrentAdmin,
    courses,
    students,
    rulesText,
    addStudent,
    updateStudent,
    deleteStudent,
  } = useStore();

  const [view, setView] = useState<'login' | 'admin' | 'user'>('login');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'courses' | 'students' | 'admins' | 'logs' | 'messages' | 'notifications' | 'rules' | 'offlineRequests' | 'mockExams' | 'finance'>('courses');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  const handleStudentLogin = (user: AuthUser) => {
    if (!user.studentId || !user.student) return;
    const student: Student = { id: user.studentId, fullName: user.student.fullName, nationalId: user.student.nationalId, enrolledCourseIds: [] };
    setCurrentStudent(student);
    setView('user');
  };

  const handleAdminLoginSuccess = (user: AuthUser) => {
    const admin: Admin = { id: user.id, fullName: user.username, username: user.username, password: '', role: user.role === 'SUPER_ADMIN' ? 'super_admin' : 'staff' };
    setCurrentAdmin(admin);
    setView('admin');
  };

  const handleLogout = () => {
    setCurrentStudent(null);
    setCurrentAdmin(null);
    setView('login');
  };

  const adminName = currentAdmin?.fullName || 'مدیر کل سیستم';

  if (view === 'admin') {
    return (
      <AdminLayout
        admin={currentAdmin || undefined}
        activeTab={adminTab}
        setActiveTab={setAdminTab}
        onLogout={handleLogout}
      >
        {adminTab === 'courses' ? (
          <ManageCourses />
        ) : adminTab === 'students' ? (
          <ManageStudents
            students={students}
            courses={courses}
            onAddStudent={(student) => addStudent(student, adminName)}
            onUpdateStudent={(student) => updateStudent(student, adminName)}
            onDeleteStudent={(id) => deleteStudent(id, adminName)}
          />
        ) : adminTab === 'offlineRequests' ? (
          <ManageOfflineRequests />
        ) : adminTab === 'mockExams' ? (
          <ManageMockExams />
        ) : adminTab === 'logs' ? (
          <AuditLogs />
         ) : adminTab === 'messages' ? (
          <ManageMessages />
        ) : adminTab === 'notifications' ? (
          <ManageNotifications />
        ) : adminTab === 'rules' ? (
          <ManagePublicContent />
        ) : adminTab === 'finance' ? (
          <ManageFinance />
        ) : (
          <div style={{ backgroundColor: '#0e0e11', padding: '32px', borderRadius: '20px', border: '1px solid #222228' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>مدیریت سطوح دسترسی ادمین‌ها</h2>
            <p style={{ color: '#888', fontSize: '12px' }}>تنظیمات دسترسی کاربران ارشد فعال است.</p>
          </div>
        )}
      </AdminLayout>
    );
  }

  if (view === 'user' && currentStudent) {
    return (
      <UserDashboard
        student={currentStudent}
        courses={courses}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <Login
      students={students}
      admins={admins}
      onLoginSuccess={handleStudentLogin}
      onAdminLoginSuccess={handleAdminLoginSuccess}
      rulesText={rulesText}
    />
  );
}

export default App;