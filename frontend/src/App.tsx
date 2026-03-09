import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './features/auth/store/authStore';
import { runSyncCycle } from './services/syncService';
import { I18nProvider } from './i18n/I18nProvider';

export default function App() {
  useEffect(() => {
    const triggerSync = () => {
      if (!navigator.onLine) {
        return;
      }
      void runSyncCycle();
    };

    triggerSync();
    window.addEventListener('online', triggerSync);
    const intervalId = window.setInterval(() => {
      void runSyncCycle();
    }, 15_000);

    return () => {
      window.removeEventListener('online', triggerSync);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <I18nProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </I18nProvider>
  );
}
