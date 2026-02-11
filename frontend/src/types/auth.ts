export interface User {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    _id: string;
    name: string;
    email: string;
    token: string;
    avatar?: string;
}
