import { api } from './client';
import type {
  AuthTokens,
  RegisterResult,
  UserProfileResponse,
} from '../types';

export const authApi = {
  async register(data: { email: string; fullName: string; password: string }): Promise<RegisterResult> {
    return api.post<RegisterResult>('/auth/register', data);
  },

  async login(data: { email: string; password: string }): Promise<AuthTokens> {
    return api.post<AuthTokens>('/auth/login', data);
  },

  async logout(): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/logout');
  },

  async getMe(): Promise<UserProfileResponse> {
    return api.get<UserProfileResponse>('/auth/me');
  },

  async setupPin(pin: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/pin/setup', { pin });
  },
};
