// Placeholder nearest-area lookup until the real Google Geocoding API is wired
// (needs an API key — not configured yet). Swaps out for reverse geocoding later
// without changing the calling code's shape (still resolves lat/lng -> area name).
export const AREA_COORDS: { name: string; lat: number; lng: number }[] = [
  { name: "Jubilee Hills", lat: 17.4326, lng: 78.4071 },
  { name: "Banjara Hills", lat: 17.4156, lng: 78.4347 },
  { name: "Madhapur", lat: 17.4483, lng: 78.3915 },
  { name: "Ameerpet", lat: 17.4374, lng: 78.4487 },
  { name: "Tolichowki", lat: 17.3999, lng: 78.4118 },
  { name: "Charminar", lat: 17.3616, lng: 78.4747 },
];

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestArea(lat: number, lng: number): string {
  let best = AREA_COORDS[0];
  let bestDist = Infinity;
  for (const area of AREA_COORDS) {
    const d = haversineMeters(lat, lng, area.lat, area.lng);
    if (d < bestDist) {
      bestDist = d;
      best = area;
    }
  }
  return best.name;
}

export type GeoResult =
  | { status: "granted"; area: string }
  | { status: "denied" }
  | { status: "unavailable" };

export function requestLocation(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({ status: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ status: "granted", area: nearestArea(pos.coords.latitude, pos.coords.longitude) }),
      () => resolve({ status: "denied" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
