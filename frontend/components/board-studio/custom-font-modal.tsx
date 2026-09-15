'use client';

import React, { useState, useRef } from 'react';
import { fontManager, CustomFont } from '@/lib/board-studio/font-manager';
import { X, Upload, Type, Trash2, Check, Sparkles, FileText, AlertCircle } from 'lucide-react';

interface CustomFontModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFontAdded?: (fontValue: string) => void;
}

export const CustomFontModal: React.FC<CustomFontModalProps> = ({ isOpen, onClose, onFontAdded }) => {
  const [fonts, setFonts] = useState<CustomFont[]>(fontManager.getCustomFonts());
  const [googleFontName, setGoogleFontName] = useState('');
  const [customFontName, setCustomFontName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
      setError('Please select a valid font file (.ttf, .otf, .woff, .woff2).');
      return;
    }

    const defaultName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const fontName = customFontName.trim() || defaultName;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const added = fontManager.addUploadedFont(fontName, dataUrl);
        setFonts(fontManager.getCustomFonts());
        setCustomFontName('');
        setSuccess(`Font "${added.name}" uploaded successfully!`);
        if (onFontAdded) {
          onFontAdded(`'${added.name}', sans-serif`);
        }
      }
    };
    reader.onerror = () => {
      setError('Failed to read font file.');
    };
    reader.readAsDataURL(file);
  };

  const handleAddGoogleFont = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const name = googleFontName.trim();
    if (!name) {
      setError('Please enter a Google Font name.');
      return;
    }

    const added = fontManager.addGoogleFont(name);
    setFonts(fontManager.getCustomFonts());
    setGoogleFontName('');
    setSuccess(`Google Font "${added.name}" added successfully!`);
    if (onFontAdded) {
      onFontAdded(`'${added.name}', sans-serif`);
    }
  };

  const handleDeleteFont = (name: string) => {
    fontManager.deleteCustomFont(name);
    setFonts(fontManager.getCustomFonts());
    setSuccess(`Font "${name}" removed.`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" style={{ background: 'linear-gradient(135deg, #ef3b2d 0%, #ff8a1f 100%)', boxShadow: '0 0 20px rgba(239, 59, 45, 0.4)' }}>
              <Type size={18} color="#fff" />
            </div>
            <div>
              <h3>Custom Railway Fonts</h3>
              <p>Upload .TTF/.OTF font files or import any Google Font for LED displays & boards.</p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="auth-alert-msg error" style={{ margin: '14px 20px 0 20px' }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-alert-msg success" style={{ margin: '14px 20px 0 20px' }}>
            <Check size={14} />
            <span>{success}</span>
          </div>
        )}

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* OPTION 1: UPLOAD TTF / OTF */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Upload size={14} style={{ color: 'var(--rail-amber)' }} />
              <strong style={{ fontSize: 13, color: '#fff' }}>Upload Font File (.TTF, .OTF, .WOFF)</strong>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px 0' }}>
              Upload any railway LED or stencil font from your computer. It will be stored in your browser for instant use.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Optional custom font name..."
                value={customFontName}
                onChange={(e) => setCustomFontName(e.target.value)}
                className="input-text"
                style={{ flex: 1, padding: '7px 10px', fontSize: 12 }}
              />
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={13} />
                <span>Browse File</span>
              </button>
            </div>
          </div>

          {/* OPTION 2: GOOGLE FONT IMPORT */}
          <form onSubmit={handleAddGoogleFont} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Sparkles size={14} style={{ color: 'var(--rail-amber)' }} />
              <strong style={{ fontSize: 13, color: '#fff' }}>Add Google Web Font</strong>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px 0' }}>
              Type any Google Font name (e.g. <code>Bebas Neue</code>, <code>Teko</code>, <code>Orbitron</code>, <code>Rajdhani</code>).
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="e.g. Bebas Neue or Teko"
                value={googleFontName}
                onChange={(e) => setGoogleFontName(e.target.value)}
                className="input-text"
                style={{ flex: 1, padding: '7px 10px', fontSize: 12 }}
              />
              <button
                type="submit"
                className="btn-secondary"
                style={{ padding: '7px 14px', fontSize: 12 }}
              >
                Add Font
              </button>
            </div>
          </form>

          {/* ACTIVE CUSTOM FONTS LIST */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 0.5 }}>
              Your Custom Fonts ({fonts.length})
            </span>

            {fonts.length === 0 ? (
              <p style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', margin: '8px 0 0 0' }}>
                No custom fonts added yet. Upload a .TTF font or add a Google font above.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, maxHeight: 150, overflowY: 'auto' }}>
                {fonts.map((f) => (
                  <div
                    key={f.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6,
                      padding: '6px 10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} style={{ color: 'var(--rail-yellow)' }} />
                      <span style={{ fontFamily: `'${f.name}', sans-serif`, fontSize: 14, color: '#fff' }}>
                        {f.name}
                      </span>
                      <small style={{ fontSize: 10, color: '#64748b' }}>
                        {f.dataUrl ? '(Uploaded File)' : '(Google Font)'}
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteFont(f.name)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                      title="Delete Font"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-primary" onClick={onClose} style={{ padding: '7px 16px', fontSize: 12 }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

