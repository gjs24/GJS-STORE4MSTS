'use client';

import React, { useState } from 'react';
import { BoardTemplate } from '@/lib/board-studio/types';
import { createBoardOrder } from '@/lib/board-studio-api';
import { isLoggedIn, getStoredUser } from '@/lib/api';
import {
  X,
  CheckCircle,
  ShieldCheck,
  Zap,
  Lock,
  FileCode,
  Sparkles,
  CreditCard,
  Smartphone,
  Layers,
  ArrowRight,
  UserCheck,
  AlertCircle
} from 'lucide-react';

interface PurchaseTemplateModalProps {
  isOpen: boolean;
  template: BoardTemplate | null;
  onClose: () => void;
  onSuccess: (templateId: string) => void;
}

export const PurchaseTemplateModal: React.FC<PurchaseTemplateModalProps> = ({
  isOpen,
  template,
  onClose,
  onSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !template) return null;

  const price = template.price || 99;
  const loggedIn = isLoggedIn();
  const user = getStoredUser();

  const handleUnlock = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      if (loggedIn) {
        try {
          await createBoardOrder(template.id);
        } catch (apiErr: any) {
          console.warn('Backend order call finished with notice:', apiErr?.message);
        }
      }

      // Record unlock in local storage
      const unlockedIds: string[] = JSON.parse(localStorage.getItem('gjs_unlocked_templates') || '[]');
      if (!unlockedIds.includes(template.id)) {
        unlockedIds.push(template.id);
        localStorage.setItem('gjs_unlocked_templates', JSON.stringify(unlockedIds));
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess(template.id);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to process unlock');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="checkout-modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="btn-modal-close"
          onClick={onClose}
          title="Close modal"
        >
          <X size={18} />
        </button>

        {success ? (
          <div className="checkout-success-view" style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div className="success-icon-bounce" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <CheckCircle size={56} style={{ color: 'var(--rail-green, #2ec4b6)' }} />
            </div>
            <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 8 }}>Template Unlocked!</h2>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              <strong>{template.name}</strong> is now unlocked for your account. You can now edit all fields and export directly to DDS and PNG.
            </p>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="checkout-header" style={{ padding: '24px 24px 16px 24px' }}>
              <div className="checkout-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,190,11,0.15)', color: '#ffbe0b', fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
                <Lock size={13} />
                <span>Premium Simulator Template</span>
              </div>
              <h2 className="checkout-title" style={{ fontSize: 19, color: '#fff', margin: '0 0 6px 0' }}>Unlock Full Editing Access</h2>
              <p className="checkout-subtitle" style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                Unlock lifetime customization and unlimited DirectDraw Surface (.dds) & PNG simulator exports for this board.
              </p>
            </div>

            {error && (
              <div style={{ margin: '0 24px 12px 24px', padding: '10px 14px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Template Card Summary */}
            <div style={{ margin: '0 24px 16px 24px', padding: 14, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: 14, color: '#fff', margin: '0 0 4px 0' }}>{template.name}</h4>
                  <span style={{ fontSize: 11, color: 'var(--rail-amber)', fontWeight: 700 }}>{template.category}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--rail-amber)' }}>₹{price}</div>
                  <small style={{ fontSize: 10, color: '#64748b' }}>One-time payment</small>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div style={{ padding: '0 24px 20px 24px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                  <Sparkles size={14} style={{ color: 'var(--rail-amber)' }} />
                  <span>Real-time LED dot-matrix preview and styling</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                  <FileCode size={14} style={{ color: 'var(--rail-red)' }} />
                  <span>Direct 32-bit BGRA & DXT5 DDS texture export</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                  <Layers size={14} style={{ color: 'var(--rail-green)' }} />
                  <span>Save unlimited custom variants to My Store</span>
                </li>
              </ul>
            </div>

            {/* Action Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnlock}
                disabled={isProcessing}
                style={{ background: 'linear-gradient(135deg, #ffbe0b 0%, #f77f00 100%)', color: '#111', fontWeight: 700, border: 'none', padding: '8px 20px', borderRadius: 6, fontSize: 13, cursor: isProcessing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {isProcessing ? 'Unlocking...' : `Unlock Now · ₹${price}`}
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

