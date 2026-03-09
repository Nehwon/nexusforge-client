import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { verifyEmailService } from '../../../services/authService';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!token) {
        if (isMounted) {
          setError('Token de vérification manquant.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await verifyEmailService(token);
        if (isMounted) {
          setStatus(response.approvalStatus);
        }
      } catch (verifyError) {
        if (isMounted) {
          setError(verifyError instanceof Error ? verifyError.message : 'Validation email impossible.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <Layout>
      <section className="card">
        <h1>Validation email</h1>
        {isLoading ? <p>Validation en cours...</p> : null}
        {!isLoading && error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
        {!isLoading && !error ? (
          <p style={{ color: '#027a48' }}>
            Email validé. Statut du compte: <strong>{status}</strong>.
          </p>
        ) : null}
        <Link to="/login">Aller à la connexion</Link>
      </section>
    </Layout>
  );
}
