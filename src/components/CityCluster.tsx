import React, { useState } from 'react';
import { OverlayView } from '@react-google-maps/api';
import { CityClusterData } from '../types';

interface CityClusterProps {
  cluster: CityClusterData;
  onClick: (cluster: CityClusterData) => void;
}

const CityCluster: React.FC<CityClusterProps> = ({ cluster, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const size = Math.min(60 + cluster.count * 6, 100);

  return (
    <OverlayView
      position={cluster.center}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: -(height / 2),
      })}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'rgba(0,122,255,0.08)',
          border: '3px solid #007AFF',
          boxShadow: hovered
            ? '0 6px 24px rgba(0,122,255,0.4)'
            : '0 4px 16px rgba(0,122,255,0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
          userSelect: 'none',
          position: 'relative',
          backdropFilter: 'blur(4px)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onClick(cluster)}
      >
        <span
          style={{
            fontSize: size > 70 ? 13 : 11,
            fontWeight: 700,
            color: '#007AFF',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: size - 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cluster.city}
        </span>
        <span
          style={{
            fontSize: 10,
            color: '#007AFF',
            fontWeight: 600,
            marginTop: 1,
            opacity: 0.8,
          }}
        >
          {cluster.count}个地点
        </span>

        {/* Hover tooltip */}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              bottom: size + 8,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: '8px 14px',
              boxShadow: '0 4px 16px rgba(0,122,255,0.2)',
              border: '2px solid #007AFF',
              whiteSpace: 'nowrap',
              fontSize: 12,
              color: '#333',
              fontWeight: 500,
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontWeight: 700, color: '#007AFF', marginBottom: 2 }}>
              {cluster.city}
            </div>
            <div>共 {cluster.count} 个搜索结果</div>
            <div
              style={{
                position: 'absolute',
                bottom: -6,
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: 10,
                height: 10,
                backgroundColor: '#fff',
                borderRight: '2px solid #007AFF',
                borderBottom: '2px solid #007AFF',
              }}
            />
          </div>
        )}
      </div>
    </OverlayView>
  );
};

export default CityCluster;
