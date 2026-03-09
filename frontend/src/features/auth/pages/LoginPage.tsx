import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../../../components/Layout';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../../../hooks/useAuth';
import { mapAuthErrorMessage } from '../../../services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, login } = useAuth();

  if (currentUser) {
    return <Navigate to="/sessions" replace />;
  }

  const handleLogin = async (params: {
    email: string;
    password: string;
    totpCode?: string;
    challengeToken?: string;
  }): Promise<{ status: 'authenticated' } | { status: 'requires_2fa'; challengeToken: string } | { status: 'error'; message: string }> => {
    try {
      const result = await login(params);

      if (result.status === 'requires_2fa') {
        return {
          status: 'requires_2fa',
          challengeToken: result.challengeToken
        };
      }

      navigate('/sessions');
      return { status: 'authenticated' };
    } catch (error) {
      return {
        status: 'error',
        message: mapAuthErrorMessage(error)
      };
    }
  };

  return (
    <Layout>
      <section className="card">
        <h1>Connexion Nexus Forge</h1>
        <p>Connexion sécurisée avec validation email, approbation admin et 2FA TOTP optionnel.</p>
        <LoginForm onSubmit={handleLogin} />
      </section>
    </Layout>
  );
}
