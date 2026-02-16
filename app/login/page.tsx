'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleAvailable, setGoogleAvailable] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    fetch('/api/auth/providers-info')
      .then((res) => res.json())
      .then((data) => setGoogleAvailable(data.google))
      .catch(() => setGoogleAvailable(false));
  }, []);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        OAuthAccountNotLinked: 'This email is already registered with a different method. Please sign in with email/password.',
        OAuthSignin: 'Could not start Google sign-in. Please try again.',
        OAuthCallback: 'Google sign-in was cancelled or failed. Please try again.',
        CredentialsSignin: 'Invalid email or password.',
        MissingCSRF: 'Session expired. Please try again.',
        Default: 'Something went wrong. Please try again.',
      };
      setError(errorMessages[errorParam] || errorMessages.Default);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError('Invalid email or password. Please try again.');
        } else if (result?.ok) {
          router.push('/');
          router.refresh();
        }
      } else {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to create account');
        } else {
          setSuccess('Account created! Signing you in...');
          const result = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false,
          });

          if (result?.error) {
            setError('Account created but auto-login failed. Please switch to Login and sign in.');
            setSuccess('');
          } else if (result?.ok) {
            router.push('/');
            router.refresh();
          }
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch {
      setError('Failed to start Google sign-in');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--surface)' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
            DermaIQ
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-lg border p-6 sm:p-8" style={{ borderColor: 'var(--border)' }}>
          {/* Toggle */}
          <div className="flex gap-2 mb-6 p-1 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
            <button
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
              className="flex-1 py-2 rounded-md font-medium text-sm transition-colors"
              style={{
                backgroundColor: isLogin ? 'var(--primary)' : 'transparent',
                color: isLogin ? 'white' : 'var(--text-secondary)',
              }}
            >
              Login
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
              className="flex-1 py-2 rounded-md font-medium text-sm transition-colors"
              style={{
                backgroundColor: !isLogin ? 'var(--primary)' : 'transparent',
                color: !isLogin ? 'white' : 'var(--text-secondary)',
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: '#FEF2F2', color: '#B85C50' }}>
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  placeholder="Your name"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder={isLogin ? 'Your password' : 'Min. 6 characters'}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="w-full py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {isLoading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
            </button>
          </form>

          {/* Google Sign In - only show if available */}
          {googleAvailable && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }}></div>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>OR</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }}></div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading || googleLoading}
                className="w-full py-3 rounded-lg font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                {googleLoading ? (
                  'Redirecting to Google...'
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </>
          )}

          {/* Skip login */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              Continue without account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
