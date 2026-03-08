import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../../../components/Layout';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../../../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, login } = useAuth();

  if (currentUser) {
    return <Navigate to="/sessions" replace />;
  }

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    navigate('/sessions');
  };

  return (
    <Layout>
      <section className="card">
        <h1>Connexion Nexus Forge</h1>
        <p>Connexion mock: utilisez un email contenant "gm" pour simuler un MJ.</p>
        <LoginForm onSubmit={handleLogin} />
      </section>
    </Layout>
  );
}
