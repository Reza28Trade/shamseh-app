export interface Student {
  id: string;
  fullName: string;
  nationalId: string;
  enrolledCourseIds: string[];
  academicLevel?: 'MASTER' | 'DOCTORATE' | '';
  levels?: string[];
}

export interface Admin {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  role: 'super_admin' | 'staff';
}

export interface Course {
  id: string;
  title: string;
  professor: string;
  level: string;
  schedule: string;
  startDate: string;
  description: string;
  adobeConnectUrl?: string;
  term?: 'تابستان' | 'پاییز' | 'زمستان';
  price?: number;
  category?: string;
  coverImage?: string;
  syllabus?: string[];
  attachments?: { id: string; name: string; url: string; type: 'pdf' | 'video' | 'link' }[];
}

export interface StudentMessage {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  content: string;
  status: 'pending' | 'answered';
  createdAt: string;
  adminReply?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details: string;
}