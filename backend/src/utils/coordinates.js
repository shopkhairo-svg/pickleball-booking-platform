import { queryNumber } from "./courtQuery.js";

export function parseCoordinates(data, existing = {}) {
    if (data.latitude === undefined && data.longitude === undefined) return {};
    const lat = data.latitude === undefined ? existing.latitude : data.latitude;
    const lng = data.longitude === undefined ? existing.longitude : data.longitude;
    if ((lat === "" || lat == null) && (lng === "" || lng == null)) return { latitude: null, longitude: null };
    if (lat === "" || lng === "" || lat == null || lng == null || typeof lat === "object" || typeof lng === "object" || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) throw new Error("Vĩ độ và kinh độ phải hợp lệ và được nhập cùng nhau.");
    return { latitude: queryNumber(lat, { min: -90, max: 90 }), longitude: queryNumber(lng, { min: -180, max: 180 }) };
}

// A coarse bounding box limits database reads before the exact Haversine calculation.
export function coordinateBounds(latitude, longitude, radius) {
    const angular = radius / 6371.0088;
    const latDelta = angular * 180 / Math.PI;
    const filter = { latitude: { $gte: Math.max(-90, latitude - latDelta), $lte: Math.min(90, latitude + latDelta) } };
    if (Math.abs(latitude) + latDelta >= 90) return filter;
    const lngDelta = Math.asin(Math.min(1, Math.sin(angular) / Math.cos(latitude * Math.PI / 180))) * 180 / Math.PI;
    const min = longitude - lngDelta, max = longitude + lngDelta;
    if (min < -180) filter.$or = [{ longitude: { $gte: min + 360 } }, { longitude: { $lte: max } }];
    else if (max > 180) filter.$or = [{ longitude: { $gte: min } }, { longitude: { $lte: max - 360 } }];
    else filter.longitude = { $gte: min, $lte: max };
    return filter;
}

export function distanceKm(lat1, lng1, lat2, lng2) {
    const rad = n => n * Math.PI / 180;
    const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
