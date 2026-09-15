'use client';

import React, { useRef, useState, useEffect } from 'react';
import { BoardTemplate, EditableField, UserBoardValues } from '@/lib/board-studio/types';

interface BoardCanvasProps {
  template: BoardTemplate;
  values: UserBoardValues;
  customBackgroundUrl?: string;
  isAdminMode?: boolean;
  selectedFieldId?: string | null;
  onSelectField?: (fieldId: string) => void;
  onUpdateFieldPosition?: (fieldId: string, x: number, y: number) => void;
  zoomScale?: number;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
  template,
  values,
  customBackgroundUrl,
  isAdminMode = false,
  selectedFieldId,
  onSelectField,
  onUpdateFieldPosition,
  zoomScale = 1.0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);

  // Responsive scaling to fit board inside parent container
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parent = containerRef.current.parentElement;
        const availableWidth = (parent ? parent.clientWidth : containerRef.current.clientWidth) || 800;
        const availableHeight = (parent ? parent.clientHeight : window.innerHeight) || 600;

        const maxW = Math.max(300, Math.min(availableWidth - 64, 1100));
        const maxH = Math.max(260, availableHeight - 140);

        const scaleW = maxW / template.baseWidth;
        const scaleH = maxH / template.baseHeight;
        setScale(Math.min(scaleW, scaleH));
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [template.baseWidth, template.baseHeight]);

  const handleMouseDownOnField = (e: React.MouseEvent, field: EditableField) => {
    if (!isAdminMode) {
      if (onSelectField) onSelectField(field.id);
      return;
    }

    e.stopPropagation();
    if (onSelectField) onSelectField(field.id);
    setIsDragging(true);
    setDraggedFieldId(field.id);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAdminMode || !isDragging || !draggedFieldId || !onUpdateFieldPosition || !containerRef.current) return;
    const boardEl = containerRef.current.querySelector('.board-surface') as HTMLDivElement;
    if (!boardEl) return;

    const rect = boardEl.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.round(Math.max(2, Math.min(98, rawX)));
    const clampedY = Math.round(Math.max(2, Math.min(98, rawY)));

    onUpdateFieldPosition(draggedFieldId, clampedX, clampedY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedFieldId(null);
  };

  const effectiveScale = scale * zoomScale;
  const scaledWidth = template.baseWidth * effectiveScale;
  const scaledHeight = template.baseHeight * effectiveScale;
  const effectiveBgImage = customBackgroundUrl || template.backgroundImageUrl;

  return (
    <div
      ref={containerRef}
      className={`board-canvas-wrapper ${template.isTextureSheet ? 'texture-mode' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className={`board-surface ${isAdminMode ? 'admin-mode' : 'user-mode'} ${
          template.backgroundType === 'transparent' ? 'has-transparency' : ''
        }`}
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          backgroundColor: template.backgroundType === 'transparent' ? 'transparent' : template.backgroundColor,
          backgroundImage: effectiveBgImage
            ? `url("${effectiveBgImage}")`
            : template.backgroundType === 'gradient' && template.backgroundSecondaryColor
            ? `linear-gradient(180deg, ${template.backgroundColor} 0%, ${template.backgroundSecondaryColor} 100%)`
            : undefined,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          borderRadius: `${template.borderRadius * effectiveScale}px`,
          borderColor: template.borderColor,
          borderWidth: `${template.borderWidth * effectiveScale}px`,
          borderStyle: template.borderWidth > 0 ? 'solid' : 'none',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          userSelect: 'none'
        }}
      >
        {/* Inner Border */}
        {template.innerBorder && (
          <div
            style={{
              position: 'absolute',
              top: `${(template.innerBorderPadding || 6) * effectiveScale}px`,
              left: `${(template.innerBorderPadding || 6) * effectiveScale}px`,
              right: `${(template.innerBorderPadding || 6) * effectiveScale}px`,
              bottom: `${(template.innerBorderPadding || 6) * effectiveScale}px`,
              border: `${Math.max(1, template.borderWidth * 0.4 * effectiveScale)}px solid ${
                template.innerBorderColor || template.borderColor
              }`,
              borderRadius: `${Math.max(2, (template.borderRadius - 4) * effectiveScale)}px`,
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
        )}

        {/* 4 Corner Bolts */}
        {template.showBolts && (
          <>
            <div className="corner-bolt top-left" style={{ transform: `scale(${effectiveScale})` }} />
            <div className="corner-bolt top-right" style={{ transform: `scale(${effectiveScale})` }} />
            <div className="corner-bolt bottom-left" style={{ transform: `scale(${effectiveScale})` }} />
            <div className="corner-bolt bottom-right" style={{ transform: `scale(${effectiveScale})` }} />
          </>
        )}

        {/* Fixed Graphics (Static Stamps, Logos, Dividers, Watermarks) */}
        {template.fixedGraphics.map((graphic) => {
          const gRot = graphic.rotation || 0;
          const gScale = graphic.scale || 1.0;
          const gOpacity = graphic.opacity !== undefined ? graphic.opacity : 1.0;

          if (graphic.type === 'divider') {
            return (
              <div
                key={graphic.id}
                style={{
                  position: 'absolute',
                  left: `${graphic.x}%`,
                  top: `${graphic.y}%`,
                  width: `${graphic.width || 90}%`,
                  height: `${(graphic.height || 2) * effectiveScale}px`,
                  backgroundColor: graphic.color || template.borderColor,
                  transform: `translate(-50%, -50%) rotate(${gRot}deg) scale(${gScale})`,
                  transformOrigin: 'center center',
                  opacity: gOpacity,
                  pointerEvents: 'none',
                  zIndex: 2
                }}
              />
            );
          }

          if (graphic.type === 'logo') {
            return (
              <div
                key={graphic.id}
                style={{
                  position: 'absolute',
                  left: `${graphic.x}%`,
                  top: `${graphic.y}%`,
                  width: `${(graphic.width || 15)}%`,
                  height: `${(graphic.height || 15)}%`,
                  transform: `translate(-50%, -50%) rotate(${gRot}deg) scale(${gScale})`,
                  transformOrigin: 'center center',
                  opacity: gOpacity,
                  pointerEvents: 'none',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {graphic.content ? (
                  <img
                    src={graphic.content}
                    alt="Static Stamp / Logo"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: `${12 * effectiveScale}px`, color: '#fff', opacity: 0.5 }}>
                    🚂 [Stamp]
                  </div>
                )}
              </div>
            );
          }

          if (graphic.type === 'badge') {
            return (
              <div
                key={graphic.id}
                style={{
                  position: 'absolute',
                  left: `${graphic.x}%`,
                  top: `${graphic.y}%`,
                  transform: `translate(-50%, -50%) rotate(${gRot}deg) scale(${gScale})`,
                  transformOrigin: 'center center',
                  opacity: gOpacity,
                  padding: `${2 * effectiveScale}px ${8 * effectiveScale}px`,
                  borderRadius: `${4 * effectiveScale}px`,
                  backgroundColor: graphic.color || template.borderColor,
                  color: template.backgroundColor,
                  fontWeight: 900,
                  fontSize: `${(graphic.fontSize || 12) * effectiveScale}px`,
                  letterSpacing: '1px',
                  pointerEvents: 'none',
                  zIndex: 2
                }}
              >
                {graphic.content}
              </div>
            );
          }

          return (
            <div
              key={graphic.id}
              style={{
                position: 'absolute',
                left: `${graphic.x}%`,
                top: `${graphic.y}%`,
                transform: `translate(-50%, -50%) rotate(${gRot}deg) scale(${gScale})`,
                transformOrigin: 'center center',
                opacity: gOpacity,
                color: graphic.color || template.borderColor,
                fontSize: `${(graphic.fontSize || 13) * effectiveScale}px`,
                fontWeight: graphic.fontWeight || 700,
                fontFamily: graphic.fontFamily || 'Arial',
                textAlign: graphic.align || 'center',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 2
              }}
            >
              {graphic.content}
            </div>
          );
        })}

        {/* Editable / Configured Fields (Text or Image) */}
        {template.fields.map((field) => {
          const rawValue = values[field.id] !== undefined ? values[field.id] : (field.defaultValue || field.imageUrl || '');
          const isSelected = selectedFieldId === field.id;
          const isImageField = field.type === 'image';
          const isLocked = field.allowUserEdit === false;

          const baseFontSize = field.fontSize * effectiveScale;
          const glowColor = field.glowColor || '#ff6200';
          const glowBlur = (field.glowRadius || 12) * effectiveScale;
          const displayValue = field.textTransform === 'uppercase' ? rawValue.toUpperCase() : rawValue;
          const fieldRot = field.rotation || 0;
          const fieldScale = field.scale || 1.0;

          return (
            <div
              key={field.id}
              className={`board-field ${isSelected ? 'selected' : ''} ${
                isAdminMode ? 'draggable-slot' : isLocked ? 'locked-slot' : 'clickable-slot'
              }`}
              style={{
                position: 'absolute',
                left: `${field.x}%`,
                top: `${field.y}%`,
                width: `${field.width}%`,
                height: `${field.height}%`,
                transform: `translate(-50%, -50%) rotate(${fieldRot}deg) scale(${fieldScale})`,
                transformOrigin: 'center center',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  field.align === 'center'
                    ? 'center'
                    : field.align === 'right'
                    ? 'flex-end'
                    : 'flex-start',
                cursor: isAdminMode ? 'move' : isLocked ? 'default' : 'pointer',
                zIndex: isSelected ? 10 : 4,
                outline: isAdminMode ? (isSelected ? '2px solid #ef3b2d' : '1px dashed rgba(255,138,31,0.6)') : undefined,
                backgroundColor: isAdminMode && isSelected ? 'rgba(239,59,45,0.18)' : 'transparent',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
              onClick={(e) => handleMouseDownOnField(e, field)}
              title={
                isAdminMode
                  ? `[${isImageField ? 'Picture' : 'Text'}] ${field.label} (${isLocked ? 'Locked for user' : 'Editable by user'})`
                  : isLocked
                  ? `${field.label} (Locked by Admin)`
                  : `Click to edit: ${field.label}`
              }
            >
              {isImageField ? (
                rawValue ? (
                  <img
                    src={rawValue}
                    alt={field.label}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: field.imageFit || 'contain',
                      pointerEvents: 'none'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px dashed rgba(255,255,255,0.3)',
                      borderRadius: '4px',
                      fontSize: `${Math.max(10, 12 * effectiveScale)}px`,
                      color: '#9cb1c2'
                    }}
                  >
                    🖼️ [{field.label}]
                  </div>
                )
              ) : (
                <span
                  className={field.ledGlow ? 'led-text-glow' : ''}
                  style={{
                    fontFamily: field.fontFamily,
                    fontSize: `${baseFontSize}px`,
                    fontWeight: field.fontWeight,
                    fontStyle: field.fontStyle || 'normal',
                    color: field.color,
                    letterSpacing: field.letterSpacing ? `${field.letterSpacing * effectiveScale}px` : undefined,
                    textShadow: field.ledGlow
                      ? `0 0 ${glowBlur * 0.4}px ${glowColor}, 0 0 ${glowBlur}px ${glowColor}, 0 0 ${glowBlur * 1.5}px ${glowColor}`
                      : undefined,
                    WebkitTextStroke:
                      field.outlineWidth && field.outlineWidth > 0
                        ? `${field.outlineWidth * effectiveScale}px ${field.outlineColor || '#000000'}`
                        : undefined,
                    maxWidth: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: field.align,
                    display: 'inline-block'
                  }}
                >
                  {displayValue || <span style={{ opacity: 0.35 }}>[{field.label}]</span>}
                </span>
              )}

              {/* Admin field label badge with Lock/Edit indicator */}
              {isAdminMode && (
                <span className="admin-slot-tag" style={{ transform: `scale(${Math.max(0.7, effectiveScale)})` }}>
                  {isImageField ? '🖼️ ' : '📝 '}
                  {field.label} {isLocked ? '🔒 Locked' : '✏️ Editable'}
                </span>
              )}
            </div>
          );
        })}

        {/* Site Details & Watermark at end of template */}
        {template.showWatermark !== false && (
          <div
            style={{
              position: 'absolute',
              bottom: `${4 * effectiveScale}px`,
              right: `${8 * effectiveScale}px`,
              fontSize: `${Math.max(8, 10 * effectiveScale)}px`,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.45)',
              letterSpacing: '0.5px',
              pointerEvents: 'none',
              zIndex: 5,
              textShadow: '0 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            {template.watermarkText || 'Created with GJS Railway Board Studio • https://gjs-store-4-msts.vercel.app'}
          </div>
        )}
      </div>
    </div>
  );
};

