import { PlaceResult, CityClusterData, LatLng } from '../types';

/**
 * 从 Google Places address_components 中提取城市名
 */
export function extractCity(
  addressComponents?: google.maps.GeocoderAddressComponent[]
): string {
  if (!addressComponents) return '未知城市';

  const locality = addressComponents.find((c) =>
    c.types.includes('locality')
  );
  if (locality) return locality.long_name;

  const admin1 = addressComponents.find((c) =>
    c.types.includes('administrative_area_level_1')
  );
  if (admin1) return admin1.long_name;

  const admin2 = addressComponents.find((c) =>
    c.types.includes('administrative_area_level_2')
  );
  if (admin2) return admin2.long_name;

  return '未知城市';
}

/**
 * 将 PlaceResult[] 按城市聚类
 */
export function clusterByCity(places: PlaceResult[]): CityClusterData[] {
  const cityMap = new Map<string, PlaceResult[]>();

  places.forEach((place) => {
    const city = place.city || '未知城市';
    if (!cityMap.has(city)) {
      cityMap.set(city, []);
    }
    cityMap.get(city)!.push(place);
  });

  const clusters: CityClusterData[] = [];
  cityMap.forEach((cityPlaces, city) => {
    // 计算城市聚类中心（取所有点的平均值）
    const validPlaces = cityPlaces.filter((p) => p.latLng !== null);
    if (validPlaces.length === 0) return;

    const center: LatLng = {
      lat: validPlaces.reduce((sum, p) => sum + p.latLng!.lat, 0) / validPlaces.length,
      lng: validPlaces.reduce((sum, p) => sum + p.latLng!.lng, 0) / validPlaces.length,
    };

    clusters.push({
      city,
      center,
      places: cityPlaces,
      count: cityPlaces.length,
    });
  });

  return clusters;
}

/**
 * 防抖函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
