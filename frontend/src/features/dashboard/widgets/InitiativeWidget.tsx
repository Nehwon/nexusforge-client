import { useEffect, useMemo, useState } from 'react';
import { sessionRepository } from '../../../data/repositories';
import { sendSystemMessage } from '../../../stores/chatStore';
import { Session, SessionInitiativeEntry, SessionInitiativeState } from '../../../types/session';
import { User } from '../../../types/user';

type InitiativeWidgetProps = {
  currentUser: User;
  currentSession: Session;
  role: 'gm' | 'player';
};

function normalizeInitiative(session: Session): SessionInitiativeState {
  if (session.initiative) {
    return session.initiative;
  }

  return {
    round: 0,
    turnIndex: 0,
    isInCombat: false,
    entries: []
  };
}

function buildDefaultEntries(session: Session): SessionInitiativeEntry[] {
  const players = (session.participants ?? []).filter((participant) => participant.role === 'player');
  return players.map((player, index) => ({
    id: `init-${player.userId}`,
    type: 'character',
    name: `Joueur ${index + 1}`,
    initiative: 15 - index,
    characterId: player.characterId ?? null,
    isActive: true
  }));
}

export default function InitiativeWidget({ currentSession, role }: InitiativeWidgetProps) {
  const [initiative, setInitiative] = useState<SessionInitiativeState>(normalizeInitiative(currentSession));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadInitiative() {
      try {
        const session = await sessionRepository.getById(currentSession.id);
        if (isMounted && session) {
          setInitiative(normalizeInitiative(session));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Impossible de charger l'initiative.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitiative();

    return () => {
      isMounted = false;
    };
  }, [currentSession.id]);

  const activeEntry = useMemo(() => {
    if (!initiative.entries.length || !initiative.isInCombat) {
      return null;
    }
    return initiative.entries[initiative.turnIndex] ?? null;
  }, [initiative]);

  const persist = async (next: SessionInitiativeState) => {
    try {
      const updatedSession = await sessionRepository.updateInitiative(currentSession.id, next);
      if (!updatedSession) {
        setErrorMessage('Session introuvable.');
        return;
      }
      setInitiative(next);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'enregistrer l'initiative.");
    }
  };

  const handleStartCombat = async () => {
    const baseEntries = initiative.entries.length > 0 ? initiative.entries : buildDefaultEntries(currentSession);
    if (baseEntries.length === 0) {
      setErrorMessage('Aucun combattant disponible pour demarrer le combat.');
      return;
    }

    const entries = [...baseEntries].sort((a, b) => b.initiative - a.initiative);
    const next: SessionInitiativeState = {
      round: 1,
      turnIndex: 0,
      isInCombat: true,
      entries
    };

    await persist(next);
    sendSystemMessage({
      sessionId: currentSession.id,
      content: `Combat demarre. Round 1 - Tour de ${entries[0].name}.`,
      systemType: 'combat_start'
    });
  };

  const handleNextTurn = async () => {
    if (!initiative.isInCombat || !initiative.entries.length) {
      return;
    }

    const nextTurnIndex = initiative.turnIndex + 1;
    const reachedEndOfRound = nextTurnIndex >= initiative.entries.length;
    const round = reachedEndOfRound ? initiative.round + 1 : initiative.round;
    const turnIndex = reachedEndOfRound ? 0 : nextTurnIndex;
    const next: SessionInitiativeState = {
      ...initiative,
      round,
      turnIndex
    };

    await persist(next);

    if (reachedEndOfRound) {
      sendSystemMessage({
        sessionId: currentSession.id,
        content: `Round ${round} commence.`,
        systemType: 'round'
      });
    }

    const current = next.entries[next.turnIndex];
    sendSystemMessage({
      sessionId: currentSession.id,
      content: `Tour de ${current.name}.`,
      systemType: 'turn'
    });
  };

  const handleEndCombat = async () => {
    if (!initiative.isInCombat) {
      return;
    }

    const completedRounds = initiative.round;
    const next: SessionInitiativeState = {
      ...initiative,
      isInCombat: false,
      round: 0,
      turnIndex: 0
    };

    await persist(next);
    sendSystemMessage({
      sessionId: currentSession.id,
      content: `Combat termine apres ${completedRounds} rounds.`,
      systemType: 'combat_end'
    });
  };

  return (
    <div style={{ display: 'grid', gap: '0.7rem' }}>
      {isLoading ? <p style={{ margin: 0 }}>Chargement initiative...</p> : null}
      {errorMessage ? <p style={{ margin: 0, color: '#b42318' }}>{errorMessage}</p> : null}

      {!isLoading ? (
        <>
          <p style={{ margin: 0 }}>
            Etat: <strong>{initiative.isInCombat ? 'Combat en cours' : 'Hors combat'}</strong>
            {initiative.isInCombat ? (
              <>
                {' '}
                | Round <strong>{initiative.round}</strong>
              </>
            ) : null}
          </p>

          {activeEntry ? (
            <p style={{ margin: 0 }}>
              Tour actif: <strong>{activeEntry.name}</strong>
            </p>
          ) : null}

          <ul style={{ margin: 0, paddingLeft: '1rem', display: 'grid', gap: '0.35rem' }}>
            {initiative.entries.map((entry, index) => (
              <li key={entry.id}>
                <strong>{entry.name}</strong> (init {entry.initiative})
                {initiative.isInCombat && index === initiative.turnIndex ? ' <- actif' : ''}
              </li>
            ))}
          </ul>

          {role === 'gm' ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="button" type="button" onClick={() => void handleStartCombat()} disabled={initiative.isInCombat}>
                Demarrer
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => void handleNextTurn()}
                disabled={!initiative.isInCombat}
              >
                Tour suivant
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => void handleEndCombat()}
                disabled={!initiative.isInCombat}
              >
                Terminer combat
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
