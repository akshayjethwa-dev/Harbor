import React, { useState } from 'react';
import { User, Phone, MapPin, Edit3, LogOut, ChevronRight, Sparkles } from 'lucide-react';
import { AppStore } from '../../services/store';
import { ProfileSetupView } from './ProfileSetupView';

interface ProfileViewProps {
  onSignOut: () => void;
}

export function ProfileView({ onSignOut }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const currentUser = AppStore.getUser();

  if (!currentUser) return null;

  if (isEditing) {
    return (
      <div className="pb-24">
        <div className="px-6 pt-4">
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs text-[#FF6B35] hover:underline mb-2"
          >
            ← Cancel editing
          </button>
        </div>
        <ProfileSetupView
          isEditing
          onComplete={() => {
            setIsEditing(false);
          }}
        />
      </div>
    );
  }

  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out?')) {
      AppStore.signOut();
      onSignOut();
    }
  };

  return (
    <div className="flex flex-col flex-1 px-5 pt-8 pb-24 max-w-lg mx-auto w-full">
      {/* User Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-[#FF6B35] flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-[#FF6B35]/25 mb-4 select-none">
          {currentUser.photoUrl ? (
            <img
              src={currentUser.photoUrl}
              alt={currentUser.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            currentUser.name?.[0]?.toUpperCase() ?? 'D'
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">
          {currentUser.name || 'Garba Enthusiast'}
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-[#B0B0B0] font-mono mb-1">
          <Phone className="w-3.5 h-3.5 text-[#FF6B35]" />
          <span>{currentUser.phone}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#B0B0B0]">
          <MapPin className="w-3.5 h-3.5 text-[#FF6B35]" />
          <span>
            {currentUser.area ? `${currentUser.area}, ` : ''}
            {currentUser.city}
          </span>
        </div>

        {/* Details Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {currentUser.age && (
            <span className="text-xs bg-[#1A1A1A] border border-[#2A2A2A] text-[#B0B0B0] px-3 py-1 rounded-full">
              {currentUser.age} years old
            </span>
          )}
          {currentUser.gender && (
            <span className="text-xs bg-[#1A1A1A] border border-[#2A2A2A] text-[#B0B0B0] px-3 py-1 rounded-full capitalize">
              {currentUser.gender}
            </span>
          )}
        </div>

        {currentUser.bio && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3.5 mt-4 text-xs text-[#DDD] italic max-w-sm">
            "{currentUser.bio}"
          </div>
        )}
      </div>

      {/* Menu Actions */}
      <div className="space-y-3">
        <button
          onClick={() => setIsEditing(true)}
          className="w-full flex items-center gap-3 bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] rounded-2xl p-4 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[#252525] flex items-center justify-center text-[#FF6B35]">
            <Edit3 className="w-4 h-4" />
          </div>
          <span className="flex-1 text-left text-sm font-medium text-white">Edit Profile</span>
          <ChevronRight className="w-5 h-5 text-[#666]" />
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 bg-[#1A1A1A] hover:bg-red-500/10 border border-[#2A2A2A] hover:border-red-500/30 rounded-2xl p-4 transition-colors group mt-6"
        >
          <div className="w-9 h-9 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 flex items-center justify-center text-[#F44336]">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="flex-1 text-left text-sm font-medium text-[#F44336]">Sign Out</span>
        </button>
      </div>

      <div className="mt-auto pt-10 text-center">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-[#666]">
          <Sparkles className="w-3 h-3 text-[#FF6B35]" />
          <span>Kithra v1.0 • Navratri 2026 Edition</span>
        </div>
      </div>
    </div>
  );
}
