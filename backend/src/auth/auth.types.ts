export interface AuthenticatedUser {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT' | 'COUNSELOR';
  studentId: string | null;
  permissions: string[];
  student?: { fullName: string; nationalId: string } | null;
  sessionToken: string;
}
