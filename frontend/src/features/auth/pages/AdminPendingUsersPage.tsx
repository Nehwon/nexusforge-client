import { useEffect, useMemo, useState } from 'react';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import { approveUserService, listPendingUsersService } from '../../../services/authService';
import { User } from '../../../types/user';
import { useAuth } from '../../../hooks/useAuth';
import { systemRepository } from '../../../data/repositories';
import { GameSystem } from '../../../types/system';

type AdminSystemUsage = GameSystem & {
  usage: {
    usersUsingNow: number;
    activeSessionsCount: number;
    archivedSessionsCount: number;
    totalSessionsCount: number;
    lastUsedAt: string | null;
  };
};

type EditableSystemAdminState = {
  visibility: 'public' | 'private';
  viewerUserIds: string;
  editorUserIds: string;
};

function parseIds(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function looksLikeTestSystem(system: GameSystem): boolean {
  const haystack = `${system.name} ${system.description ?? ''} ${system.id}`.toLowerCase();
  return ['test', 'demo', 'tmp', 'draft', 'copie', 'copy', 'nouveau'].some((token) => haystack.includes(token));
}

export default function AdminPendingUsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [usage, setUsage] = useState<AdminSystemUsage[]>([]);
  const [replacementBySystemId, setReplacementBySystemId] = useState<Record<string, string>>({});
  const [editableBySystemId, setEditableBySystemId] = useState<Record<string, EditableSystemAdminState>>({});
  const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);
  const [systemSearch, setSystemSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingSystem, setIsSavingSystem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadData = async () => {
    const [pendingUsers, systemsUsage] = await Promise.all([listPendingUsersService(), systemRepository.listUsageForAdmin()]);
    const typed = systemsUsage as AdminSystemUsage[];
    setUsers(pendingUsers);
    setUsage(typed);
    setSelectedSystemIds((previous) => previous.filter((id) => typed.some((item) => item.id === id)));
    setEditableBySystemId(
      typed.reduce<Record<string, EditableSystemAdminState>>((acc, system) => {
        acc[system.id] = {
          visibility: system.visibility,
          viewerUserIds: (system.viewerUserIds ?? []).join(', '),
          editorUserIds: (system.editorUserIds ?? []).join(', ')
        };
        return acc;
      }, {})
    );
  };

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        await loadData();
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const ownerOptions = useMemo(() => {
    const owners = Array.from(new Set(usage.map((item) => item.ownerUserId))).sort((a, b) => a.localeCompare(b));
    return owners;
  }, [usage]);

  const filteredUsage = useMemo(() => {
    const search = systemSearch.trim().toLowerCase();
    return usage.filter((item) => {
      if (visibilityFilter !== 'all' && item.visibility !== visibilityFilter) {
        return false;
      }
      if (ownerFilter !== 'all' && item.ownerUserId !== ownerFilter) {
        return false;
      }
      if (!search) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(search) ||
        item.id.toLowerCase().includes(search) ||
        (item.description ?? '').toLowerCase().includes(search) ||
        item.ownerUserId.toLowerCase().includes(search)
      );
    });
  }, [usage, systemSearch, visibilityFilter, ownerFilter]);

  const approveAs = async (userId: string, roles: string[]) => {
    try {
      setError(null);
      await approveUserService(userId, roles);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Validation impossible.');
    }
  };

  const saveSystemAdmin = async (systemId: string) => {
    if (!currentUser) {
      return;
    }
    const target = usage.find((item) => item.id === systemId);
    const edited = editableBySystemId[systemId];
    if (!target || !edited) {
      return;
    }

    setError(null);
    setStatus(null);
    setIsSavingSystem(true);

    try {
      await systemRepository.upsert(
        {
          ...target,
          visibility: edited.visibility,
          viewerUserIds: parseIds(edited.viewerUserIds),
          editorUserIds: parseIds(edited.editorUserIds)
        },
        currentUser
      );
      await loadData();
      setStatus(`Système mis à jour: ${target.name}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Mise à jour système impossible.');
    } finally {
      setIsSavingSystem(false);
    }
  };

  const deleteSystem = async (systemId: string) => {
    const target = usage.find((item) => item.id === systemId);
    if (!target) {
      return;
    }

    const replacementSystemId =
      replacementBySystemId[systemId] || usage.find((candidate) => candidate.id !== systemId)?.id || '';

    if (!replacementSystemId) {
      setError('Aucun système de remplacement disponible.');
      return;
    }

    const replacementName = usage.find((candidate) => candidate.id === replacementSystemId)?.name || replacementSystemId;
    const confirmed = window.confirm(
      `Supprimer le système "${target.name}" ? Les parties liées seront migrées vers "${replacementName}".`
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setStatus(null);
    setIsDeleting(true);

    try {
      const result = await systemRepository.deleteAsAdmin({
        systemId,
        replacementSystemId
      });
      await loadData();
      setStatus(`Système supprimé. Parties migrées: ${result.migratedSessionsCount}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Suppression impossible.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSystemSelection = (systemId: string) => {
    setSelectedSystemIds((previous) => (previous.includes(systemId) ? previous.filter((id) => id !== systemId) : [...previous, systemId]));
  };

  const selectAllFiltered = () => {
    setSelectedSystemIds(filteredUsage.map((item) => item.id));
  };

  const selectLikelyTests = () => {
    setSelectedSystemIds(filteredUsage.filter((item) => looksLikeTestSystem(item)).map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedSystemIds([]);
  };

  const deleteSelectedSystems = async () => {
    const unique = Array.from(new Set(selectedSystemIds));
    if (unique.length === 0) {
      setError('Aucun système sélectionné.');
      return;
    }
    if (usage.length <= 1) {
      setError('Impossible de supprimer: il faut au moins un système restant.');
      return;
    }

    const replacementFallback = usage.find((item) => !unique.includes(item.id))?.id;
    if (!replacementFallback) {
      setError('Aucun système de remplacement valide.');
      return;
    }

    const confirmed = window.confirm(
      `Supprimer ${unique.length} système(s) sélectionné(s) ? Les parties seront migrées vers un système de remplacement.`
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setStatus(null);
    setIsDeleting(true);
    let migratedTotal = 0;
    let deletedCount = 0;

    try {
      for (const systemId of unique) {
        const replacementSystemId =
          replacementBySystemId[systemId] || usage.find((candidate) => candidate.id !== systemId && !unique.includes(candidate.id))?.id || replacementFallback;
        if (!replacementSystemId || replacementSystemId === systemId) {
          continue;
        }
        const result = await systemRepository.deleteAsAdmin({ systemId, replacementSystemId });
        migratedTotal += result.migratedSessionsCount;
        deletedCount += 1;
      }
      await loadData();
      setSelectedSystemIds([]);
      setStatus(`Suppression en masse terminée: ${deletedCount} système(s), ${migratedTotal} partie(s) migrée(s).`);
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : 'Suppression en masse impossible.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentUser?.roles.includes('admin')) {
    return (
      <Layout>
        <section className="card">Accès admin requis.</section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="card" style={{ marginBottom: '1rem' }}>
        <h1>Comptes en attente</h1>
        <p>Seuls les comptes avec email validé apparaissent ici.</p>
        {isLoading ? <p>Chargement...</p> : null}
        {error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
        {status ? <p style={{ color: '#067647' }}>{status}</p> : null}
        {!isLoading && users.length === 0 ? <p>Aucun compte à valider.</p> : null}

        <div className="grid">
          {users.map((user) => (
            <article key={user.id} className="card">
              <h2 style={{ marginTop: 0 }}>{user.displayName}</h2>
              <p style={{ margin: 0 }}>{user.email}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <Button onClick={() => approveAs(user.id, ['player'])}>Valider Joueur</Button>
                <Button variant="secondary" onClick={() => approveAs(user.id, ['gm', 'player'])}>
                  Valider MJ
                </Button>
                <Button variant="secondary" onClick={() => approveAs(user.id, ['admin', 'gm', 'player'])}>
                  Valider Admin
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Gestion des systèmes (admin)</h2>
        <p style={{ marginTop: 0 }}>
          Modifier visibilité, lecteurs, co-éditeurs, consulter usage et supprimer avec migration.
        </p>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Total: {usage.length} | Affichés: {filteredUsage.length} | Sélection: {selectedSystemIds.length}
        </p>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '0.8rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Recherche</span>
            <input value={systemSearch} onChange={(event) => setSystemSearch(event.target.value)} placeholder="nom, id, owner..." />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Visibilité</span>
            <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as 'all' | 'public' | 'private')}>
              <option value="all">Toutes</option>
              <option value="public">Public</option>
              <option value="private">Privé</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Propriétaire</span>
            <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option value="all">Tous</option>
              {ownerOptions.map((ownerId) => (
                <option key={ownerId} value={ownerId}>
                  {ownerId}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <Button type="button" variant="secondary" onClick={selectAllFiltered}>
            Tout sélectionner (filtre)
          </Button>
          <Button type="button" variant="secondary" onClick={selectLikelyTests}>
            Sélectionner systèmes test probables
          </Button>
          <Button type="button" variant="secondary" onClick={clearSelection}>
            Vider sélection
          </Button>
          <Button type="button" variant="secondary" onClick={() => void deleteSelectedSystems()} disabled={isDeleting || selectedSystemIds.length === 0}>
            Supprimer sélection
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void loadData();
            }}
          >
            Rafraîchir
          </Button>
        </div>

        {!isLoading && filteredUsage.length === 0 ? <p>Aucun système.</p> : null}
        <div className="grid">
          {filteredUsage.map((item) => {
            const edited = editableBySystemId[item.id] ?? {
              visibility: item.visibility,
              viewerUserIds: (item.viewerUserIds ?? []).join(', '),
              editorUserIds: (item.editorUserIds ?? []).join(', ')
            };

            return (
              <article key={item.id} className="card">
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedSystemIds.includes(item.id)}
                    onChange={() => toggleSystemSelection(item.id)}
                  />
                  <span>Sélectionner</span>
                </label>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{item.name}</h3>
                <p style={{ marginTop: 0, marginBottom: '0.45rem' }}>{item.description || 'Aucune description'}</p>
                <p style={{ margin: 0 }}>ID: {item.id}</p>
                <p style={{ margin: 0 }}>Owner: {item.ownerUserId}</p>
                <p style={{ margin: 0 }}>Utilisateurs actifs actuellement: {item.usage.usersUsingNow}</p>
                <p style={{ margin: 0 }}>Parties actives: {item.usage.activeSessionsCount}</p>
                <p style={{ margin: 0 }}>Parties archivées: {item.usage.archivedSessionsCount}</p>
                <p style={{ margin: 0 }}>Total parties: {item.usage.totalSessionsCount}</p>
                <p style={{ margin: 0 }}>
                  Dernière utilisation: {item.usage.lastUsedAt ? new Date(item.usage.lastUsedAt).toLocaleString() : 'Jamais'}
                </p>

                <div style={{ marginTop: '0.6rem', display: 'grid', gap: '0.45rem' }}>
                  <label style={{ display: 'grid', gap: '0.25rem' }}>
                    <span>Visibilité</span>
                    <select
                      value={edited.visibility}
                      onChange={(event) =>
                        setEditableBySystemId((previous) => ({
                          ...previous,
                          [item.id]: {
                            ...edited,
                            visibility: event.target.value === 'public' ? 'public' : 'private'
                          }
                        }))
                      }
                    >
                      <option value="private">Privé</option>
                      <option value="public">Public</option>
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: '0.25rem' }}>
                    <span>Lecteurs (IDs comptes, virgule)</span>
                    <input
                      value={edited.viewerUserIds}
                      onChange={(event) =>
                        setEditableBySystemId((previous) => ({
                          ...previous,
                          [item.id]: {
                            ...edited,
                            viewerUserIds: event.target.value
                          }
                        }))
                      }
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '0.25rem' }}>
                    <span>Co-éditeurs (IDs comptes, virgule)</span>
                    <input
                      value={edited.editorUserIds}
                      onChange={(event) =>
                        setEditableBySystemId((previous) => ({
                          ...previous,
                          [item.id]: {
                            ...edited,
                            editorUserIds: event.target.value
                          }
                        }))
                      }
                    />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '0.35rem', marginTop: '0.6rem' }}>
                  <span>Système de remplacement (si suppression)</span>
                  <select
                    value={replacementBySystemId[item.id] ?? ''}
                    onChange={(event) =>
                      setReplacementBySystemId((previous) => ({
                        ...previous,
                        [item.id]: event.target.value
                      }))
                    }
                  >
                    <option value="">Auto</option>
                    {usage
                      .filter((candidate) => candidate.id !== item.id)
                      .map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                  </select>
                </label>

                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button type="button" variant="secondary" onClick={() => void saveSystemAdmin(item.id)} disabled={isSavingSystem}>
                    Enregistrer droits
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void deleteSystem(item.id)} disabled={isDeleting}>
                    Supprimer ce système
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </Layout>
  );
}
