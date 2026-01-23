import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { AuthContext } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Component - Auto-redirect functionality', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should redirect to dashboard when user is already authenticated', async () => {
    // Mock authenticated user
    const mockAuthValue = {
      currentUser: { uid: 'test-user', email: 'test@example.com' },
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      loginWithGoogle: vi.fn(),
      changePassword: vi.fn(),
      changeEmail: vi.fn(),
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthValue as any}>
          <LanguageProvider>
            <Login />
          </LanguageProvider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // Wait for the redirect to be called
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should NOT redirect when loading authentication state', () => {
    // Mock loading state
    const mockAuthValue = {
      currentUser: null,
      loading: true, // Still loading
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      loginWithGoogle: vi.fn(),
      changePassword: vi.fn(),
      changeEmail: vi.fn(),
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthValue as any}>
          <LanguageProvider>
            <Login />
          </LanguageProvider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // Should not redirect while loading
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should NOT redirect when user is not authenticated', () => {
    // Mock no user
    const mockAuthValue = {
      currentUser: null,
      loading: false, // Not loading, but no user
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      loginWithGoogle: vi.fn(),
      changePassword: vi.fn(),
      changeEmail: vi.fn(),
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthValue as any}>
          <LanguageProvider>
            <Login />
          </LanguageProvider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // Should not redirect when no user
    expect(mockNavigate).not.toHaveBeenCalled();
    // Should show the login form
    expect(screen.getByText(/登录|登錄|login/i)).toBeInTheDocument();
  });
});
