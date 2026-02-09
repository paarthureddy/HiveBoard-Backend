
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

// Mock the AuthContext
// This allows us to control the authenticated state in each test
const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute Component', () => {
    
    it('should show loading spinner while checking auth', () => {
        // Setup: Auth is loading
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            isLoading: true,
        });

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        // Expect: Loading text/spinner
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
        // ensure content is hidden
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should specific protected content if authenticated', () => {
        // Setup: User is logged in
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
        });

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        // Expect: The children to be rendered
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should redirect to /auth if not authenticated', () => {
        // Setup: User is NOT logged in
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
        });

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route 
                        path="/dashboard" 
                        element={
                            <ProtectedRoute>
                                <div>Secret Dashboard</div>
                            </ProtectedRoute>
                        } 
                    />
                    <Route path="/auth" element={<div>Auth Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        // Expect: Redirection to Auth Page
        expect(screen.getByText('Auth Page')).toBeInTheDocument();
        // ensure protected content is hidden
        expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument();
    });
});
