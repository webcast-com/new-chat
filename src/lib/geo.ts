import { kenyaLocations } from '../data/kenyaLocations';

/**
 * Phase 6 — location utilities: Kenya county centroids, reverse geocoding
 * (GPS → county/constituency), haversine distance, and validation.
 */

/** Approximate county centroids (lat, lng) in decimal degrees. */
export const KENYA_COUNTY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  'Baringo': { lat: 0.65, lng: 35.95 },
  'Bomet': { lat: -0.78, lng: 35.35 },
  'Bungoma': { lat: 0.57, lng: 34.56 },
  'Busia': { lat: 0.46, lng: 34.11 },
  'Elgeyo-Marakwet': { lat: 1.2, lng: 35.55 },
  'Embu': { lat: -0.53, lng: 37.45 },
  'Garissa': { lat: -0.45, lng: 39.65 },
  'Homa Bay': { lat: -0.52, lng: 34.45 },
  'Isiolo': { lat: 0.35, lng: 38.5 },
  'Kajiado': { lat: -2.0, lng: 36.8 },
  'Kakamega': { lat: 0.28, lng: 34.75 },
  'Kericho': { lat: -0.37, lng: 35.28 },
  'Kiambu': { lat: -1.17, lng: 36.83 },
  'Kilifi': { lat: -3.35, lng: 39.75 },
  'Kirinyaga': { lat: -0.5, lng: 37.28 },
  'Kisii': { lat: -0.68, lng: 34.77 },
  'Kisumu': { lat: -0.09, lng: 34.77 },
  'Kitui': { lat: -1.37, lng: 38.0 },
  'Kwale': { lat: -4.17, lng: 39.45 },
  'Laikipia': { lat: 0.36, lng: 36.87 },
  'Lamu': { lat: -2.27, lng: 40.9 },
  'Machakos': { lat: -1.52, lng: 37.27 },
  'Makueni': { lat: -1.8, lng: 37.62 },
  'Mandera': { lat: 3.93, lng: 41.87 },
  'Marsabit': { lat: 2.33, lng: 37.99 },
  'Meru': { lat: 0.05, lng: 37.65 },
  'Migori': { lat: -1.07, lng: 34.47 },
  'Mombasa': { lat: -4.05, lng: 39.66 },
  "Murang'a": { lat: -0.73, lng: 37.15 },
  'Nairobi City': { lat: -1.29, lng: 36.82 },
  'Nakuru': { lat: -0.3, lng: 36.07 },
  'Nandi': { lat: 0.1, lng: 35.1 },
  'Narok': { lat: -1.08, lng: 35.87 },
  'Nyamira': { lat: -0.57, lng: 34.95 },
  'Nyandarua': { lat: -0.35, lng: 36.5 },
  'Nyeri': { lat: -0.42, lng: 36.95 },
  'Samburu': { lat: 1.2, lng: 36.9 },
  'Siaya': { lat: 0.05, lng: 34.2 },
  'Taita-Taveta': { lat: -3.35, lng: 38.37 },
  'Tana River': { lat: -1.5, lng: 39.8 },
  'Tharaka-Nithi': { lat: -0.25, lng: 37.85 },
  'Trans Nzoia': { lat: 1.05, lng: 34.95 },
  'Turkana': { lat: 3.1, lng: 35.6 },
  'Uasin Gishu': { lat: 0.52, lng: 35.27 },
  'Vihiga': { lat: 0.0, lng: 34.72 },
  'Wajir': { lat: 1.75, lng: 40.06 },
  'West Pokot': { lat: 1.5, lng: 35.1 },
};

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Haversine distance in kilometers between two points. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Format a distance for display. */
export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 100) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/** Closest Kenya county to a GPS point (from centroids), with its distance. */
export function closestCounty(point: GeoPoint): { county: string; distanceKm: number } | null {
  let best: { county: string; distanceKm: number } | null = null;
  for (const [county, centroid] of Object.entries(KENYA_COUNTY_CENTROIDS)) {
    const d = distanceKm(point, centroid);
    if (!best || d < best.distanceKm) best = { county, distanceKm: d };
  }
  return best;
}

/** Suggest a county for a GPS point (best centroid within 150 km, else null). */
export function detectCountyFromCoords(lat: number, lng: number): { county: string; distanceKm: number } | null {
  const closest = closestCounty({ lat, lng });
  if (!closest) return null;
  // Outside Kenya's ~150 km centroid envelope → not confidently in-country.
  if (closest.distanceKm > 150) return null;
  return closest;
}

/**
 * Pick the most plausible constituency in a county for a GPS point by
 * matching against the county's constituency names that appear in the
 * coordinate-bearing city/town names we can match. Without a full
 * gazetteer this is best-effort: returns null and callers fall back to
 * county-only.
 */
export function suggestConstituency(county: string, _point: GeoPoint): string | null {
  const constituencies = kenyaLocations[county];
  if (!constituencies) return null;
  // Heuristic: prefer constituency names that are also county-town names.
  const townMatches = constituencies.filter((c: string) =>
    /town|central|east|west|north|south/i.test(c)
  );
  return townMatches[0] || null;
}

/** Validate that a GPS reading is sane (in or near Kenya). */
export function isValidKenyaPoint(point: GeoPoint): boolean {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
  if (point.lat < -5.5 || point.lat > 6) return false;
  if (point.lng < 33.5 || point.lng > 42.5) return false;
  return true;
}

/** Reverse geocode via the Nominatim public API (free, no key). */
export async function reverseGeocode(point: GeoPoint): Promise<{ county: string | null; city: string | null }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}&accept-language=en`;
    const res = await fetch(url, { headers: { 'User-Agent': 'hyperlink-zoza/1.0' } });
    if (!res.ok) return { county: null, city: null };
    const data = (await res.json()) as {
      address?: { county?: string; state?: string; city?: string; town?: string; village?: string };
    };
    const address = data.address || {};
    const county = address.county || address.state || null;
    const city = address.city || address.town || address.village || null;
    return { county, city };
  } catch {
    return { county: null, city: null };
  }
}
