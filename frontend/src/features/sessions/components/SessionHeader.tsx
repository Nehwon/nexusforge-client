type SessionHeaderProps = {
  sessionName: string;
  sessionState: string;
  role: 'gm' | 'player';
};

export default function SessionHeader({ sessionName, sessionState, role }: SessionHeaderProps) {
  return (
    <header className="card" style={{ marginBottom: '1rem' }}>
      <h1 style={{ marginTop: 0 }}>{sessionName}</h1>
      <p style={{ marginBottom: 0 }}>
        État: <strong>{sessionState}</strong> | Rôle actuel: <strong>{role === 'gm' ? 'MJ' : 'Joueur'}</strong>
      </p>
    </header>
  );
}
