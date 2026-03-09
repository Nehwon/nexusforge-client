import { FormEvent, useState } from 'react';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import {
  changePasswordService,
  disableTotpService,
  enableTotpService,
  mapAuthErrorMessage,
  setupTotpService
} from '../../../services/authService';
import { useAuth } from '../../../hooks/useAuth';

export default function AccountSecurityPage() {
  const { currentUser, reloadCurrentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [totpSetupSecret, setTotpSetupSecret] = useState<string | null>(null);
  const [totpSetupUrl, setTotpSetupUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpDisableCode, setTotpDisableCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPasswordMessage(null);

    try {
      await changePasswordService(currentPassword, newPassword);
      setPasswordMessage('Mot de passe mis à jour.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (submitError) {
      setError(mapAuthErrorMessage(submitError));
    }
  };

  const handleStartTotpSetup = async () => {
    setError(null);
    try {
      const response = await setupTotpService();
      setTotpSetupSecret(response.secret);
      setTotpSetupUrl(response.otpauthUrl);
    } catch (setupError) {
      setError(mapAuthErrorMessage(setupError));
    }
  };

  const handleEnableTotp = async () => {
    setError(null);
    try {
      await enableTotpService(totpCode);
      await reloadCurrentUser();
      setTotpCode('');
      setTotpSetupSecret(null);
      setTotpSetupUrl(null);
    } catch (enableError) {
      setError(mapAuthErrorMessage(enableError));
    }
  };

  const handleDisableTotp = async () => {
    setError(null);
    try {
      await disableTotpService(totpDisableCode);
      await reloadCurrentUser();
      setTotpDisableCode('');
    } catch (disableError) {
      setError(mapAuthErrorMessage(disableError));
    }
  };

  return (
    <Layout>
      <section className="card" style={{ marginBottom: '1rem' }}>
        <h1>Sécurité du compte</h1>
        <p>2FA TOTP optionnel (fortement recommandé).</p>
        <p style={{ marginBottom: 0 }}>
          Compte: <strong>{currentUser?.displayName}</strong>
        </p>
      </section>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Changer le mot de passe</h2>
        <form className="form" onSubmit={handleChangePassword}>
          <label htmlFor="currentPassword">Mot de passe actuel</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />

          <label htmlFor="newPassword">Nouveau mot de passe</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={10}
            required
          />

          {passwordMessage ? <p style={{ color: '#027a48', margin: 0 }}>{passwordMessage}</p> : null}
          <Button type="submit">Mettre à jour</Button>
        </form>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Authentification à 2 facteurs (TOTP)</h2>
        <p style={{ marginTop: 0 }}>
          Statut: <strong>{currentUser?.hasTotpEnabled ? 'activée' : 'désactivée'}</strong>
        </p>

        {!currentUser?.hasTotpEnabled ? (
          <div className="grid">
            <Button onClick={handleStartTotpSetup}>Générer une clé TOTP</Button>
            {totpSetupSecret ? (
              <div className="card" style={{ background: '#f8f9fc' }}>
                <p style={{ marginTop: 0 }}>
                  Clé manuelle: <code>{totpSetupSecret}</code>
                </p>
                <p style={{ marginTop: 0 }}>
                  URI: <code>{totpSetupUrl}</code>
                </p>
                <label htmlFor="totpCode">Code TOTP</label>
                <input
                  id="totpCode"
                  type="text"
                  placeholder="123456"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                />
                <div style={{ marginTop: '0.5rem' }}>
                  <Button onClick={handleEnableTotp}>Activer TOTP</Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="form">
            <label htmlFor="totpDisableCode">Code TOTP pour désactiver</label>
            <input
              id="totpDisableCode"
              type="text"
              value={totpDisableCode}
              onChange={(event) => setTotpDisableCode(event.target.value)}
            />
            <Button variant="secondary" onClick={handleDisableTotp}>
              Désactiver TOTP
            </Button>
          </div>
        )}
      </section>

      {error ? (
        <section className="card" style={{ color: '#b42318', marginTop: '1rem' }}>
          {error}
        </section>
      ) : null}
    </Layout>
  );
}
