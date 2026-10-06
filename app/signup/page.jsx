'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '../../components/ui/Card';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { useSession } from '../../components/SessionProvider';

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useSession();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
    if (formError) setFormError('');
  }

  function validate(values) {
    const next = {};

    if (!values.username.trim()) {
      next.username = 'Pick a driver name.';
    } else if (!USERNAME_PATTERN.test(values.username.trim())) {
      next.username = 'Use 3–24 letters, numbers or underscores.';
    }

    if (!values.email.trim()) {
      next.email = 'We need an email for your race licence.';
    } else if (!EMAIL_PATTERN.test(values.email.trim())) {
      next.email = 'That email address does not look right.';
    }

    if (!values.password) {
      next.password = 'Choose a password.';
    } else if (values.password.length < 8) {
      next.password = 'Passwords need at least 8 characters.';
    }

    if (!values.confirmPassword) {
      next.confirmPassword = 'Repeat your password.';
    } else if (values.confirmPassword !== values.password) {
      next.confirmPassword = 'The two passwords do not match.';
    }

    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;

    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setFormError('Check the highlighted fields and try again.');
      return;
    }

    setPending(true);
    setFormError('');

    try {
      await signup({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      router.push('/garage');
    } catch (err) {
      const message =
        err && err.message
          ? err.message
          : 'We could not create your account. Please try again.';
      setFormError(message);

      if (/username/i.test(message)) {
        setErrors((prev) => ({ ...prev, username: 'That driver name is taken.' }));
      } else if (/email/i.test(message)) {
        setErrors((prev) => ({ ...prev, email: 'That email is already registered.' }));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <h1>Get your race licence</h1>
        <p>
          Create a free paddock account to save your Monaco scores, bank the bananas and
          pineapples you collect, and unlock the full roster of zany drivers.
        </p>
      </div>

      <Card
        title="Sign up"
        subtitle="It takes about twenty seconds — roughly one lap of the tunnel."
        className="auth-card"
      >
        <form className="form" onSubmit={handleSubmit} noValidate>
          <Field
            id="signup-username"
            label="Driver name"
            type="text"
            value={form.username}
            onChange={(event) => update('username', event.target.value)}
            placeholder="paddock_pete"
            hint="3–24 letters, numbers or underscores. Shown on the leaderboard."
            error={errors.username}
            required
            autoComplete="username"
          />

          <Field
            id="signup-email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="pete@monaco-paddock.mc"
            error={errors.email}
            required
            autoComplete="email"
          />

          <Field
            id="signup-password"
            label="Password"
            type="password"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            placeholder="At least 8 characters"
            error={errors.password}
            required
            autoComplete="new-password"
          />

          <Field
            id="signup-confirm-password"
            label="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={(event) => update('confirmPassword', event.target.value)}
            placeholder="Type it once more"
            error={errors.confirmPassword}
            required
            autoComplete="new-password"
          />

          {formError ? (
            <p className="form__error user-text" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="form__actions">
            <Button type="submit" variant="primary" size="lg" loading={pending}>
              {pending ? 'Creating account' : 'Create account'}
            </Button>
          </div>
        </form>

        <p className="form__footnote">
          Already have a licence? <Link href="/login">Sign in instead</Link>.
        </p>
      </Card>
    </section>
  );
}