import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { PlaceResult } from '../types';
import { extractCity, debounce } from '../utils/geoHelpers';

interface SearchBoxProps {
  onPlacesFound: (places: PlaceResult[]) => void;
  onPlaceSelected: (place: PlaceResult | null) => void;
  map: google.maps.Map | null;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onPlacesFound, onPlaceSelected, map }) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化服务
  const servicesReady = useMemo(() => {
    return typeof google !== 'undefined' && !!google.maps?.places;
  }, [map]);

  useEffect(() => {
    if (servicesReady && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    }
    if (servicesReady && map && !placesServiceRef.current) {
      placesServiceRef.current = new google.maps.places.PlacesService(map);
    }
  }, [servicesReady, map]);

  // 输入时获取预测（用于下拉提示）
  const fetchPredictions = useCallback(
    debounce((input: string) => {
      if (!input.trim() || !autocompleteServiceRef.current) {
        setPredictions([]);
        return;
      }
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: 'vn' },
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
            setShowDropdown(true);
          } else {
            setPredictions([]);
          }
        }
      );
    }, 300),
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSearched(false);
    setSearchResults([]);
    onPlacesFound([]);
    onPlaceSelected(null);
    fetchPredictions(value);
  };

  // ========== 核心：回车键触发文本搜索（不依赖 autocomplete predictions） ==========
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || !query.trim()) return;
      if (!placesServiceRef.current || !map) return;

      setIsSearching(true);
      setShowDropdown(false);
      setPredictions([]);

      const center = map.getCenter();

      // 使用 findPlaceFromQuery 直接按文本搜索（不依赖 autocomplete predictions）
      placesServiceRef.current.findPlaceFromQuery(
        {
          query: query.trim(),
          fields: ['geometry', 'name', 'formatted_address', 'address_components', 'place_id'],
          locationBias: center
            ? {
                center: { lat: center.lat(), lng: center.lng() },
                radius: 200000, // 200km 范围
              }
            : undefined,
        },
        (results, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results &&
            results.length > 0
          ) {
            const places: PlaceResult[] = results
              .filter((p) => p.geometry?.location)
              .map((p) => ({
                placeId: p.place_id || `search-${p.name}-${Date.now()}`,
                name: p.name || '',
                description: p.formatted_address || '',
                latLng: p.geometry?.location
                  ? {
                      lat: p.geometry.location.lat(),
                      lng: p.geometry.location.lng(),
                    }
                  : null,
                city: extractCity(p.address_components),
                address: p.formatted_address || '',
              }));

            setSearchResults(places);
            onPlacesFound(places);
            setSearched(true);
            setShowDropdown(false); // 回车后关闭下拉，只在地图上展示聚类

            // 自动调整地图视野以显示所有结果
            if (places.length > 0 && map) {
              const bounds = new google.maps.LatLngBounds();
              places.forEach((p) => {
                if (p.latLng) bounds.extend(p.latLng);
              });
              map.fitBounds(bounds, 80);
            }
          } else {
            // findPlaceFromQuery 没结果时，回退用 autocomplete predictions
            if (predictions.length > 0) {
              fetchDetailsFromPredictions(predictions);
            } else {
              // predictions 也为空，先尝试获取预测再批量查详情
              if (autocompleteServiceRef.current) {
                autocompleteServiceRef.current.getPlacePredictions(
                  {
                    input: query.trim(),
                    componentRestrictions: { country: 'vn' },
                  },
                  async (predResults, predStatus) => {
                    if (
                      predStatus === google.maps.places.PlacesServiceStatus.OK &&
                      predResults &&
                      predResults.length > 0
                    ) {
                      fetchDetailsFromPredictions(predResults);
                    } else {
                      setSearchResults([]);
                      onPlacesFound([]);
                      setSearched(true);
                      setShowDropdown(false);
                      setIsSearching(false);
                    }
                  }
                );
              } else {
                setSearched(true);
                setShowDropdown(false);
                setIsSearching(false);
              }
            }
          }
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !results ||
            results.length === 0
          ) {
            // 如果走了回退路径，这里不提前设 isSearching
            if (predictions.length === 0) return;
          }
          setIsSearching(false);
        }
      );
    },
    [query, map, predictions, onPlacesFound]
  );

  // 批量获取预测的详情（回退方案）
  const fetchDetailsFromPredictions = useCallback(
    async (preds: google.maps.places.AutocompletePrediction[]) => {
      if (!placesServiceRef.current) {
        setIsSearching(false);
        return;
      }
      const service = placesServiceRef.current;

      const detailsPromises = preds.map(
        (pred) =>
          new Promise<PlaceResult | null>((resolve) => {
            service.getDetails(
              {
                placeId: pred.place_id,
                fields: ['geometry', 'name', 'formatted_address', 'address_components'],
              },
              (place, status) => {
                if (
                  status === google.maps.places.PlacesServiceStatus.OK &&
                  place &&
                  place.geometry?.location
                ) {
                  resolve({
                    placeId: pred.place_id,
                    name: place.name || pred.description,
                    description: place.formatted_address || pred.description,
                    latLng: {
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                    },
                    city: extractCity(place.address_components),
                    address: place.formatted_address || '',
                  });
                } else {
                  resolve(null);
                }
              }
            );
          })
      );

      const details = await Promise.all(detailsPromises);
      const validPlaces = details.filter((p): p is PlaceResult => p !== null);

      setSearchResults(validPlaces);
      onPlacesFound(validPlaces);
      setSearched(true);
      setShowDropdown(false); // 回退搜索后也关闭下拉
      setIsSearching(false);
    },
    [onPlacesFound]
  );

  // 点击预测项（未回车时的快捷操作）
  const handleSelectPrediction = async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;
    setIsSearching(true);

    const service = placesServiceRef.current;
    service.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['geometry', 'name', 'formatted_address', 'address_components'],
      },
      (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place &&
          place.geometry?.location
        ) {
          const newPlace: PlaceResult = {
            placeId: prediction.place_id,
            name: place.name || prediction.description,
            description: place.formatted_address || prediction.description,
            latLng: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
            city: extractCity(place.address_components),
            address: place.formatted_address || '',
          };
          const places = [newPlace];
          setSearchResults(places);
          onPlacesFound(places);
          setSearched(true);
          setShowDropdown(false); // 点击预测后也关闭下拉
        }
        setIsSearching(false);
      }
    );
  };

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setSearchResults([]);
    setSearched(false);
    setShowDropdown(false);
    onPlacesFound([]);
    onPlaceSelected(null);
    inputRef.current?.focus();
  };

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.inputWrapper}>
        <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="7" stroke="#007AFF" strokeWidth="2.5" />
          <path d="M16 16L21 21" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searched ? searchResults.length > 0 : predictions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder="搜索地点、商店、建筑... (回车搜索)"
          style={styles.input}
        />
        {isSearching && <div style={styles.loadingSpinner} />}
        {query && !isSearching && (
          <button onClick={handleClear} style={styles.clearBtn}>
            ✕
          </button>
        )}
      </div>

      {showDropdown && !isSearching && (
        <div style={styles.dropdown}>
          {/* 已搜索后不展示下拉列表，结果直接在地图上以聚类展示 */}

          {/* 未搜索状态：展示预测提示列表 */}
          {!searched && predictions.length > 0 && (
            <>
              <div style={styles.dropdownHeader}>按回车键搜索全部结果</div>
              {predictions.map((p) => (
                <div
                  key={p.place_id}
                  style={styles.dropdownItem}
                  onClick={() => handleSelectPrediction(p)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#EBF5FF';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={styles.itemContent}>
                    <div style={styles.itemName}>
                      {p.structured_formatting?.main_text || p.description}
                    </div>
                    <div style={styles.itemDesc}>
                      {p.structured_formatting?.secondary_text || ''}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
    width: 340,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    boxShadow: '0 4px 20px rgba(0,122,255,0.15)',
    padding: '8px 16px',
    border: '2px solid #007AFF',
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#333',
    backgroundColor: 'transparent',
  },
  loadingSpinner: {
    width: 16,
    height: 16,
    border: '2px solid #B3D9FF',
    borderTop: '2px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  clearBtn: {
    border: 'none',
    background: 'none',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 14,
    padding: '0 4px',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,122,255,0.12)',
    border: '2px solid #007AFF',
    overflow: 'hidden',
    maxHeight: 320,
    overflowY: 'auto' as const,
  },
  dropdownHeader: {
    padding: '8px 16px',
    fontSize: 11,
    color: '#007AFF',
    fontWeight: 600,
    backgroundColor: '#F0F7FF',
    borderBottom: '1px solid #E5F0FF',
  },
  dropdownItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #E5F0FF',
    transition: 'background-color 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  itemIcon: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    marginBottom: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemDesc: {
    fontSize: 12,
    color: '#999',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    padding: '16px',
    textAlign: 'center' as const,
    fontSize: 13,
    color: '#999',
  },
};

export default SearchBox;
