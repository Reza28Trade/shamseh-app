export interface AuthenticatedUser {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT' | 'COUNSELOR';
  studentId: string | null;
  student?: { fullName: string; nationalId: string } | null;
  sessionToken: string;
}
