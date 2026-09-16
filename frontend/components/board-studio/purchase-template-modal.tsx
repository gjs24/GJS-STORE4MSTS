'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { load } from '@cashfreepayments/cashfree-js';
import { BoardTemplate } from '@/lib/board-studio/types';
import { createBoardTemplateOrder, verifyPayment, type StoreOrder } from '@/lib/store-api';
import { isLoggedIn, getStoredUser } from '@/lib/api';
import {
  X,
  CheckCircle,
  ShieldCheck,
  Lock,
  FileCode,
  Sparkles,
  Layers,
  ArrowRight,
  AlertCircle,
  QrCode,
  CheckCircle2,
  LogIn
} from 'lucide-react';

interface PurchaseTemplateModalProps {
  isOpen: boolean;
  template: BoardTemplate | null;
  onClose: () => void;
  onSuccess: (templateId: string) => void;
}

function qrCodeUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}

const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production' ? 'production' : 'sandbox';

export const PurchaseTemplateModal: React.FC<PurchaseTemplateModalProps> = ({
  isOpen,
  template,
  onClose,
  onSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [utr, setUtr] = useState('');
  const [payerName, setPayerName] = useState('');
  const [manualSubmitted, setManualSubmitted] = useState(false);
  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const u = getStoredUser();
      return u?.phone_number || localStorage.getItem('gjs_customer_phone') || '';
    }
    return '';
  });

  if (!isOpen || !template) return null;

  const price = template.price || 99;
  const loggedIn = isLoggedIn();
  const user = getStoredUser();

  const handleStartPurchase = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!loggedIn) {
        setError('Please log in with your MSTS Store account to complete this purchase.');
        setIsProcessing(false);
        return;
      }

      const cleanedPhone = customerPhone.replace(/\D/g, '');
      if (cleanedPhone.length > 0 && cleanedPhone.length !== 10) {
        setError('Please enter a valid 10-digit mobile number for Cashfree checkout.');
        setIsProcessing(false);
        return;
      }
      if (cleanedPhone.length === 10) {
        localStorage.setItem('gjs_customer_phone', cleanedPhone);
      }

      const nextOrder = await createBoardTemplateOrder(template.id, cleanedPhone || undefined);
      setOrder(nextOrder);

      // If already approved / free / unlocked
      if (nextOrder.download_enabled || nextOrder.status === 'APPROVED' || nextOrder.status === 'PAID') {
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
        return;
      }

      // Cashfree checkout
      if (nextOrder.status === 'PENDING' && nextOrder.payment_session_id) {
        const cashfree = await load({ mode: cashfreeMode });
        const result = await cashfree.checkout({
          paymentSessionId: nextOrder.payment_session_id,
          redirectTarget: '_self'
        });
        if (result?.error) {
          throw new Error(result.error.message || 'Cashfree checkout could not be initiated.');
        }
        return;
      }

      // If manual UPI payment is returned, modal stays open showing QR and UTR form
      if (nextOrder.status === 'PENDING' && nextOrder.manual_payment) {
        setIsProcessing(false);
        return;
      }

      if (nextOrder.status === 'VERIFICATION_PENDING') {
        setManualSubmitted(true);
        setIsProcessing(false);
        return;
      }

      throw new Error('Payment gateway could not be initiated. Please contact admin support.');
    } catch (err: any) {
      setError(err?.message || 'Failed to process template purchase.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!utr.trim()) {
      setError('Please enter the 12-digit UTR / UPI Transaction reference ID.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const updated = await verifyPayment(order.id, {
        utr: utr.trim(),
        payer_name: payerName.trim()
      });
      setOrder(updated);
      setManualSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit payment verification.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="checkout-modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="btn-modal-close"
          onClick={onClose}
          title="Close modal"
        >
          <X size={18} />
        </button>

        {success ? (
          <div className="checkout-success-view" style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div className="success-icon-bounce" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <CheckCircle size={56} style={{ color: '#34d399' }} />
            </div>
            <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 8 }}>Template Unlocked!</h2>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              <strong>{template.name}</strong> is now unlocked in your MSTS Store account. You can now edit all fields and export directly to DDS and PNG.
            </p>
          </div>
        ) : manualSubmitted ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <CheckCircle2 size={56} style={{ color: '#ff8a1f' }} />
            </div>
            <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 8 }}>Payment Submitted for Verification</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.5 }}>
              Your UTR (<code>{utr}</code>) has been submitted for Order #{order?.id || ''}. Our depot administrators will verify your payment and activate your board access shortly.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <Link
                href="/dashboard/purchases"
                className="btn-nav-switch active-home"
                style={{ textDecoration: 'none', padding: '8px 16px' }}
              >
                Track in My Purchases
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="btn-nav-switch"
                style={{ padding: '8px 16px' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : order?.manual_payment ? (
          /* Manual UPI Payment Screen */
          <div style={{ padding: '24px' }}>
            <div className="checkout-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,138,31,0.15)', color: '#ff8a1f', fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
              <QrCode size={13} />
              <span>UPI Payment · Order #{order.id}</span>
            </div>
            <h3 style={{ fontSize: 18, color: '#fff', margin: '0 0 6px 0' }}>Scan QR to Pay ₹{order.amount}</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px 0' }}>
              Scan with any UPI app (GPay, PhonePe, Paytm), complete the payment, and paste your UTR transaction ID below.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16, background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl(order.manual_payment.upi_uri)}
                alt="UPI Payment QR Code"
                style={{ width: 180, height: 180, borderRadius: 8, background: '#fff', padding: 8 }}
              />
              <p style={{ margin: '10px 0 2px 0', fontSize: 12, color: '#fff', fontWeight: 700 }}>{order.manual_payment.payee_name}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#ff8a1f', fontFamily: 'monospace' }}>UPI ID: {order.manual_payment.upi_id}</p>
            </div>

            <form onSubmit={handleUtrSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Payer Name (optional)</label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Your Name on UPI app"
                  style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>12-Digit UTR / Transaction ID *</label>
                <input
                  type="text"
                  required
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="e.g. 423456789012"
                  style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                />
              </div>

              {error && (
                <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 12 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  style={{ flex: 2, background: 'linear-gradient(135deg, #ef3b2d 0%, #ff8a1f 100%)', color: '#fff', fontWeight: 700, border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: isProcessing ? 'wait' : 'pointer' }}
                >
                  {isProcessing ? 'Verifying...' : 'Submit UTR for Verification'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Initial Checkout Screen */
          <>
            {/* Modal Header */}
            <div className="checkout-header" style={{ padding: '24px 24px 16px 24px' }}>
              <div className="checkout-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,138,31,0.15)', color: '#ff8a1f', fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
                <Lock size={13} />
                <span>MSTS Production Store · Premium Template</span>
              </div>
              <h2 className="checkout-title" style={{ fontSize: 19, color: '#fff', margin: '0 0 6px 0' }}>Unlock Full Editing Access</h2>
              <p className="checkout-subtitle" style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                Unlock lifetime customization, official GST invoice, and unlimited DirectDraw Surface (.dds) & PNG exports.
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
                  <span style={{ fontSize: 11, color: '#ff8a1f', fontWeight: 700 }}>{template.category}</span>
                  {user && (
                    <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                      Purchasing for: <strong style={{ color: '#fff' }}>{user.username}</strong> ({user.email || `USR-${user.id}`})
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#ff8a1f' }}>₹{price}</div>
                  <small style={{ fontSize: 10, color: '#64748b' }}>One-time store purchase</small>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div style={{ padding: '0 24px 20px 24px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                  <Sparkles size={14} style={{ color: '#ff8a1f' }} />
                  <span>Real-time LED dot-matrix preview and interactive slot editing</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                  <FileCode size={14} style={{ color: '#ef3b2d' }} />
                  <span>Direct 32-bit BGRA & DXT5 DDS simulator texture export</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                  <Layers size={14} style={{ color: '#34d399' }} />
                  <span>Permanent link in MSTS Store My Purchases with GST invoice</span>
                </li>
              </ul>
            </div>

            {/* Mobile Number for Cashfree / Invoice */}
            {loggedIn && (
              <div style={{ margin: '0 24px 16px 24px' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', marginBottom: 4 }}>
                  📱 Your 10-Digit Mobile Number (Required for Cashfree Gateway & SMS Receipt):
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, fontSize: 12, color: '#94a3b8' }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter your 10-digit number (e.g. 9876543210)"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 13,
                      letterSpacing: '1px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <small style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                  Cashfree will send the payment OTP and receipt directly to your mobile number.
                </small>
              </div>
            )}

            {/* Action Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>

              {loggedIn ? (
                <button
                  type="button"
                  onClick={handleStartPurchase}
                  disabled={isProcessing}
                  style={{ background: 'linear-gradient(135deg, #ef3b2d 0%, #ff8a1f 100%)', color: '#fff', fontWeight: 700, border: 'none', padding: '8px 20px', borderRadius: 6, fontSize: 13, cursor: isProcessing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 0 20px rgba(239, 59, 45, 0.4)' }}
                >
                  {isProcessing ? 'Processing...' : `Pay ₹${price} via Store Gateway`}
                  <ArrowRight size={14} />
                </button>
              ) : (
                <Link
                  href={`/login?redirect=/board-studio?template=${template.id}`}
                  style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #ef3b2d 0%, #ff8a1f 100%)', color: '#fff', fontWeight: 700, padding: '8px 20px', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 0 20px rgba(239, 59, 45, 0.4)' }}
                >
                  <LogIn size={14} />
                  <span>Sign In to Buy · ₹{price}</span>
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
