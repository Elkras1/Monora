import React, { useState } from 'react';
import { Icon } from '../components/icons/Icon';
import { useApp } from '../state/AppContext';
import { PasswordField, PasswordStrengthMeter } from '../components/ui/PasswordField';
import { passwordRequirementsMet } from '../utils/password';

function LoginForm() {
  const { state, actions } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = () => actions.attemptLogin(email, password);

  return (
    <>
      <h2 style={{ marginTop: 18 }}>Anmelden</h2>
      <div className="hint" style={{ marginBottom: 18 }}>
        Willkommen bei Planico
      </div>
      <div className="field">
        <label>E-Mail</label>
        <input
          type="email"
          autoComplete="username"
          placeholder="name@planico.ch"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </div>
      <PasswordField label="Passwort" value={password} onChange={setPassword} autoComplete="current-password" onEnter={submit} />
      <button type="button" className="link-btn login-forgot-link" onClick={() => actions.setAuthView('forgot')}>
        Passwort vergessen?
      </button>
      <div className="login-error">{state.loginError}</div>
      <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }} onClick={submit}>
        <Icon name="check" /> Anmelden
      </button>
    </>
  );
}

function ForgotPasswordForm() {
  const { state, actions } = useApp();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const send = () => {
    if (!email.trim()) return;
    actions.requestPasswordReset(email);
    setSubmitted(true);
  };

  return (
    <>
      <h2 style={{ marginTop: 18 }}>Passwort zurücksetzen</h2>
      <div className="hint" style={{ marginBottom: 18 }}>
        Gib deine E-Mail-Adresse ein — wir senden dir einen Link zum Zurücksetzen.
      </div>
      {!submitted ? (
        <>
          <div className="field">
            <label>E-Mail-Adresse</label>
            <input
              type="email"
              autoComplete="username"
              placeholder="name@planico.ch"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
            />
          </div>
          <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }} onClick={send}>
            Link senden
          </button>
        </>
      ) : (
        <>
          <div className="ok-box" style={{ marginBottom: 16 }}>
            <Icon name="check" /> Wir haben dir einen Link zum Zurücksetzen gesendet.
          </div>
          {state.passwordResetToken ? (
            <>
              <div className="hint" style={{ marginBottom: 10 }}>
                Prototyp-Hinweis: Da hier noch kein echter E-Mail-Versand angebunden ist, kannst du den Reset-Vorgang direkt simulieren.
              </div>
              <button
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                onClick={() => actions.setAuthView('reset')}
              >
                Passwort jetzt zurücksetzen
              </button>
            </>
          ) : null}
        </>
      )}
      <button type="button" className="link-btn login-forgot-link" onClick={() => actions.setAuthView('login')}>
        Zurück zum Login
      </button>
    </>
  );
}

function ResetPasswordForm() {
  const { actions } = useApp();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [touched, setTouched] = useState(false);

  const requirementsOk = passwordRequirementsMet(pw);
  const matchOk = pw.length > 0 && pw === pw2;
  const canSave = requirementsOk && matchOk;

  const save = () => {
    setTouched(true);
    if (!canSave) return;
    actions.resetPassword(pw);
  };

  return (
    <>
      <h2 style={{ marginTop: 18 }}>Neues Passwort setzen</h2>
      <div className="hint" style={{ marginBottom: 18 }}>
        Wähle ein neues Passwort für dein Konto.
      </div>
      <PasswordField label="Neues Passwort" value={pw} onChange={setPw} autoComplete="new-password" />
      <PasswordStrengthMeter password={pw} />
      <PasswordField label="Passwort bestätigen" value={pw2} onChange={setPw2} autoComplete="new-password" onEnter={save} />
      <div className="hint" style={{ marginBottom: 4 }}>
        Mindestens 8 Zeichen, mit Buchstaben und Zahl.
      </div>
      {touched && !requirementsOk ? <div className="login-error">Passwort erfüllt die Anforderungen noch nicht.</div> : null}
      {touched && requirementsOk && !matchOk ? <div className="login-error">Die Passwörter stimmen nicht überein.</div> : null}
      <button
        className="btn btn-accent"
        style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14, marginTop: 8 }}
        onClick={save}
      >
        <Icon name="check" /> Passwort speichern
      </button>
    </>
  );
}

export function LoginPage() {
  const { state } = useApp();
  const view = state.authView;

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <img src="/planico-logo.svg" alt="Planico" className="login-logo" />
        </div>
        {view === 'login' ? <LoginForm /> : view === 'forgot' ? <ForgotPasswordForm /> : <ResetPasswordForm />}
      </div>
    </div>
  );
}
