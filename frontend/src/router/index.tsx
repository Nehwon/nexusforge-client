import { Navigate, createBrowserRouter } from 'react-router-dom';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
import VerifyEmailPage from '../features/auth/pages/VerifyEmailPage';
import AccountSecurityPage from '../features/auth/pages/AccountSecurityPage';
import AdminPendingUsersPage from '../features/auth/pages/AdminPendingUsersPage';
import SessionsListPage from '../features/sessions/pages/SessionsListPage';
import SessionViewPage from '../features/sessions/pages/SessionViewPage';
import { useAuth } from '../hooks/useAuth';

function RootRedirect() {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) {
    return <div style={{ padding: '1rem' }}>Chargement...</div>;
  }
  return <Navigate to={currentUser ? '/sessions' : '/login'} replace />;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) {
    return <div style={{ padding: '1rem' }}>Chargement...</div>;
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  {
    path: '/account/security',
    element: (
      <RequireAuth>
        <AccountSecurityPage />
      </RequireAuth>
    )
  },
  {
    path: '/admin/users/pending',
    element: (
      <RequireAuth>
        <AdminPendingUsersPage />
      </RequireAuth>
    )
  },
  {
    path: '/sessions',
    element: (
      <RequireAuth>
        <SessionsListPage />
      </RequireAuth>
    )
  },
  {
    path: '/sessions/:sessionId',
    element: (
      <RequireAuth>
        <SessionViewPage />
      </RequireAuth>
    )
  }
]);
