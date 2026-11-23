import { useState } from 'react';
import { signInWithCornellGoogle } from '../lib/supabase';
import './Login.css';

/** Reads an OAuth error (e.g. a rejected non-Cornell account) from the redirect URL, then cleans the URL. */
function takeOAuthError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const description = params.get('error_description') ?? hash.get('error_description');
  const code = params.get('error') ?? hash.get('error');
  if (!description && !code) return null;
  window.history.replaceState(null, '', window.location.pathname);
  return description ?? 'Sign-in failed. Please try again.';
}

export function Login() {
  const [error, setError] = useState<string | null>(takeOAuthError);
  const [pending, setPending] = useState(false);

  async function handleSignIn() {
    setPending(true);
    setError(null);
    const { error: signInError } = await signInWithCornellGoogle();
    if (signInError) {
      setError(signInError.message);
      setPending(false);
    }
    // On success the browser redirects to Google, so there's nothing else to do here.
  }

  return (
    <div className="login">
      <h1 className="login__title">Campus Events</h1>
      <p className="login__subtitle">Find low-key things to do around Cornell.</p>
      {error && <p className="login__error">{error}</p>}
      <button type="button" className="login__button" onClick={handleSignIn} disabled={pending}>
        {pending ? 'Redirecting…' : 'Sign in with Cornell Google'}
      </button>
      <p className="login__fine-print">Use your NetID@cornell.edu account.</p>
    </div>
  );
}

/** Full-screen message for loading, setup and error states. */
export function StatusScreen({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="login">
      <h1 className="login__title">{title}</h1>
      {message && <p className="login__subtitle">{message}</p>}
      {action && (
        <button type="button" className="login__button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
