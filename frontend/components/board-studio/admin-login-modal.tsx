'use client';

import React, { useState } from 'react';
import { ShieldCheck, X, KeyRound, AlertCircle } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter the admin passcode.');
      return;
    }

    if (passcode.trim() === 'admin123' || passcode.trim() === 'admin') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('gjs_board_studio_admin_session', 'true');
      }
      setPasscode('');
      setError(null);
      onSuccess();
      onClose();
    } else {
      setError('Invalid passcode. Default is admin123.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3>Admin Access Portal</h3>
              <p>Login to design, configure & post railway name board templates.</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" style={{ padding: '20px 24px' }}>
          <div className="modal-input-group" style={{ marginBottom: 14 }}>
            <label htmlFor="admin-pass-input" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
              <KeyRound size={14} /> Admin Passcode
            </label>
            <input
              id="admin-pass-input"
              type="password"
              autoFocus
              placeholder="Enter administrator passcode (e.g. admin123)"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(null);
              }}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: '#12161a', color: '#fff', fontSize: 13 }}
            />
          </div>

          {error && (
            <div className="modal-error-message" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 12, marginBottom: 14 }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}>
              Authenticate as Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

