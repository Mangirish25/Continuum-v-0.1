import React, { useState } from 'react';
import { Lock, Mail, User, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { loginAdministrator, registerAdministrator } from '../../lib/api';

interface SignInScreenProps {
  onSignInSuccess: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSignInSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await loginAdministrator(email.trim(), password);
      onSignInSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials or authentication failure.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Password and confirm password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerAdministrator({
        name: name.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        invite_code: inviteCode.trim() || undefined,
      });

      setSuccessMsg(
        res?.message || 'Administrator registration successful! You may now sign in.'
      );
      // Switch back to sign in mode after successful registration
      setIsRegisterMode(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-[#faf8ff]">
      <div className="w-full max-w-md space-y-8">
        {/* Brand & Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded bg-[#3525cd] flex items-center justify-center text-white shadow-xs">
            <span className="font-mono font-bold text-lg tracking-tight">CT</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#131b2e]">
            Continuum
          </h1>
          <p className="text-xs font-medium text-slate-600">
            Enterprise Knowledge Continuity Platform
          </p>
          <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
            {isRegisterMode ? 'Administrator Registration' : 'Administrator Portal'}
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-xs overflow-hidden">
          <div className="p-6 sm:p-8 space-y-5">
            {/* Error & Success Alerts */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {!isRegisterMode ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@continuum.io"
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotSent(true)}
                      className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                {forgotSent && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-800">
                    If this account exists, password recovery instructions have been dispatched.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="font-mono text-xs animate-pulse">
                      Authenticating with Supabase...
                    </span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* Option to Register as Administrator */}
                <div className="pt-3 text-center border-t border-slate-100">
                  <p className="text-xs text-slate-600">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      Register as administrator
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              /* REGISTRATION FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Password (min. 6 characters)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Invitation Code <span className="text-slate-400 font-normal">(if restricted deployment)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Optional for dev (e.g. CONTINUUM-ADMIN-INVITE-2026)"
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="font-mono text-xs animate-pulse">
                      Registering Administrator Account...
                    </span>
                  ) : (
                    <>
                      <span>Register as Administrator</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="pt-3 text-center border-t border-slate-100">
                  <p className="text-xs text-slate-600">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(false);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      Return to sign in
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>

          <div className="bg-[#f8fafc] px-6 py-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Admin-Only Enterprise System (Supabase Auth)</span>
            </span>
            <span className="font-mono text-slate-400">Continuum</span>
          </div>
        </div>
      </div>
    </div>
  );
};
