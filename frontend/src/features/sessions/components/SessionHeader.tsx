import { Link } from 'react-router-dom';

type SessionHeaderProps = {
  sessionName: string;
  sessionState: string;
  role: 'gm' | 'player';
};

export default function SessionHeader({ sessionName, sessionState, role }: SessionHeaderProps) {
  return (
    <header className="card" style={{ marginBottom: '1rem' }}>
      <p style={{ marginTop: 0, marginBottom: '0.5rem' }}>
        <Link to="/sessions">← Retour à la liste des parties</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>{sessionName}</h1>
      <p style={{ marginBottom: 0 }}>
        État: <strong>{sessionState}</strong> | Rôle actuel: <strong>{role === 'gm' ? 'MJ' : 'Joueur'}</strong>
      </p>
    </header>
  );
}
