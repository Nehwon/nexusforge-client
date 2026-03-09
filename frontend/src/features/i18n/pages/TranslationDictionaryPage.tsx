import { useState } from 'react';
import Layout from '../../../components/Layout';
import { useI18n } from '../../../hooks/useI18n';
import Button from '../../../components/Button';

export default function TranslationDictionaryPage() {
  const { exportDictionary, importDictionary, resetDictionary } = useI18n();
  const [draft, setDraft] = useState<string>(exportDictionary());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = () => {
    setDraft(exportDictionary());
  };

  const handleImport = () => {
    try {
      importDictionary(draft);
      setStatus('Dictionnaire importé avec succès.');
      setError(null);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'JSON invalide.');
      setStatus(null);
    }
  };

  const handleReset = () => {
    resetDictionary();
    setDraft('{}');
    setStatus('Overrides supprimés.');
    setError(null);
  };

  return (
    <Layout>
      <section className="card" style={{ marginBottom: '1rem' }}>
        <h1>Dictionnaire de traduction</h1>
        <p style={{ marginTop: 0 }}>
          Tu peux importer un JSON généré automatiquement (IA/outil), puis corriger manuellement les libellés.
        </p>
      </section>

      <section className="card">
        <label htmlFor="dictionary-json" style={{ display: 'grid', gap: '0.35rem' }}>
          <span>JSON des overrides</span>
          <textarea
            id="dictionary-json"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={22}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem' }}
          />
        </label>

        <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Button type="button" onClick={handleImport}>
            Importer
          </Button>
          <Button type="button" variant="secondary" onClick={handleRefresh}>
            Recharger depuis le stockage
          </Button>
          <Button type="button" variant="secondary" onClick={handleReset}>
            Réinitialiser
          </Button>
        </div>

        {status ? <p style={{ color: '#067647' }}>{status}</p> : null}
        {error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
      </section>
    </Layout>
  );
}
