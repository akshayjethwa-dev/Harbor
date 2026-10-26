import React, { useState, useEffect } from 'react';
import { Users, Camera, User, Sparkles } from 'lucide-react';
import { AppStore } from './services/store';
import { LoginView } from './components/web/LoginView';
import { OtpView } from './components/web/OtpView';
import { ProfileSetupView } from './components/web/ProfileSetupView';
import { CrewsView } from './components/web/CrewsView';
import { PhotographersView } from './components/web/PhotographersView';
import { ProfileView } from './components/web/ProfileView';

// Initialize store singleton
AppStore.init();

export default function App() {
  const [currentUser, setCurrentUser] = useState(AppStore.getUser());
  const [authStage, setAuthStage] = useState<'login' | 'otp' | 'profile-setup'>('login');
  const [pendingPhone, setPendingPhone] = useState('');
  const [activeTab, setActiveTab] = useState<'crews' | 'photographers' | 'profile'>('crews');
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    return AppStore.subscribe(() => {
      setCurrentUser(AppStore.getUser());
    });
  }, []);

  // ─────────────────────────────────────────────────────────
  // FIX #1: Auto-scroll the focused input into view when the
  // mobile keyboard appears. Handles every <input>, <textarea>,
  // <select> and contentEditable across the whole app without
  // touching individual screens.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName.toLowerCase();
      const isField =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        el.isContentEditable;
      if (!isField) return;

      // Delay so the keyboard has time to start animating in.
      // Without this the scroll target is computed against the
      // pre-keyboard viewport and lands in the wrong place.
      window.setTimeout(() => {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 300);
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // ─────────────────────────────────────────────────────────
  // FIX #2: Detect when the on-screen keyboard is open so we
  // can hide the bottom nav (otherwise it floats on top of /
  // just above the keyboard and hides the input).
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const check = () => {
      // Keyboard is considered open if the visual viewport is
      // more than 150px shorter than the window.
      setKeyboardOpen(window.innerHeight - vv.height > 150);
    };

    vv.addEventListener('resize', check);
    vv.addEventListener('scroll', check);
    check();

    return () => {
      vv.removeEventListener('resize', check);
      vv.removeEventListener('scroll', check);
    };
  }, []);

  // Determine view state
  const isAuthenticated = Boolean(currentUser && currentUser.profileComplete);

  if (!isAuthenticated) {
    if (currentUser && !currentUser.profileComplete) {
      return (
        <div className="min-h-[100dvh] bg-[#0D0D0D] flex justify-center">
          <div className="w-full max-w-md min-h-[100dvh] bg-[#0D0D0D] border-x border-[#1F1F1F] flex flex-col">
            <ProfileSetupView
              onComplete={() => {
                setActiveTab('crews');
              }}
            />
          </div>
        </div>
      );
    }

    if (authStage === 'otp') {
      return (
        <div className="min-h-[100dvh] bg-[#0D0D0D] flex justify-center">
          <div className="w-full max-w-md min-h-[100dvh] bg-[#0D0D0D] border-x border-[#1F1F1F] flex flex-col">
            <OtpView
              phone={pendingPhone}
              onBack={() => setAuthStage('login')}
              onVerified={() => {
                const user = AppStore.getUser();
                if (user?.profileComplete) {
                  setActiveTab('crews');
                } else {
                  setAuthStage('profile-setup');
                }
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[100dvh] bg-[#0D0D0D] flex justify-center">
        <div className="w-full max-w-md min-h-[100dvh] bg-[#0D0D0D] border-x border-[#1F1F1F] flex flex-col">
          <LoginView
            onContinue={(phone) => {
              setPendingPhone(phone);
              setAuthStage('otp');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505] flex justify-center font-sans antialiased">
      {/* Mobile Shell */}
      <div className="w-full max-w-md min-h-[100dvh] bg-[#0D0D0D] border-x border-[#1F1F1F] flex flex-col relative shadow-2xl">
        {/* Subtle Top Status / Brand Header */}
        <header className="sticky top-0 z-30 bg-[#0D0D0D]/90 backdrop-blur-md px-5 py-3 border-b border-[#1A1A1A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪔</span>
            <span className="text-lg font-extrabold text-[#FF6B35] tracking-tight">Kithra</span>
          </div>
          <div className="flex items-center gap-1 bg-[#1A1A1A] border border-[#2A2A2A] px-2.5 py-1 rounded-full text-[11px] text-[#B0B0B0]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{currentUser?.city || 'Gujarat'}</span>
          </div>
        </header>

        {/*
          FIX #3: Main content area
          - `flex-1 overflow-y-auto` so only this area scrolls
          - `scroll-pb-24` gives scrollIntoView 96px of breathing
            room at the bottom so a focused input is never pinned
            right at the bottom edge of the viewport.
          - `pb-24` reserves space so the fixed bottom nav never
            covers the last input / last card. Increase if your
            nav is taller.
        */}
        <main className="flex-1 flex flex-col overflow-y-auto scroll-pb-24 pb-24">
          {activeTab === 'crews' && <CrewsView />}
          {activeTab === 'photographers' && <PhotographersView />}
          {activeTab === 'profile' && (
            <ProfileView
              onSignOut={() => {
                setAuthStage('login');
              }}
            />
          )}
        </main>

        {/*
          FIX #4: Bottom nav
          - Hidden entirely while the keyboard is open (keyboardOpen).
          - Switched from `fixed` to `absolute bottom-0 left-0 right-0`
            so it is anchored to the shell (which is already `relative`),
            not the viewport. This keeps it perfectly aligned on desktop
            and stops it drifting when the mobile keyboard opens.
          - `pb-[env(safe-area-inset-bottom)]` respects the iPhone home
            indicator bar.
        */}
        {!keyboardOpen && (
          <nav
            className="absolute bottom-0 left-0 right-0 z-40 bg-[#1A1A1A] border-t border-[#2A2A2A] h-16 flex items-center justify-around px-2 shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <button
              onClick={() => setActiveTab('crews')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'crews' ? 'text-[#FF6B35]' : 'text-[#666666] hover:text-[#999]'
              }`}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] font-semibold tracking-tight">Crews</span>
            </button>

            <button
              onClick={() => setActiveTab('photographers')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'photographers' ? 'text-[#FF6B35]' : 'text-[#666666] hover:text-[#999]'
              }`}
            >
              <Camera className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] font-semibold tracking-tight">Photographers</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'profile' ? 'text-[#FF6B35]' : 'text-[#666666] hover:text-[#999]'
              }`}
            >
              <User className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] font-semibold tracking-tight">Profile</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}