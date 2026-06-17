export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  description: string;
  latLng: LatLng | null;
  city: string;
  address: string;
}

export interface CityClusterData {
  city: string;
  center: LatLng;
  places: PlaceResult[];
  count: number;
}
