// src/seed.js
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";

import User from "./models/user.model.js";
import Court from "./models/court.model.js";
import SubCourt from "./models/subCourt.model.js";
import CourtSlot from "./models/courtSlot.model.js";
import Equipment from "./models/equipment.model.js";

const image = (name) => ({
    imageUrl: `https://res.cloudinary.com/chubby-pickle/image/upload/v1716416000/PickleballPro_Media/${name}.jpg`,
    publicId: `PickleballPro_Media/${name}`
});

const createSlots = (subCourts, court, dates) => {
    const slots = [];
    const slotDurationMin = court.slotDuration || 60;
    const [openHour, openMin] = court.openTime.split(":").map(Number);
    const [closeHour, closeMin] = court.closeTime.split(":").map(Number);
    const closeTotal = closeHour * 60 + closeMin;

    for (const date of dates) {
        for (const subCourt of subCourts) {
            for (let startTotal = openHour * 60 + openMin; startTotal + slotDurationMin <= closeTotal; startTotal += slotDurationMin) {
                const endTotal = startTotal + slotDurationMin;
                const startTime = `${String(Math.floor(startTotal / 60)).padStart(2, "0")}:${String(startTotal % 60).padStart(2, "0")}`;
                const endTime = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;

                slots.push({
                    subCourtId: subCourt._id,
                    courtId: court._id,
                    date,
                    startTime,
                    endTime,
                    isBooked: false
                });
            }
        }
    }

    return slots;
};

