import React from 'react';
import { PlaceResult } from '../types';

interface CuteInfoWindowProps {
  place: PlaceResult;
}

const CuteInfoWindow: React.FC<CuteInfoWindowProps> = ({ place }) => {
  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* 左侧蓝色圆形 + 按钮 */}
        <div style={styles.leftBtn}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="9" y1="4" x2="9" y2="14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <line x1="4" y1="9" x2="14" y2="9" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* 右侧文本区域 */}
        <div style={styles.textArea}>
          <div style={styles.name}>{place.name}</div>
          <div style={styles.underline} />
          {place.city && (
            <div style={styles.cityRow}>
              <span style={styles.cityText}>{place.city}</span>
              <div style={styles.cityUnderline} />
            </div>
          )}
        </div>
      </div>

      {/* 底部三角箭头 */}
      <div style={styles.arrowOuter} />
      <div style={styles.arrowInner} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 10,
    zIndex: 100,
    pointerEvents: 'none',
    animation: 'fadeIn 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    border: '2.5px solid #007AFF',
    padding: '6px 14px 6px 6px',
    boxShadow: '0 4px 16px rgba(0,122,255,0.18)',
    fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
    whiteSpace: 'nowrap',
    position: 'relative' as const,
  },
  leftBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#007AFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 10,
  },
  textArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: 700,
    color: '#222',
    lineHeight: 1.3,
    letterSpacing: 0.3,
  },
  underline: {
    height: 1.5,
    backgroundColor: '#007AFF',
    borderRadius: 1,
    marginTop: 1,
    opacity: 0.5,
  },
  cityRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    marginTop: 2,
  },
  cityText: {
    fontSize: 12,
    fontWeight: 500,
    color: '#555',
    lineHeight: 1.3,
  },
  cityUnderline: {
    height: 1,
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 1,
    marginTop: 1,
    opacity: 0.35,
  },
  arrowOuter: {
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #007AFF',
    marginTop: -1,
  },
  arrowInner: {
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: '6px solid #fff',
    position: 'absolute' as const,
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: -8,
  },
};

export default CuteInfoWindow;
