import { useMemo, useState } from 'react';
import { sessionRepository } from '../../../data/repositories';
import { Session } from '../../../types/session';
import { User } from '../../../types/user';
import Button from '../../../components/Button';

type PartyAdminPanelProps = {
  session: Session;
  currentUser: User;
  onSessionChange: (next: Session) => void;
};

export default function PartyAdminPanel({ session, currentUser, onSessionChange }: PartyAdminPanelProps) {
  const [ownerDraft, setOwnerDraft] = useState(session.ownerUserId ?? session.gmUserId);
  const [gmDraft, setGmDraft] = useState((session.gmUserIds || [session.gmUserId]).join(', '));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canManage = useMemo(() => {
    if (currentUser.roles.includes('admin')) {
      return true;
    }
    const owner = session.ownerUserId || session.gmUserId;
    const gms = session.gmUserIds || [session.gmUserId];
    return owner === currentUser.id || gms.includes(currentUser.id);
  }, [currentUser, session]);

  const handleSave = async () => {
    if (!canManage) {
      return;
    }

    const gmUserIds = Array.from(
      new Set(
        gmDraft
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    );

    if (gmUserIds.length === 0) {
      setErrorMessage('Il faut au moins un MJ.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);

    try {
      const next: Session = {
        ...session,
        ownerUserId: ownerDraft.trim() || session.ownerUserId || session.gmUserId,
        gmUserId: gmUserIds[0],
        gmUserIds,
        participants: (session.participants || []).map((participant) =>
          gmUserIds.includes(participant.userId) ? { ...participant, role: 'gm' } : participant
        ),
        updatedAt: new Date().toISOString()
      };
      await sessionRepository.upsert(next);
      onSessionChange(next);
      setStatusMessage('Administration de la partie mise à jour.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mise à jour impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Administration de la partie</h2>
      {!canManage ? <p style={{ margin: 0 }}>Lecture seule.</p> : null}
      <div className="form">
        <label htmlFor="party-owner">Propriétaire (userId)</label>
        <input
          id="party-owner"
          type="text"
          value={ownerDraft}
          onChange={(event) => setOwnerDraft(event.target.value)}
          disabled={!canManage}
        />

        <label htmlFor="party-gms">MJ (userId séparés par des virgules)</label>
        <input
          id="party-gms"
          type="text"
          value={gmDraft}
          onChange={(event) => setGmDraft(event.target.value)}
          disabled={!canManage}
        />

        <Button type="button" onClick={() => void handleSave()} disabled={!canManage || isSaving}>
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
      {statusMessage ? <p style={{ marginBottom: 0, color: '#067647' }}>{statusMessage}</p> : null}
      {errorMessage ? <p style={{ marginBottom: 0, color: '#b42318' }}>{errorMessage}</p> : null}
    </section>
  );
}
