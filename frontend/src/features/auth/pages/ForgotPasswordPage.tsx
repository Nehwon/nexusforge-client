import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import { forgotPasswordService } from '../../../services/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await forgotPasswordService(email);
      setMessage('Si l’email existe, un lien de réinitialisation a été envoyé.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Action impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="card">
        <h1>Mot de passe oublié</h1>
        <form className="form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          {message ? <p style={{ color: '#027a48', margin: 0 }}>{message}</p> : null}
          {error ? <p style={{ color: '#b42318', margin: 0 }}>{error}</p> : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Envoi...' : 'Envoyer le lien'}
          </Button>
          <Link to="/login">Retour connexion</Link>
        </form>
      </section>
    </Layout>
  );
}
