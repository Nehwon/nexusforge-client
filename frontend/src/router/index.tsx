import { Navigate, createBrowserRouter } from 'react-router-dom';
import LoginPage from '../features/auth/pages/LoginPage';
import AccountSecurityPage from '../features/auth/pages/AccountSecurityPage';
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
  { path: '/account/security', element: <AccountSecurityPage /> },
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
