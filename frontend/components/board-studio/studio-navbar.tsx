'use client';

import React from 'react';
import Link from 'next/link';
import { CurrentUser } from '@/lib/api';
import { ShieldCheck, UserCheck, LogOut, Train, HelpCircle, Store, BookmarkPlus, ArrowLeft } from 'lucide-react';

interface StudioNavbarProps {
  currentView: 'home' | 'editor' | 'admin';
  activeStoreTab?: 'store' | 'my-store';
  savedBoardsCount?: number;
  isAdmin: boolean;
  currentUser: CurrentUser | null;
  onNavigateHome: () => void;
  onNavigateStore?: (tab: 'store' | 'my-store') => void;
  onOpenHelp: () => void;
  onToggleAdmin: () => void;
}

export const StudioNavbar: React.FC<StudioNavbarProps> = ({
  currentView,
  activeStoreTab = 'store',
  savedBoardsCount = 0,
  isAdmin,
  currentUser,
  onNavigateHome,
  onNavigateStore,
  onOpenHelp,
  onToggleAdmin
}) => {
  const handleGoStore = (tab: 'store' | 'my-store') => {
    if (onNavigateStore) {
      onNavigateStore(tab);
    } else {
      onNavigateHome();
    }
  };

  return (
    <header className="main-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link
          href="/"
          className="btn-nav-icon"
          title="Back to MSTS-GJS Store"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textDecoration: 'none' }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="navbar-brand" onClick={() => handleGoStore('store')} style={{ cursor: 'pointer' }} title="Go to Template Store">
          <div className="brand-logo-icon">
            <Train size={20} />
          </div>
          <div className="brand-titles">
            <h1>GJS Railway Board Studio</h1>
            <span className="online-tag">Online Edition</span>
          </div>
        </div>
      </div>

      <div className="navbar-controls">
        {/* Easy Access: Template Store & My Store buttons */}
        {!isAdmin && (
          <div className="nav-store-group">
            <button
              type="button"
              className={`btn-nav-switch ${currentView === 'home' && activeStoreTab === 'store' ? 'active-home' : ''}`}
              onClick={() => handleGoStore('store')}
              title="Browse All Name Boards & Simulator Textures"
            >
              <Store size={14} /> Template Store
            </button>
            <button
              type="button"
              className={`btn-nav-switch ${currentView === 'home' && activeStoreTab === 'my-store' ? 'active-home' : ''}`}
              onClick={() => handleGoStore('my-store')}
              title="Access your saved creations in My Store"
            >
              <BookmarkPlus size={14} /> My Store {savedBoardsCount > 0 && <span className="nav-store-badge">{savedBoardsCount}</span>}
            </button>
          </div>
        )}

        {/* Role status pill */}
        <div className={`role-indicator ${isAdmin ? 'admin' : 'user'}`}>
          {isAdmin ? (
            <>
              <ShieldCheck size={14} />
              <span>Admin Mode (Template Creator)</span>
            </>
          ) : (
            <>
              <UserCheck size={14} />
              <span>User Mode (Locked UV Content)</span>
            </>
          )}
        </div>

        {/* Help button */}
        <button
          type="button"
          className="btn-nav-icon"
          onClick={onOpenHelp}
          title="How it works (Admin vs User guide)"
        >
          <HelpCircle size={16} />
        </button>

        {/* Railway User Profile or Sign In / Register */}
        {currentUser ? (
          <div className="nav-user-profile" title={`Signed in as ${currentUser.username || currentUser.email} · ID: USR-${currentUser.id}`}>
            <div className="user-avatar-circle" style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, borderWidth: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00b4d8, #0077b6)', color: '#fff', fontWeight: 700, borderRadius: '50%' }}>
              <span>{(currentUser.username || 'U').charAt(0).toUpperCase()}</span>
            </div>
            <div className="nav-user-info">
              <span className="nav-user-name">{currentUser.username}</span>
              <span className="nav-user-id-badge" title="Unique Store User ID">USR-{currentUser.id}</span>
            </div>
          </div>
        ) : (
          <Link
            href="/login?redirect=/board-studio"
            className="btn-nav-google-login"
            style={{ textDecoration: 'none' }}
            title="Sign in or Create Account to keep your unlocked templates safe"
          >
            <span>Sign In / Register</span>
          </Link>
        )}

        {/* Admin Login / Logout Switcher */}
        {isAdmin ? (
          <button
            type="button"
            className="btn-nav-switch admin-active"
            onClick={onToggleAdmin}
            title="Switch back to standard User content mode"
          >
            <LogOut size={14} /> Switch to User View
          </button>
        ) : (
          <button
            type="button"
            className="btn-nav-switch"
            onClick={onToggleAdmin}
            title="Access Admin Template Studio"
          >
            <ShieldCheck size={14} /> Admin Studio
          </button>
        )}
      </div>
    </header>
  );
};

