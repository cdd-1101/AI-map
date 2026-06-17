import React, { useState } from 'react';
import { OverlayView } from '@react-google-maps/api';
import { PlaceResult } from '../types';
import CuteInfoWindow from './CuteInfoWindow';

interface CuteMarkerProps {
  place: PlaceResult;
}

const CuteMarker: React.FC<CuteMarkerProps> = ({ place }) => {
  const [hovered, setHovered] = useState(false);

  if (!place.latLng) return null;

  return (
    <OverlayView
      position={place.latLng}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: -height,
      })}
    >
      <div
        style={{
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
          transform: hovered ? 'scale(1.2)' : 'scale(1)',
          filter: hovered
            ? 'drop-shadow(0 6px 14px rgba(0,122,255,0.4))'
            : 'drop-shadow(0 3px 8px rgba(0,122,255,0.25))',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 蓝色圆角方块 + 白色定位图标 + 淡紫色底座 */}
        <svg
          width="36"
          height="46"
          viewBox="0 0 36 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 底部淡紫色阴影/底座 */}
          <ellipse cx="18" cy="42" rx="8" ry="4" fill="#C4B5E0" opacity="0.6" />
          {/* 小三角连接底座 */}
          <path d="M14 36 L18 42 L22 36" fill="#C4B5E0" opacity="0.5" />

          {/* 蓝色圆角矩形主体 */}
          <rect x="4" y="2" width="28" height="32" rx="8" ry="8" fill="#4FC3F7" />

          {/* 白色定位图标 - 水滴形 */}
          <path
            d="M18 8 C13.5 8 10 11.5 10 15.5 C10 21 18 28 18 28 C18 28 26 21 26 15.5 C26 11.5 22.5 8 18 8Z"
            fill="#fff"
          />
          {/* 定位图标中心圆点 */}
          <circle cx="18" cy="15.5" r="3" fill="#4FC3F7" />
        </svg>

        {/* 悬浮信息窗口 */}
        {hovered && <CuteInfoWindow place={place} />}
      </div>
    </OverlayView>
  );
};

export default CuteMarker;
