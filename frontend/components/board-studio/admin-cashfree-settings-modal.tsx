'use client';

import React, { useState } from 'react';
import { CashfreeConfig, CashfreePaymentReceipt } from '@/lib/board-studio/types';
import {
  X,
  ShieldCheck,
  CheckCircle,
  Key,
  Globe,
  Save,
  Clock,
  ExternalLink,
  Layers,
  AlertTriangle
} from 'lucide-react';

interface AdminCashfreeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCashfreeSettingsModal: React.FC<AdminCashfreeSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [config, setConfig] = useState<CashfreeConfig>(() => {
    if (typeof window === 'undefined') {
      return { appId: '', environment: 'sandbox', isEnabled: true, apiVersion: '2023-08-01' };
    }
    const saved = localStorage.getItem('gjs_cashfree_config');
    return saved ? JSON.parse(saved) : { appId: '', environment: 'sandbox', isEnabled: true, apiVersion: '2023-08-01' };
  });

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('gjs_cashfree_config', JSON.stringify(config));
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" style={{ background: 'linear-gradient(135deg, #ef3b2d 0%, #ff8a1f 100%)', boxShadow: '0 0 20px rgba(239, 59, 45, 0.4)' }}>
              <Key size={18} color="#fff" />
            </div>
            <div>
              <h3>Cashfree Payments Gateway</h3>
              <p>Configure Cashfree gateway for digital simulator template sales.</p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {saveSuccess && (
          <div className="auth-alert-msg success" style={{ margin: '14px 20px 0 20px' }}>
            <CheckCircle size={14} />
            <span>Cashfree settings saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Gateway Environment</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#fff', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="env"
                  value="sandbox"
                  checked={config.environment === 'sandbox'}
                  onChange={() => setConfig({ ...config, environment: 'sandbox' })}
                />
                <span>Sandbox / Test</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#fff', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="env"
                  value="production"
                  checked={config.environment === 'production'}
                  onChange={() => setConfig({ ...config, environment: 'production' })}
                />
                <span>Production / Live</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Cashfree App ID (Client ID)</label>
            <input
              type="text"
              placeholder="e.g. CF_APP_12345..."
              value={config.appId}
              onChange={(e) => setConfig({ ...config, appId: e.target.value })}
              className="input-text"
              style={{ padding: '8px 12px', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Secret Key (Optional - server managed)</label>
            <input
              type="password"
              placeholder="••••••••••••••••••••••••••••••"
              value={config.secretKey || ''}
              onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
              className="input-text"
              style={{ padding: '8px 12px', fontSize: 13 }}
            />
            <small style={{ fontSize: 11, color: '#64748b' }}>
              Note: Cashfree orders are securely signed and verified via the Django store backend.
            </small>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <input
              type="checkbox"
              id="cf-enable"
              checked={config.isEnabled}
              onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
            />
            <label htmlFor="cf-enable" style={{ fontSize: 13, color: '#fff', cursor: 'pointer' }}>
              Enable Cashfree payments for paid template unlocks
            </label>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '7px 14px', fontSize: 12 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '7px 16px', fontSize: 12 }}>
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

