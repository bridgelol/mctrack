import type { UserRole } from '../constants/platform.js';

export interface User {
  id: string;
  email: string;
  username: string;
  signUpTime: Date;
  lastLogin: Date | null;
  emailVerified: boolean;
  role: UserRole;
}

export interface Session {
  userId: string;
  email: string;
  username: string;
}
