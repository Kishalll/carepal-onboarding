import React, { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { HeartHandshake, Shield, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';
import { Button, Input } from '@carepal/ui';
import { useAuth } from '../../context/AuthContext.js';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect to home or intended location
  if (user) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  const handleFillDemo = () => {
    setEmail('admin@thecarepal.test');
    setPassword('test!123');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result.error || 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-sand flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-ink text-brand-teal flex items-center justify-center shadow-md">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl tracking-tight text-brand-heading">
              TheCarePal
            </div>
            <div className="text-xs font-semibold text-brand-action tracking-wide uppercase">
              Operations CRM
            </div>
          </div>
        </div>

        <h2 className="text-center text-xl sm:text-2xl font-heading font-bold text-brand-heading">
          Staff Portal Sign In
        </h2>
        <p className="mt-1.5 text-center text-sm text-gray-500">
          Secure access for care operations, screening, and verification teams.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-sm border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <Input
                label="Staff Email"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@thecarepal.test"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Input
                label="Password"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center text-base py-3 font-semibold shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-brand-teal" /> Demo Credentials
                </span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-brand-action hover:text-brand-actionHover font-medium hover:underline text-[11px]"
                >
                  Click to Auto-fill
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-600 space-y-0.5">
                <div>Email: <span className="font-semibold text-slate-800">admin@thecarepal.test</span></div>
                <div>Pass: <span className="font-semibold text-slate-800">test!123</span></div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5 text-gray-400" />
            <span>Protected by CarePal session security</span>
          </div>
        </div>
      </div>
    </div>
  );
};
