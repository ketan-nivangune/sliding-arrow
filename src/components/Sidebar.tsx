import React from 'react';
import type { GameThemeConfig } from '../engine/types';

interface SidebarProps {
  theme: GameThemeConfig;
  onThemeChange: (newTheme: GameThemeConfig) => void;
  onClose: () => void;
}

const ColorPickerInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="sidebar-section">
    <label>{label}</label>
    <label style={{
      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
      padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%', backgroundColor: value,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
      }} />
      <span style={{ fontSize: '14px', color: '#4b5563', fontFamily: 'monospace', fontWeight: 600 }}>
        {value.toUpperCase()}
      </span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
      />
    </label>
  </div>
);

export function Sidebar({ theme, onThemeChange, onClose }: SidebarProps) {

  const update = (updates: Partial<GameThemeConfig>) => {
    onThemeChange({ ...theme, ...updates });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'campaignBgLandscape' | 'campaignBgPortrait') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      update({ [field]: url });
    }
  };

  return (
    <div className="builder-sidebar">
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Arrow Style</h3>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close settings">✕</button>
      </div>

      <ColorPickerInput
        label="Arrow Color"
        value={'#' + theme.arrowColor.toString(16).padStart(6, '0')}
        onChange={(val) => update({ arrowColor: parseInt(val.replace('#', ''), 16) })}
      />

      <div className="sidebar-section">
        <label>
          Arrow Thickness
          <span>{theme.arrowThickness}px</span>
        </label>
        <input
          type="range"
          min="4"
          max="24"
          value={theme.arrowThickness}
          onChange={(e) => update({ arrowThickness: parseInt(e.target.value, 10) })}
        />
      </div>

      <div className="sidebar-section">
        <label>Arrow Head</label>
        <select
          value={theme.arrowHeadStyle}
          onChange={(e) => update({ arrowHeadStyle: e.target.value as any })}
        >
          <option value="triangle">Triangle</option>
          <option value="flat">Chevron</option>
        </select>
      </div>

      <div className="sidebar-section">
        <label>Path Style</label>
        <div className="toggle-group">
          <button
            className={theme.pathStyle === 'rounded' ? 'active' : ''}
            onClick={() => update({ pathStyle: 'rounded' })}
          >Rounded</button>
          <button
            className={theme.pathStyle === 'square' ? 'active' : ''}
            onClick={() => update({ pathStyle: 'square' })}
          >Square</button>
        </div>
      </div>

      <hr className="divider" />

      <div className="sidebar-header">
        <h3>Canvas</h3>
      </div>

      <ColorPickerInput
        label="Background Color"
        value={'#' + theme.bgColor.toString(16).padStart(6, '0')}
        onChange={(val) => update({ bgColor: parseInt(val.replace('#', ''), 16) })}
      />

      <div className="sidebar-section">
        <label>
          Canvas Opacity
          <span>{Math.round(theme.bgOpacity * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(theme.bgOpacity * 100)}
          onChange={(e) => update({ bgOpacity: parseInt(e.target.value, 10) / 100 })}
        />
      </div>

      <div className="sidebar-section">
        <label>
          Canvas Roundness
          <span>{theme.canvasRadius}px</span>
        </label>
        <input
          type="range"
          min="0"
          max="64"
          value={theme.canvasRadius}
          onChange={(e) => update({ canvasRadius: parseInt(e.target.value, 10) })}
        />
      </div>

      <div className="sidebar-section flex-row">
        <label>Show Grid</label>
        <label className="switch">
          <input
            type="checkbox"
            checked={theme.showGrid}
            onChange={(e) => update({ showGrid: e.target.checked })}
          />
          <span className="slider round"></span>
        </label>
      </div>

      {theme.showGrid && (
        <div className="sidebar-section">
          <label>
            Grid Size
            <span>{theme.gridSize}px</span>
          </label>
          <input
            type="range"
            min="15"
            max="60"
            step="5"
            value={theme.gridSize}
            onChange={(e) => update({ gridSize: parseInt(e.target.value, 10) })}
          />
        </div>
      )}

      <hr className="divider" />

      <div className="sidebar-header">
        <h3>Campaign Environment</h3>
      </div>

      <div className="sidebar-section flex-row">
        <label>Show Gradient (Vignette)</label>
        <label className="switch">
          <input
            type="checkbox"
            checked={theme.showVignette}
            onChange={(e) => update({ showVignette: e.target.checked })}
          />
          <span className="slider round"></span>
        </label>
      </div>

      <ColorPickerInput
        label="Base Color"
        value={theme.campaignBgColor || '#1a1a1a'}
        onChange={(val) => update({ campaignBgColor: val })}
      />

      <div className="sidebar-section">
        <label>Landscape Background Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e, 'campaignBgLandscape')}
          style={{ width: '100%', fontSize: '12px' }}
        />
        {theme.campaignBgLandscape && <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>✓ Uploaded</div>}
      </div>

      <div className="sidebar-section">
        <label>Portrait Background Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e, 'campaignBgPortrait')}
          style={{ width: '100%', fontSize: '12px' }}
        />
        {theme.campaignBgPortrait && <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>✓ Uploaded</div>}
      </div>

      <div className="sidebar-section">
        <label>Background Fit</label>
        <div className="toggle-group">
          <button
            className={theme.bgFit === 'cover' ? 'active' : ''}
            onClick={() => update({ bgFit: 'cover' })}
          >Fill</button>
          <button
            className={theme.bgFit === 'contain' ? 'active' : ''}
            onClick={() => update({ bgFit: 'contain' })}
          >Fit</button>
        </div>
      </div>

      <hr className="divider" />

      <div className="sidebar-header">
        <h3>Reward Popup</h3>
      </div>

      <div className="sidebar-section">
        <label>Popup Theme</label>
        <select
          value={theme.voucherTheme}
          onChange={(e) => update({ voucherTheme: e.target.value as any })}
        >
          <option value="purple">Neon Purple</option>
          <option value="gold">Gold Rush</option>
          <option value="blue">Cyber Blue</option>
        </select>
      </div>

      <div className="sidebar-section">
        <label>Reward Value</label>
        <input
          type="text"
          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none' }}
          value={theme.rewardValue}
          onChange={(e) => update({ rewardValue: e.target.value })}
        />
      </div>

      <div className="sidebar-section">
        <label>Voucher Label</label>
        <input
          type="text"
          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none' }}
          value={theme.voucherLabel}
          onChange={(e) => update({ voucherLabel: e.target.value })}
        />
      </div>

      <div className="sidebar-footer">
        <button className="save-btn" onClick={() => alert("Theme Saved!")}>
          Save as Theme
        </button>
      </div>
    </div>
  );
}
