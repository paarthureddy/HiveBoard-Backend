import axios from 'axios';
import type { LoginRequest, RegisterRequest, AuthResponse } from '@/types/auth';
import type { Meeting, CreateMeetingRequest, UpdateMeetingRequest } from '@/types/meeting';

/**
 * API Client
 * 
 * Centralized Axios instance configuration.
 * Features:
 * - Base URL configuration.
 * - Request Interceptor: Automatically attaches the JWT token from localStorage.
 * - Response Interceptor: Handles global errors (e.g., 401 Unauthorized -> Logout).
 * 
 * Exports typed API methods for Auth, Meetings, Invites, and User data.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token to headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/auth';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/login', data);
        return response.data;
    },

    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/register', data);
        return response.data;
    },

    googleLogin: async (credential: string): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/google/verify', { credential });
        return response.data;
    },

    getMe: async (): Promise<AuthResponse> => {
        const response = await api.get<AuthResponse>('/auth/me');
        return response.data;
    },
};

// Meetings API
export const meetingsAPI = {
    getAll: async (): Promise<Meeting[]> => {
        const response = await api.get<Meeting[]>('/meetings');
        return response.data;
    },

    getById: async (id: string): Promise<Meeting> => {
        const response = await api.get<Meeting>(`/meetings/${id}`);
        return response.data;
    },

    getPublicById: async (id: string): Promise<Meeting> => {
        const response = await api.get<Meeting>(`/meetings/public/${id}`);
        return response.data;
    },

    create: async (data: CreateMeetingRequest): Promise<Meeting> => {
        const response = await api.post<Meeting>('/meetings', data);
        return response.data;
    },

    update: async (id: string, data: UpdateMeetingRequest): Promise<Meeting> => {
        const response = await api.put<Meeting>(`/meetings/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/meetings/${id}`);
    },
};

// Invites API
export const invitesAPI = {
    generate: async (meetingId: string): Promise<{ inviteToken: string; inviteUrl: string; roomId: string }> => {
        const response = await api.post('/invites/generate', { meetingId });
        return response.data;
    },

    validate: async (token: string): Promise<{ meeting: any; room: any }> => {
        const response = await api.get(`/invites/${token}`);
        return response.data;
    },

    join: async (token: string, guestName?: string): Promise<{ meetingId: string; roomId: string; guestId: string; guestName: string; role: string }> => {
        const response = await api.post(`/invites/${token}/join`, { guestName });
        return response.data;
    },

    toggleInvite: async (meetingId: string, enabled: boolean): Promise<{ inviteEnabled: boolean }> => {
        const response = await api.put(`/invites/${meetingId}/toggle`, { enabled });
        return response.data;
    },
};

export const userAPI = {
    getReport: async (): Promise<{ totalMeetings: number; totalLinkShares: number; totalStrokes: number; estimatedTimeSpentMinutes: number; memberSince: string }> => {
        const response = await api.get('/users/report');
        return response.data;
    },
};

export default api;
