import React, { useState } from 'react';
import { AppStore } from '../../services/store';

interface LoginViewProps {
  onContinue: (phone: string) => void;
}

export function LoginView({ onContinue }: LoginViewProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onContinue(cleanPhone);
    }, 300);
  };

  const handleQuickDemoLogin = () => {
    AppStore.loginAsDemo();
  };

  return (
    <div className="flex flex-col justify-center min-h-screen px-6 py-8 bg-[#0D0D0D]">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF6B35]/15 border border-[#FF6B35]/30 mb-4">
          <span className="text-3xl">🪔</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#FF6B35] tracking-tight">Kithra</h1>
        <p className="text-[#B0B0B0] text-sm mt-1">Gujarat's Navratri Crew & Dancers Network</p>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Enter your phone number</h2>
        <p className="text-sm text-[#B0B0B0] mb-6">We'll send a 6-digit verification code</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="flex items-center bg-[#252525] border border-[#2A2A2A] rounded-xl px-4 py-3.5 focus-within:border-[#FF6B35] transition-colors">
            <span className="text-white font-medium mr-3 select-none">+91</span>
            <input
              type="tel"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, ''));
                if (error) setError(null);
              }}
              className="w-full bg-transparent text-white placeholder-[#666] outline-none text-base font-mono tracking-wide"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || phone.length !== 10}
            className="w-full h-14 bg-[#FF6B35] hover:bg-[#ff7b4b] disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center transition-all shadow-lg shadow-[#FF6B35]/25"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2A2A2A]"></div>
          </div>
          <span className="relative bg-[#1A1A1A] px-3 text-xs text-[#666]">OR TEST INSTANTLY</span>
        </div>

        <button
          type="button"
          onClick={handleQuickDemoLogin}
          className="w-full py-3 px-4 rounded-xl border border-[#2A2A2A] hover:border-[#FF6B35]/50 bg-[#252525]/60 hover:bg-[#252525] text-sm text-[#FF6B35] font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span>⚡</span>
          <span>Quick Demo Login (Aarav Patel)</span>
        </button>
      </div>

      <p className="text-xs text-[#666] text-center max-w-xs mx-auto">
        By continuing, you agree to Kithra's Terms of Service & Privacy Policy
      </p>
    </div>
  );
}
