import React, { useState, useCallback, useMemo } from 'react';
import {
  GoogleMap,
  useLoadScript,
} from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, MAP_CONFIG } from '../config';
import { PlaceResult, CityClusterData } from '../types';
import { clusterByCity } from '../utils/geoHelpers';
import SearchBox from '../components/SearchBox';
import CityClusterComponent from '../components/CityCluster';
import CuteMarker from '../components/CuteMarker';

// 地图容器样式
const containerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
};

// 地图样式：隐藏默认 POI 标签，保留可爱风
const mapStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
];

const MapPage: React.FC = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState(MAP_CONFIG.defaultZoom);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [selectedClusterCity, setSelectedClusterCity] = useState<string | null>(null);

  // 加载 Google Maps SDK
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  // 地图加载回调
  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // 缩放变化回调
  const onZoomChanged = useCallback(() => {
    if (map) {
      setCurrentZoom(map.getZoom() ?? MAP_CONFIG.defaultZoom);
    }
  }, [map]);

  // 搜索结果更新（重置聚类选择）
  const handlePlacesFound = useCallback((places: PlaceResult[]) => {
    setSearchResults(places);
    setSelectedClusterCity(null);
    setSelectedPlace(null);
  }, []);

  // 选中某个地点
  const handlePlaceSelected = useCallback(
    (place: PlaceResult | null) => {
      setSelectedPlace(place);
      if (map && place?.latLng) {
        map.panTo(place.latLng);
        map.setZoom(15);
      }
    },
    [map]
  );

  // 点击聚类圆形：缩放到 13，展示该城市所有标记
  const handleClusterClick = useCallback(
    (cluster: CityClusterData) => {
      if (map) {
        map.panTo(cluster.center);
        map.setZoom(13);
        setSelectedClusterCity(cluster.city);
        setSelectedPlace(null);
      }
    },
    [map]
  );

  // 聚类：只在未选择聚类且缩放 < 13 时显示
  const showClusters = searchResults.length > 0 && !selectedClusterCity && currentZoom < MAP_CONFIG.markerZoomThreshold;
  const cityClusters = useMemo(() => {
    if (!showClusters) return [];
    return clusterByCity(searchResults);
  }, [searchResults, showClusters]);

  // 标记：点击聚类后展示该城市的所有地点，或者缩放 >= 13 时展示全部
  const markersToShow = useMemo(() => {
    if (selectedPlace) return [selectedPlace];
    if (selectedClusterCity) {
      return searchResults.filter(
        (p) => p.city === selectedClusterCity && p.latLng !== null
      );
    }
    if (currentZoom >= MAP_CONFIG.markerZoomThreshold && searchResults.length > 0) {
      return searchResults.filter((p) => p.latLng !== null);
    }
    return [];
  }, [selectedPlace, selectedClusterCity, searchResults, currentZoom]);

  if (loadError) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#007AFF' }}>地图加载失败</h2>
        <p>请检查 Google Maps API Key 是否正确配置。</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #F0F7FF 0%, #E5F0FF 100%)',
          fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid #B3D9FF',
              borderTop: '4px solid #007AFF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#007AFF', fontSize: 16 }}>正在加载地图...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.defaultZoom}
        options={{
          minZoom: MAP_CONFIG.minZoom,
          maxZoom: MAP_CONFIG.maxZoom,
          styles: mapStyles,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
        }}
        onLoad={onMapLoad}
        onZoomChanged={onZoomChanged}
      >
        {/* 城市聚类圆形 */}
        {cityClusters.map((cluster) => (
          <CityClusterComponent
            key={cluster.city}
            cluster={cluster}
            onClick={handleClusterClick}
          />
        ))}

        {/* 可爱风标记 */}
        {markersToShow.map((place) => (
          <CuteMarker key={place.placeId} place={place} />
        ))}
      </GoogleMap>

      {/* 悬浮搜索框 */}
      <SearchBox
        onPlacesFound={handlePlacesFound}
        onPlaceSelected={handlePlaceSelected}
        map={map}
      />

      {/* 底部提示 */}
      <div style={styles.zoomHint}>
        缩放: {currentZoom}
        {searchResults.length > 0 && !selectedClusterCity && currentZoom < MAP_CONFIG.markerZoomThreshold && (
          <span style={{ marginLeft: 6, color: '#007AFF' }}>
            点击城市聚类圆圈查看地点标记
          </span>
        )}
        {selectedClusterCity && (
          <span style={{ marginLeft: 6, color: '#007AFF' }}>
            {selectedClusterCity} · {markersToShow.length} 个地点
          </span>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  zoomHint: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: '6px 12px',
    fontSize: 12,
    color: '#666',
    fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: 5,
  },
};

export default MapPage;
