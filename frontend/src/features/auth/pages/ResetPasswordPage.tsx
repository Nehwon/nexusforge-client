import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import { resetPasswordService } from '../../../services/authService';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await resetPasswordService(token, password);
      setMessage('Mot de passe mis à jour.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Réinitialisation impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="card">
        <h1>Réinitialiser le mot de passe</h1>
        {!token ? <p style={{ color: '#b42318' }}>Lien invalide: token manquant.</p> : null}
        <form className="form" onSubmit={handleSubmit}>
          <label htmlFor="password">Nouveau mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={10}
            required
            disabled={!token}
          />
          {message ? <p style={{ color: '#027a48', margin: 0 }}>{message}</p> : null}
          {error ? <p style={{ color: '#b42318', margin: 0 }}>{error}</p> : null}
          <Button type="submit" disabled={isSubmitting || !token}>
            {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
          </Button>
          <Link to="/login">Retour connexion</Link>
        </form>
      </section>
    </Layout>
  );
}
