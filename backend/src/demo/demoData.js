import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const demoId = key => createHash("sha256").update(`pickleball-local-demo-v1:${key}`).digest("hex").slice(0, 24);
export const DEMO_CENTER = { latitude: 10.875, longitude: 106.765, radius: 5 };
export const DEMO_CREDENTIALS_FILE = fileURLToPath(new URL("../../.demo-credentials.json", import.meta.url));
export const DEMO_USERS = [
    { _id: demoId("player-1"), email: "demo.player1@example.invalid", fullName: "Người chơi demo 1" },
    { _id: demoId("player-2"), email: "demo.player2@example.invalid", fullName: "Người chơi demo 2" }
];

// Fictional venues and illustrative coordinates, not verified real businesses.
export const DEMO_COURTS = [
    { key: "linh-trung", name: "DEMO · Pickleball Linh Trung", location: "Thủ Đức, Hồ Chí Minh", address: "Điểm demo 01, khu vực Linh Trung, Thủ Đức, TP.HCM", latitude: 10.870, longitude: 106.760, type: "INDOOR", pricePerHour: 150000 },
    { key: "linh-xuan", name: "DEMO · Pickleball Linh Xuân", location: "Thủ Đức, Hồ Chí Minh", address: "Điểm demo 02, Phường Linh Xuân, Thủ Đức, TP.HCM", latitude: 10.880, longitude: 106.757, type: "OUTDOOR", pricePerHour: 120000 },
    { key: "thu-duc", name: "DEMO · Pickleball Thủ Đức", location: "Thủ Đức, Hồ Chí Minh", address: "Điểm demo 03, khu vực Thủ Đức, TP.HCM", latitude: 10.862, longitude: 106.755, type: "INDOOR", pricePerHour: 180000 },
    { key: "dong-hoa", name: "DEMO · Pickleball Đông Hòa", location: "Dĩ An, Bình Dương (địa chỉ cũ), Hồ Chí Minh", address: "Điểm demo 04, Phường Đông Hòa, Dĩ An, Bình Dương (địa chỉ cũ), TP.HCM", latitude: 10.882, longitude: 106.774, type: "OUTDOOR", pricePerHour: 130000 },
    { key: "di-an", name: "DEMO · Pickleball Dĩ An", location: "Dĩ An, Bình Dương (địa chỉ cũ), Hồ Chí Minh", address: "Điểm demo 05, Phường Dĩ An, Bình Dương (địa chỉ cũ), TP.HCM", latitude: 10.891, longitude: 106.765, type: "INDOOR", pricePerHour: 160000 },
    { key: "binh-duong", name: "DEMO · Pickleball Bình Dương", location: "Dĩ An, Bình Dương (địa chỉ cũ), Hồ Chí Minh", address: "Điểm demo 06, khu vực Dĩ An, Bình Dương (địa chỉ cũ), TP.HCM", latitude: 10.880, longitude: 106.785, type: "OUTDOOR", pricePerHour: 140000 }
].map(({ key, ...court }) => ({
    ...court, _id: demoId(`court-${key}`),
    description: "Sân giả lập để kiểm thử tìm kiếm và đặt lịch. Đây không phải địa điểm kinh doanh thực tế; tên, địa chỉ và tọa độ chỉ dùng minh hoạ.",
    openTime: "06:00", closeTime: "22:00", slotDuration: 60,
    amenities: ["Dữ liệu demo", "Khung giờ 60 phút"], images: [], status: "AVAILABLE"
}));

export const demoSubCourts = court => [1, 2].map(number => ({
    _id: demoId(`subcourt-${court._id}-${number}`),
    courtId: court._id,
    name: `Sân demo ${String(number).padStart(2, "0")}`,
    status: "AVAILABLE"
}));
