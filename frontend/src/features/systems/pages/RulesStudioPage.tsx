import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { systemRepository } from '../../../data/repositories';
import { GameSystem } from '../../../types/system';

export default function RulesStudioPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [systems, setSystems] = useState<GameSystem[]>([]);
  const [blankName, setBlankName] = useState('');
  const [blankDescription, setBlankDescription] = useState('');
  const [duplicateSourceId, setDuplicateSourceId] = useState('');
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateDescription, setDuplicateDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [importPayload, setImportPayload] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canManage = Boolean(currentUser && (currentUser.roles.includes('gm') || currentUser.roles.includes('admin')));

  const ownedSystems = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    return systems.filter((system) => system.ownerUserId === currentUser.id);
  }, [currentUser, systems]);

  const reloadSystems = async () => {
    if (!currentUser) {
      setSystems([]);
      return;
    }
    const available = await systemRepository.listAvailableForUser(currentUser);
    setSystems(available);
    setDuplicateSourceId((current) => current || available[0]?.id || '');
  };

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        if (!currentUser) {
          return;
        }
        const available = await systemRepository.listAvailableForUser(currentUser);
        if (!isMounted) {
          return;
        }
        setSystems(available);
        setDuplicateSourceId(available[0]?.id ?? '');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les systèmes.');
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
  }, [currentUser]);

  const handleCreateBlank = async () => {
    if (!currentUser || !canManage) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);

    try {
      const created = await systemRepository.create({
        owner: currentUser,
        name: blankName.trim() || 'Nouveau système',
        description: blankDescription.trim(),
        visibility: 'private'
      });
      await reloadSystems();
      setBlankName('');
      setBlankDescription('');
      setStatusMessage('Système vierge créé.');
      navigate(`/systems/${created.id}/studio`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de créer le système.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!currentUser || !canManage || !duplicateSourceId) {
      return;
    }

    const source = systems.find((system) => system.id === duplicateSourceId);

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);

    try {
      const duplicated = await systemRepository.duplicate({
        sourceSystemId: duplicateSourceId,
        actor: currentUser,
        name: duplicateName.trim() || `${source?.name ?? 'Système'} (copie ${currentUser.displayName})`,
        description: duplicateDescription.trim()
      });
      await reloadSystems();
      setDuplicateName('');
      setDuplicateDescription('');
      setStatusMessage('Système dupliqué.');
      navigate(`/systems/${duplicated.id}/studio`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de dupliquer le système.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportSystem = (system: GameSystem) => {
    const payload = JSON.stringify(system, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${system.name.replace(/[^a-zA-Z0-9-_]+/g, '_') || 'system'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSystem = async () => {
    if (!currentUser || !canManage) {
      return;
    }
    if (!importPayload.trim()) {
      setErrorMessage('Colle un JSON a importer.');
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);
    try {
      const parsed = JSON.parse(importPayload) as Partial<GameSystem>;
      if (!parsed.name) {
        throw new Error('JSON invalide: name manquant.');
      }

      const created = await systemRepository.create({
        owner: currentUser,
        name: `${parsed.name} (import)`,
        description: parsed.description ?? '',
        visibility: 'private'
      });

      await systemRepository.upsert(
        {
          ...created,
          version: parsed.version ?? created.version,
          tags: parsed.tags ?? created.tags,
          studioSchema: parsed.studioSchema ?? created.studioSchema,
          referenceSheets: parsed.referenceSheets ?? created.referenceSheets,
          rulesProgram: parsed.rulesProgram ?? created.rulesProgram,
          rulesPresentation: parsed.rulesPresentation ?? created.rulesPresentation
        },
        currentUser
      );

      await reloadSystems();
      setStatusMessage(`Système importé: ${created.name}`);
      setImportPayload('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Import impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <section className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ marginTop: 0 }}>Atelier Système</h1>
        <p style={{ marginTop: 0, marginBottom: 0 }}>
          Construis les systèmes en mode visuel: palette à gauche, vue au centre, propriétés à droite.
        </p>
      </section>

      {!canManage ? (
        <section className="card">Accès réservé MJ/Admin.</section>
      ) : null}

      {canManage ? (
        <>
          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>1) Mes systèmes propriétaires</h2>
            {isLoading ? <p>Chargement...</p> : null}
            {!isLoading && ownedSystems.length === 0 ? <p>Aucun système dont vous êtes propriétaire.</p> : null}
            <div className="grid">
              {ownedSystems.map((system) => (
                <article key={system.id} className="card">
                  <h3 style={{ marginTop: 0, marginBottom: '0.4rem' }}>{system.name}</h3>
                  <p style={{ marginTop: 0, marginBottom: '0.4rem' }}>{system.description || 'Aucune description'}</p>
                  {system.forkedFromSystemName ? (
                    <p style={{ marginTop: 0, marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      Basé sur <strong>{system.forkedFromSystemName}</strong>
                    </p>
                  ) : null}
                  <p style={{ marginTop: 0, marginBottom: '0.7rem', fontSize: '0.85rem' }}>
                    Visibilité: {system.visibility} | MAJ: {new Date(system.updatedAt).toLocaleString()}
                  </p>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <Link to={`/systems/${system.id}/studio`}>Ouvrir le studio</Link>
                    <button className="button secondary" type="button" onClick={() => handleExportSystem(system)}>
                      Export JSON
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>2) Créer un système vierge</h2>
            <div className="grid">
              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span>Nom du système</span>
                <input
                  type="text"
                  value={blankName}
                  onChange={(event) => setBlankName(event.target.value)}
                  placeholder="Nom du système"
                />
              </label>
              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span>Description</span>
                <textarea
                  value={blankDescription}
                  onChange={(event) => setBlankDescription(event.target.value)}
                  placeholder="Description du système"
                  rows={3}
                />
              </label>
              <div>
                <Button type="button" onClick={() => void handleCreateBlank()} disabled={isSaving}>
                  Créer un système vierge
                </Button>
              </div>
            </div>
          </section>

          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>3) Dupliquer un système existant</h2>
            <div className="grid">
              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span>Système source</span>
                <select
                  value={duplicateSourceId}
                  onChange={(event) => setDuplicateSourceId(event.target.value)}
                  disabled={systems.length === 0}
                >
                  {systems.length === 0 ? <option value="">Aucun système disponible</option> : null}
                  {systems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span>Nouveau nom du système</span>
                <input
                  type="text"
                  value={duplicateName}
                  onChange={(event) => setDuplicateName(event.target.value)}
                  placeholder="Nouveau nom"
                />
              </label>
              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span>Description</span>
                <textarea
                  value={duplicateDescription}
                  onChange={(event) => setDuplicateDescription(event.target.value)}
                  placeholder="Description du fork"
                  rows={3}
                />
              </label>
              <div>
                <Button type="button" variant="secondary" onClick={() => void handleDuplicate()} disabled={isSaving || !duplicateSourceId}>
                  Dupliquer
                </Button>
              </div>
            </div>
          </section>
          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>4) Import JSON d'un système</h2>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Colle le JSON exporté</span>
              <textarea
                rows={8}
                value={importPayload}
                onChange={(event) => setImportPayload(event.target.value)}
                placeholder='{"name":"Mon systeme", ...}'
              />
            </label>
            <div style={{ marginTop: '0.6rem' }}>
              <Button type="button" variant="secondary" onClick={() => void handleImportSystem()} disabled={isSaving}>
                Importer JSON
              </Button>
            </div>
          </section>
        </>
      ) : null}

      {statusMessage ? (
        <section className="card" style={{ color: '#067647' }}>
          {statusMessage}
        </section>
      ) : null}
      {errorMessage ? (
        <section className="card" style={{ color: '#b42318' }}>
          {errorMessage}
        </section>
      ) : null}
    </Layout>
  );
}
