
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function checkRecovery() {
      try {
        const hash = new URLSearchParams(
          window.location.hash.replace(/^#/, '')
        );

        const query = new URLSearchParams(
          window.location.search
        );

        const authError =
          hash.get('error_description') ||
          query.get('error_description');

        if (authError) {
          throw new Error(
            'Сілтеменің мерзімі өткен немесе ол жарамсыз. Жаңа хат сұратыңыз.'
          );
        }

        const tokenHash = query.get('token_hash');
        const type = query.get('type');

        if (tokenHash && type === 'recovery') {
          const { error: verifyError } =
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery',
            });

          if (verifyError) throw verifyError;
        } else {
          const accessToken = hash.get('access_token');
          const refreshToken = hash.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) throw sessionError;
          }
        }

        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!data.session) {
          throw new Error(
            'Құпия сөзді қалпына келтіру сессиясы табылмады.'
          );
        }

        if (active) {
          setReady(true);
          window.history.replaceState(
            null,
            '',
            '/reset-password'
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Сілтемені тексеру кезінде қате шықты.'
          );
        }
      }
    }

    void checkRecovery();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 12) {
      setError('Құпия сөз кемінде 12 таңбадан тұруы керек.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Құпия сөздер сәйкес келмейді.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Құпия сөзді өзгерту мүмкін болмады.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f6f9',
        padding: 20,
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#ffffff',
          borderRadius: 18,
          padding: 32,
          boxShadow: '0 12px 40px rgba(0,0,0,0.07)',
        }}
      >
        <div
          style={{
            color: '#008c95',
            fontWeight: 800,
            fontSize: 22,
            marginBottom: 10,
          }}
        >
          SafeSchool AI
        </div>

        <h1 style={{ fontSize: 25, marginBottom: 12 }}>
          Құпия сөзді жаңарту
        </h1>

        {success ? (
          <div>
            <p style={{ color: '#087f5b' }}>
              Құпия сөз сәтті өзгертілді!
            </p>
            <p>
              Енді әкімші панеліне жаңа құпия сөзбен
              кіруді баптаймыз.
            </p>
            <Link to="/">
              Басты бетке оралу
            </Link>
          </div>
        ) : !ready ? (
          <p>
            {error || 'Қалпына келтіру сілтемесі тексерілуде...'}
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label
              style={{ display: 'block', marginBottom: 16 }}
            >
              Жаңа құпия сөз
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 12,
                  marginTop: 7,
                  border: '1px solid #ccd8df',
                  borderRadius: 9,
                  boxSizing: 'border-box',
                }}
              />
            </label>

            <label
              style={{ display: 'block', marginBottom: 16 }}
            >
              Құпия сөзді қайталаңыз
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                autoComplete="new-password"
                minLength={12}
                required
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 12,
                  marginTop: 7,
                  border: '1px solid #ccd8df',
                  borderRadius: 9,
                  boxSizing: 'border-box',
                }}
              />
            </label>

            {error && (
              <p role="alert" style={{ color: '#c92a2a' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: 14,
                background: '#008c95',
                color: 'white',
                border: 0,
                borderRadius: 9,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              {loading
                ? 'Сақталуда...'
                : 'Құпия сөзді сақтау'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
