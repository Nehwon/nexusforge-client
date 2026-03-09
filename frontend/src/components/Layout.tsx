import { PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Button from './Button';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }: PropsWithChildren) {
  const { currentUser, logout } = useAuth();
  const isAdmin = Boolean(currentUser?.roles.includes('admin'));

  return (
    <>
      <header className="top-nav">
        <div className="top-nav__inner">
          <Link to="/" className="top-nav__brand">
            NexusForge
          </Link>
          <nav className="top-nav__links" aria-label="Navigation principale">
            {currentUser ? (
              <>
                <NavLink to="/sessions" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                  Sessions
                </NavLink>
                <NavLink to="/account/security" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                  Sécurité
                </NavLink>
                {isAdmin ? (
                  <NavLink to="/admin/users/pending" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                    Admin
                  </NavLink>
                ) : null}
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                  Connexion
                </NavLink>
                <NavLink to="/register" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                  Inscription
                </NavLink>
              </>
            )}
          </nav>
          <div className="top-nav__right">
            {currentUser ? (
              <>
                <span className="top-nav__user">{currentUser.displayName}</span>
                <Button variant="secondary" onClick={logout}>
                  Déconnexion
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
