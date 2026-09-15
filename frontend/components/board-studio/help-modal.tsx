'use client';

import React from 'react';
import { X, ShieldCheck, UserCheck, Sparkles, FileCode, CheckCircle2 } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content help-modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Sparkles size={20} />
            </div>
            <div>
              <h3>GJS Railway Name Board Studio Guide</h3>
              <p>Authentic Indian Railways LED displays, DDS export, and custom template production.</p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="help-modal-body">
          <div className="help-role-card user-card">
            <div className="help-card-header">
              <UserCheck size={18} />
              <h4>User Mode & DDS Texture Generation</h4>
            </div>
            <ul>
              <li><strong>Locked UV Mapping:</strong> The 1024×1024 texture layout, UV coordinates, and LED diode positions are strictly locked so you cannot break simulator compatibility.</li>
              <li><strong>Content Re-Entry:</strong> Type your own Train Number, Train Name, Destination, Route Codes, or upload coach pictures.</li>
              <li><strong>Direct DDS Export:</strong>
                <ul>
                  <li><strong>Universal 32-bit BGRA:</strong> Uncompressed high-fidelity format compatible with MSTS, Open Rails, and Trainz.</li>
                  <li><strong>DXT5 Compressed:</strong> Fast BC3 texture block compression with alpha transparency.</li>
                </ul>
              </li>
              <li><strong>Simulator Drop-In:</strong> Save the `.dds` file and replace the existing coach texture in your train simulator TRAINSET folder!</li>
              <li><strong>Save to My Store:</strong> Save your customized boards for fast access, editing, and batch downloads.</li>
            </ul>
          </div>

          <div className="help-role-card admin-card">
            <div className="help-card-header">
              <ShieldCheck size={18} />
              <h4>Admin Template Studio (Staff & Admins)</h4>
            </div>
            <ul>
              <li><strong>Upload Custom Texture Sheets:</strong> Upload any 1024×1024 or 2048×2048 texture sheet (PNG/JPG).</li>
              <li><strong>Drag & Drop Slots:</strong> Click and drag slots directly across the board canvas to position them.</li>
              <li><strong>LED Glowing Fonts:</strong> Configure amber/orange LED glowing fonts, dot-pitch matrix styling, letter spacing, and size.</li>
              <li><strong>Custom Fonts:</strong> Upload TTF/OTF font files or import any Google Font directly into the studio.</li>
              <li><strong>Pricing & Public Release:</strong> Set Free vs Paid pricing and click <em>"Publish"</em> to make templates instantly available.</li>
            </ul>
          </div>
        </div>

        <div className="modal-actions" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-primary" onClick={onClose}>
            Got it, let's design!
          </button>
        </div>
      </div>
    </div>
  );
};