export const seedDatabase = async () => {
    try {
        await connectDB();

        console.log("1. Dropping old database data...");
        await mongoose.connection.dropDatabase();

        const hashedPassword = await bcrypt.hash("123456", 10);

        console.log("2. Creating users...");
        const [
            admin,
            user,
            courtVendorThuDuc,
            courtVendorQ1,
            courtVendorQ7,
            equipmentVendor,
            shipper,
            maintenanceCourtStaff,
            maintenanceEquipmentStaff
        ] = await User.create([
            { fullName: "Admin PickleballPro", email: "admin@gmail.com", password: hashedPassword, phone: "0900000001", role: "ADMIN" },
            { fullName: "Dương Minh Tâm", email: "tam@gmail.com", password: hashedPassword, phone: "0900000002", role: "USER" },
            { fullName: "Chủ sân Thủ Đức", email: "court.thuduc@gmail.com", password: hashedPassword, phone: "0900000003", role: "VENDOR", vendorType: "COURT" },
            { fullName: "Chủ sân Quận 1", email: "court.q1@gmail.com", password: hashedPassword, phone: "0900000004", role: "VENDOR", vendorType: "COURT" },
            { fullName: "Chủ sân Quận 7", email: "court.q7@gmail.com", password: hashedPassword, phone: "0900000005", role: "VENDOR", vendorType: "COURT" },
            { fullName: "Nhà cung cấp dụng cụ", email: "equipment.vendor@gmail.com", password: hashedPassword, phone: "0900000006", role: "VENDOR", vendorType: "EQUIPMENT" },
            { fullName: "Shipper PickleballPro", email: "shipper@gmail.com", password: hashedPassword, phone: "0900000007", role: "SHIPPER" },
            { fullName: "Thợ bảo trì sân", email: "maintenance.court@gmail.com", password: hashedPassword, phone: "0900000008", role: "MAINTENANCE_STAFF", maintenanceSkills: ["COURT"] },
            { fullName: "Thợ bảo trì thiết bị", email: "maintenance.equipment@gmail.com", password: hashedPassword, phone: "0900000009", role: "MAINTENANCE_STAFF", maintenanceSkills: ["EQUIPMENT"] }
        ]);

        console.log("3. Creating courts with exactly one owner each...");
        const courts = await Court.create([
            {
                name: "Cụm Sân PickleballPro Thủ Đức",
                location: "Thủ Đức",
                address: "Số 1 Võ Văn Ngân, Linh Chiểu, Thủ Đức, TP.HCM",
                type: "INDOOR",
                pricePerHour: 200000,
                openTime: "06:00",
                closeTime: "22:00",
                slotDuration: 60,
                amenities: ["Wifi miễn phí", "Bãi xe ô tô", "Phòng tắm", "Căng tin"],
                images: [image("court_thuduc_1"), image("court_thuduc_2")],
                status: "AVAILABLE",
                vendorId: courtVendorThuDuc._id
            },
            {
                name: "Sân Pickleball Đêm Sài Gòn Quận 1",
                location: "Quận 1",
                address: "Khu Hoa Lư, 2 Đinh Tiên Hoàng, Đa Kao, Quận 1, TP.HCM",
                type: "OUTDOOR",
                pricePerHour: 260000,
                openTime: "05:00",
                closeTime: "23:00",
                slotDuration: 60,
                amenities: ["Bãi xe máy", "Đèn chiếu sáng", "Ghế khán giả", "Cho thuê vợt"],
                images: [image("court_q1_1")],
                status: "AVAILABLE",
                vendorId: courtVendorQ1._id
            },
            {
                name: "Cụm Tổ Hợp Pickleball Nam Sài Gòn Quận 7",
                location: "Quận 7",
                address: "Đường Hoàng Quốc Việt, Phú Mỹ, Quận 7, TP.HCM",
                type: "INDOOR",
                pricePerHour: 180000,
                openTime: "07:00",
                closeTime: "21:00",
                slotDuration: 60,
                amenities: ["Wifi miễn phí", "Bãi xe ô tô", "Locker", "Máy bán nước"],
                images: [image("court_q7_1"), image("court_q7_2")],
                status: "AVAILABLE",
                vendorId: courtVendorQ7._id
            }
        ]);

        console.log("4. Creating sub-courts...");
        const subCourtGroups = await Promise.all([
            SubCourt.create([
                { courtId: courts[0]._id, name: "Sân số 01 (VIP Indoor)", status: "AVAILABLE" },
                { courtId: courts[0]._id, name: "Sân số 02 (Standard)", status: "AVAILABLE" },
                { courtId: courts[0]._id, name: "Sân số 03 (Standard)", status: "AVAILABLE" }
            ]),
            SubCourt.create([
                { courtId: courts[1]._id, name: "Sân ngoài trời A1", status: "AVAILABLE" },
                { courtId: courts[1]._id, name: "Sân ngoài trời A2", status: "AVAILABLE" }
            ]),
            SubCourt.create([
                { courtId: courts[2]._id, name: "Sân gỗ trong nhà S1", status: "AVAILABLE" },
                { courtId: courts[2]._id, name: "Sân gỗ trong nhà S2", status: "AVAILABLE" }
            ])
        ]);

        console.log("5. Creating slots for the next 7 days...");
        const dates = Array.from({ length: 7 }, (_, index) => {
            const d = new Date();
            d.setDate(d.getDate() + index);
            return d.toLocaleDateString("sv-SE");
        });

        const slots = subCourtGroups.flatMap((subCourts, index) => createSlots(subCourts, courts[index], dates));
        await CourtSlot.insertMany(slots);

        console.log("6. Creating court-specific equipments...");
        await Equipment.insertMany([
            {
                name: "Vợt Joola Perseus CFS 16mm - Thủ Đức",
                type: "PADDLE",
                quantity: 12,
                availableQuantity: 12,
                rentalType: "HOUR",
                rentalPrice: 50000,
                description: "Vợt carbon cao cấp cho người chơi muốn kiểm soát bóng tốt.",
                image: "",
                status: "AVAILABLE",
                vendorId: equipmentVendor._id,
                courtId: courts[0]._id
            },
            {
                name: "Bóng Franklin X-40 - Thủ Đức",
                type: "BALL",
                quantity: 80,
                availableQuantity: 80,
                rentalType: "TURN",
                rentalPrice: 20000,
                description: "Bóng thi đấu tiêu chuẩn, phù hợp indoor.",
                image: "",
                status: "AVAILABLE",
                vendorId: equipmentVendor._id,
                courtId: courts[0]._id
            },
            {
                name: "Vợt Selkirk Vanguard - Quận 1",
                type: "PADDLE",
                quantity: 10,
                availableQuantity: 10,
                rentalType: "HOUR",
                rentalPrice: 45000,
                description: "Vợt trợ lực cân bằng, phù hợp sân ngoài trời.",
                image: "",
                status: "AVAILABLE",
                vendorId: equipmentVendor._id,
                courtId: courts[1]._id
            },
            {
                name: "Set bóng ngoài trời - Quận 1",
                type: "BALL",
                quantity: 60,
                availableQuantity: 60,
                rentalType: "TURN",
                rentalPrice: 25000,
                description: "Bóng ngoài trời chịu gió tốt.",
                image: "",
                status: "AVAILABLE",
                vendorId: equipmentVendor._id,
                courtId: courts[1]._id
            },
            {
                name: "Vợt Onix Z5 Graphite - Quận 7",
                type: "PADDLE",
                quantity: 14,
                availableQuantity: 14,
                rentalType: "HOUR",
                rentalPrice: 40000,
                description: "Vợt graphite bền, dễ đánh cho nhóm gia đình.",
                image: "",
                status: "AVAILABLE",
                vendorId: equipmentVendor._id,
                courtId: courts[2]._id
            },
            {
                name: "Khăn thể thao & băng cổ tay - Quận 7",
                type: "ACCESSORY",
                quantity: 40,
                availableQuantity: 40,
                rentalType: "TURN",
                rentalPrice: 15000,
                description: "Phụ kiện thuê theo lượt cho người chơi.",
                image: "",
                status: "AVAILABLE",
                vendorId: equipmentVendor._id,
                courtId: courts[2]._id
            }
        ]);

        console.log("Seed completed successfully.");
        console.log("Accounts password: 123456");
        console.log(`Admin: ${admin.email}`);
        console.log(`User: ${user.email}`);
        console.log(`Court vendors: ${courtVendorThuDuc.email}, ${courtVendorQ1.email}, ${courtVendorQ7.email}`);
        console.log(`Equipment vendor: ${equipmentVendor.email}`);
        console.log(`Shipper: ${shipper.email}`);
        console.log(`Maintenance staff: ${maintenanceCourtStaff.email}, ${maintenanceEquipmentStaff.email}`);
        console.log(`Slots inserted: ${slots.length}`);

        process.exit(0);
    } catch (error) {
        console.error("Seed failed:", error);
        process.exit(1);
    }
};

seedDatabase();
