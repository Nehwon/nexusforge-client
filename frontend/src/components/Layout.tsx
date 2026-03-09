import { PropsWithChildren, useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Button from './Button';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';
import { listPendingUsersService } from '../services/authService';

const THEME_STORAGE_KEY = 'nexusforge.theme';

export default function Layout({ children }: PropsWithChildren) {
  const { currentUser, logout } = useAuth();
  const { locale, setLocale, supportedLocales, t } = useI18n();
  const isAdmin = Boolean(currentUser?.roles.includes('admin'));
  const canUseRulesStudio = Boolean(currentUser && (currentUser.roles.includes('gm') || currentUser.roles.includes('admin')));
  const [pendingCount, setPendingCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    if (!isAdmin) {
      setPendingCount(0);
      return;
    }

    let isMounted = true;

    const loadPending = async () => {
      try {
        const items = await listPendingUsersService();
        if (isMounted) {
          setPendingCount(items.length);
        }
      } catch {
        if (isMounted) {
          setPendingCount(0);
        }
      }
    };

    void loadPending();
    const interval = window.setInterval(() => {
      void loadPending();
    }, 30_000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [isAdmin]);

  useEffect(() => {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    document.body.classList.toggle('theme-light', theme === 'light');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <>
      <header className="top-nav">
        <div className="top-nav__inner">
          <Link to="/" className="top-nav__brand">
            {t('nav.brand')}
          </Link>
          <nav className="top-nav__links" aria-label="Navigation principale">
            {currentUser ? (
              <>
                <NavLink to="/sessions" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                  {t('nav.parties')}
                </NavLink>
                {canUseRulesStudio ? (
                  <NavLink to="/systems" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                    {t('nav.rules')}
                  </NavLink>
                ) : null}
                <NavLink to="/account/security" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                  {t('nav.security')}
                </NavLink>
                {isAdmin ? (
                  <NavLink to="/admin/users/pending" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                    {t('nav.admin')}
                  </NavLink>
                ) : null}
                {canUseRulesStudio ? (
                  <NavLink to="/i18n-dictionary" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                    {t('nav.dictionary')}
                  </NavLink>
                ) : null}
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                  {t('nav.login')}
                </NavLink>
                <NavLink to="/register" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                  {t('nav.register')}
                </NavLink>
              </>
            )}
          </nav>
          <div className="top-nav__right">
            <label className="top-nav__locale">
              <span>{t('nav.language')}</span>
              <select value={locale} onChange={(event) => setLocale(event.target.value as (typeof supportedLocales)[number])}>
                {supportedLocales.map((item) => (
                  <option key={item} value={item}>
                    {item.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="top-nav__locale">
              <span>{t('nav.theme')}</span>
              <select value={theme} onChange={(event) => setTheme(event.target.value === 'light' ? 'light' : 'dark')}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
            {currentUser ? (
              <>
                <span className="top-nav__user">{currentUser.displayName}</span>
                <Button variant="secondary" onClick={logout}>
                  {t('nav.logout')}
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {isAdmin && pendingCount > 0 ? (
          <div className="admin-pending-banner">
            <Link to="/admin/users/pending">
              {pendingCount} compte(s) en attente de validation admin
            </Link>
          </div>
        ) : null}
      </header>
      <main className="page">{children}</main>
    </>
  );
}
