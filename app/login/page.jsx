'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '../../components/ui/Card';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { useSession } from '../../components/SessionProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useSession();

  const [values, setValues] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  function update(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError('');
  }

  function validate() {
    const next = {};
    const identifier = values.identifier.trim();
    if (identifier.length < 3) {
      next.identifier = 'Enter your username or email address.';
    }
    if (values.password.length < 8) {
      next.password = 'Passwords are at least 8 characters.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setFormError('');
    if (!validate()) return;

    setPending(true);
    try {
      await login(values.identifier.trim(), values.password);
      router.push('/play');
    } catch (err) {
      const message =
        err && err.message
          ? err.message
          : 'We could not sign you in. Check your details and try again.';
      setFormError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-page">
      <Card
        title="Sign in to the paddock"
        subtitle="Save your scores, unlock characters and climb the Monaco leaderboard."
      >
        <form className="form" onSubmit={handleSubmit} noValidate>
          <Field
            id="login-identifier"
            label="Username or email"
            type="text"
            value={values.identifier}
            onChange={(event) => update('identifier', event.target.value)}
            placeholder="paddock_pete"
            error={errors.identifier}
            required
            autoComplete="username"
          />

          <Field
            id="login-password"
            label="Password"
            type="password"
            value={values.password}
            onChange={(event) => update('password', event.target.value)}
            placeholder="Your password"
            error={errors.password}
            hint="Minimum 8 characters."
            required
            autoComplete="current-password"
          />

          {formError ? (
            <p className="form__error user-text" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="form__actions">
            <Button type="submit" variant="primary" size="lg" loading={pending} disabled={pending}>
              {pending ? 'Signing in' : 'Sign in'}
            </Button>
            <Button as="a" href="/play" variant="ghost" size="lg">
              Race as guest
            </Button>
          </div>
        </form>

        <p className="form__footnote">
          New to the circuit? <Link href="/signup">Create an account</Link> and grab your first
          crate of bananas.
        </p>

        {status === 'authenticated' ? (
          <p className="form__footnote">
            You are already signed in. <Link href="/play">Head to the grid</Link>.
          </p>
        ) : null}
      </Card>
    </section>
  );
}