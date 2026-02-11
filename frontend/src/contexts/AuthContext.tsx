/**
 * Authentication Context
 * 
 * This context manages the global authentication state for registered users.
 * It provides:
 * - User state (current logged-in user).
 * - Login/Register/Logout functions interacting with the backend API.
 * - Google OAuth integration.
 * - Session persistence via LocalStorage.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import type { User, LoginRequest, RegisterRequest } from '@/types/auth';

// Define the structure of the authentication context
interface AuthContextType {
    user: User | null; // Current authenticated user object
    isAuthenticated: boolean; // Flag indicating if user is logged in
    isLoading: boolean; // Flag for initial loading state (checking token)
    login: (data: LoginRequest) => Promise<void>; // Function to handle email/password login
    register: (data: RegisterRequest) => Promise<void>; // Function to handle new user registration
    googleLogin: (credential: string) => Promise<void>; // Function to handle Google OAuth login
    logout: () => void; // Function to clear session and log out
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Effect: Check for existing authentication token on app mount
    // This allows the user to stay logged in after page refreshes
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                try {
                    // Restore user session from local storage
                    setUser(JSON.parse(savedUser));
                } catch (error) {
                    console.error('Error parsing saved user:', error);
                    // Clear invalid data if parsing fails
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setIsLoading(false); // Finished initial check
        };

        initAuth();
    }, []);

    // Login function: Authenticates with API and saves session
    const login = async (data: LoginRequest) => {
        try {
            const response = await authAPI.login(data);

            // Save JWT token and user details to LocalStorage for persistence
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify({
                _id: response._id,
                name: response.name,
                email: response.email,
            }));

            // Update local state
            setUser({
                _id: response._id,
                name: response.name,
                email: response.email,
            });
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Login failed');
        }
    };

    // Register function: Creates new account and logs user in
    const register = async (data: RegisterRequest) => {
        try {
            const response = await authAPI.register(data);

            // Save session immediately after registration
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify({
                _id: response._id,
                name: response.name,
                email: response.email,
            }));

            setUser({
                _id: response._id,
                name: response.name,
                email: response.email,
            });
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Registration failed');
        }
    };

    // Google Login: Verifies Google credential with backend
    const googleLogin = async (credential: string) => {
        try {
            const response = await authAPI.googleLogin(credential);

            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify({
                _id: response._id,
                name: response.name,
                email: response.email,
                avatar: response.avatar,
            }));

            setUser({
                _id: response._id,
                name: response.name,
                email: response.email,
            });
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Google login failed');
        }
    };

    // Logout: Clears session data from storage and state
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                googleLogin,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
