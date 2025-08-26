import { User } from '../entities/user.entity';

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  avatar?: string;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedUsersResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  avatar?: string;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
