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

  useEffect(() => {
    return AppStore.subscribe(() => {
      setCurrentUser(AppStore.getUser());
    });
  }, []);

  // Determine view state
  const isAuthenticated = Boolean(currentUser && currentUser.profileComplete);

  if (!isAuthenticated) {
    if (currentUser && !currentUser.profileComplete) {
      return (
        <div className="min-h-screen bg-[#0D0D0D] flex justify-center">
          <div className="w-full max-w-md min-h-screen bg-[#0D0D0D] border-x border-[#1F1F1F] flex flex-col">
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
        <div className="min-h-screen bg-[#0D0D0D] flex justify-center">
          <div className="w-full max-w-md min-h-screen bg-[#0D0D0D] border-x border-[#1F1F1F] flex flex-col">
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
      <div className="min-h-screen bg-[#0D0D0D] flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-[#0D0D0D] border-x border-[#1F1F1F] flex flex-col">
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
    <div className="min-h-screen bg-[#050505] flex justify-center font-sans antialiased">
      {/* Mobile Shell */}
      <div className="w-full max-w-md min-h-screen bg-[#0D0D0D] border-x border-[#1F1F1F] flex flex-col relative shadow-2xl">
        {/* Subtle Top Status / Brand Header */}
        <header className="sticky top-0 z-30 bg-[#0D0D0D]/90 backdrop-blur-md px-5 py-3 border-b border-[#1A1A1A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪔</span>
            <span className="text-lg font-extrabold text-[#FF6B35] tracking-tight">Kithra</span>
          </div>
          <div className="flex items-center gap-1 bg-[#1A1A1A] border border-[#2A2A2A] px-2.5 py-1 rounded-full text-[11px] text-[#B0B0B0]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{currentUser?.city || 'Gujarat'}</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto">
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

        {/* Bottom Tab Navigation Bar */}
        <nav className="fixed bottom-0 max-w-md w-full z-40 bg-[#1A1A1A] border-t border-[#2A2A2A] h-16 flex items-center justify-around px-2 shadow-2xl">
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
      </div>
    </div>
  );
}
