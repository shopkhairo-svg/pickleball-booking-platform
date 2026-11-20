import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import Court from "../models/court.model.js";
import Review from "../models/review.model.js";
import User from "../models/user.model.js";

const { values } = parseArgs({ options: { "mongo-url": { type: "string" } } });
if (!values["mongo-url"]) {
    throw new Error("Specify the intended database: npm run seed:demo-reviews -- --mongo-url mongodb://127.0.0.1:27018/pickleball_booking");
}

const credentialFile = new URL("../../.demo-review-credentials.json", import.meta.url);
const seedTag = "pickleball-demo-review-v1";
const objectId = key => createHash("sha256").update(`${seedTag}:${key}`).digest("hex").slice(0, 24);

const surnames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng"];
const maleNames = ["Minh", "Quang", "Tuấn", "Đức", "Hoàng", "Huy", "Khang", "Hiếu", "Thành", "Dũng"];
const femaleNames = ["Lan", "Linh", "Mai", "Trang", "Thảo", "Ngọc", "Hương", "Như", "Yến", "Vy"];
const sampleNames = [
    "Lê Văn Hiếu", "Lê Văn Khang", "Lê Văn Lâm", "Lê Văn Nghĩa", "Lê Văn Phát", "Lê Văn Thắng", "Lê Văn Vinh", "Lê Văn Việt",
    "Phạm Văn Cường", "Phạm Văn Dũng", "Phạm Văn Hậu", "Phạm Văn Huy", "Phạm Văn Kiên", "Phạm Văn Lợi", "Phạm Văn Phú", "Phạm Văn Sang", "Phạm Văn Trung", "Phạm Văn Vũ",
    "Hoàng Văn Anh", "Hoàng Văn Đạt", "Hoàng Văn Đức", "Hoàng Văn Hòa", "Hoàng Văn Khôi", "Hoàng Văn Lộc",
    "Hoàng Thị Huệ", "Hoàng Thị Lan", "Hoàng Thị Mai", "Hoàng Thị Nga", "Hoàng Thị Như", "Hoàng Thị Quyên", "Hoàng Thị Tuyết", "Hoàng Thị Yên"
];
const names = [...sampleNames];
for (let index = 0; names.length < 100; index++) {
    const surname = surnames[index % surnames.length];
    const middle = index % 2 ? "Thị" : "Văn";
    const givenName = index % 2 ? femaleNames[Math.floor(index / surnames.length) % femaleNames.length] : maleNames[Math.floor(index / surnames.length) % maleNames.length];
    const candidate = `${surname} ${middle} ${givenName}`;
    if (!names.includes(candidate)) names.push(candidate);
}

const reviewDetails = {
    1: ["mặt sân xuống cấp và có chỗ trơn", "đèn và vệ sinh chưa đáp ứng", "khung giờ đặt bị thay đổi", "khu vực chờ còn bất tiện", "trải nghiệm chưa tương xứng giá"],
    2: ["mặt sân chưa đồng đều", "nhà vệ sinh cần được chăm chút", "đèn ở cuối sân hơi tối", "thủ tục nhận sân còn chậm", "tiện ích chưa đầy đủ như mô tả"],
    3: ["sân ở mức ổn, chưa có điểm nổi bật", "mặt sân chơi được nhưng có vài chỗ cần sửa", "giá hợp lý, dịch vụ ở mức cơ bản", "không gian đủ dùng cho buổi tập", "trải nghiệm nhìn chung bình thường"],
    4: ["mặt sân sạch và độ nảy khá tốt", "nhân viên hỗ trợ nhanh", "khu vực thay đồ tiện lợi", "giá và chất lượng khá cân đối", "không gian thoáng, dễ tìm"],
    5: ["mặt sân đẹp, ánh sáng tốt", "nhân viên nhiệt tình và đúng giờ", "khuôn viên sạch, tiện ích đầy đủ", "đặt sân thuận tiện, trải nghiệm rất tốt", "chất lượng vượt kỳ vọng trong tầm giá"]
};
const reviewOpeners = ["Sau buổi chơi buổi sáng,", "Nhóm mình trải nghiệm và thấy", "Trong lần ghé sân này,", "Buổi chơi cuối tuần cho thấy", "Nhìn chung,"];
const reviewClosers = ["Hy vọng sân tiếp tục cải thiện.", "Thông tin này chỉ phục vụ kiểm thử giao diện.", "Đây là nhận xét minh họa cho dữ liệu thử nghiệm.", "Mỗi người chơi có thể có trải nghiệm khác nhau.", "Review mẫu, không đại diện cho khách hàng thật."];

const userData = index => ({
    _id: objectId(`user-${index + 1}`),
    fullName: names[index],
    email: `review.demo.${String(index + 1).padStart(3, "0")}@example.invalid`,
    role: "USER",
    status: "ACTIVE"
});

let credentials;
try {
    credentials = JSON.parse(await readFile(credentialFile, "utf8"));
    if (credentials.version !== 1 || !Array.isArray(credentials.accounts) || credentials.accounts.length !== 100) throw new Error("Invalid demo review credentials file.");
} catch (error) {
    if (error.code !== "ENOENT") throw error;
    credentials = {
        version: 1,
        accounts: names.map((fullName, index) => ({
            ...userData(index),
            password: randomBytes(18).toString("base64url")
        }))
    };
    await writeFile(credentialFile, `${JSON.stringify(credentials, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

try {
    await mongoose.connect(values["mongo-url"], { serverSelectionTimeoutMS: 5000 });
    const courts = await Court.find({ status: "AVAILABLE" }).sort({ _id: 1 }).lean();
    if (!courts.length) throw new Error("No available courts found; seed at least one court before demo reviews.");

    const operations = [];
    for (let index = 0; index < 100; index++) {
        const expected = userData(index);
        const account = credentials.accounts[index];
        if (account._id !== expected._id || account.email !== expected.email || account.fullName !== expected.fullName || typeof account.password !== "string" || account.password.length < 16) {
            throw new Error("Demo review credentials do not match reserved account IDs and names.");
        }
        const existingUser = await User.findOne({ $or: [{ _id: expected._id }, { email: expected.email }] }).lean();
        if (existingUser && (String(existingUser._id) !== expected._id || existingUser.email !== expected.email || existingUser.fullName !== expected.fullName || existingUser.role !== "USER" || !await bcrypt.compare(account.password, existingUser.password))) {
            throw new Error(`Reserved demo review user conflicts with existing data: ${expected.email}`);
        }
        if (!existingUser) operations.push(User.updateOne({ _id: expected._id }, { $setOnInsert: { ...expected, password: await bcrypt.hash(account.password, 12) } }, { upsert: true, runValidators: true }));
    }

    const ratingOrder = Array.from({ length: 100 }, (_, index) => index).sort((a, b) => objectId(`rating-${a}`).localeCompare(objectId(`rating-${b}`)));
    const ratings = Array(100);
    ratingOrder.forEach((index, rank) => { ratings[index] = (rank % 5) + 1; });
    const baseDate = new Date();
    baseDate.setUTCHours(0, 0, 0, 0);
    for (let index = 0; index < 100; index++) {
        const account = credentials.accounts[index];
        const court = courts[index % courts.length];
        const rating = ratings[index];
        const bookingId = objectId(`booking-${index + 1}`);
        const reviewId = objectId(`review-${index + 1}`);
        const bookingCode = `DMR-${String(index + 1).padStart(4, "0")}`;
        const bookingDate = new Date(baseDate.getTime() - (index + 3) * 86400000).toISOString().slice(0, 10);
        const detail = reviewDetails[rating][Math.floor(index / 5) % reviewDetails[rating].length];
        const comment = `${reviewOpeners[index % reviewOpeners.length]} ${detail}. ${reviewClosers[Math.floor(index / reviewOpeners.length) % reviewClosers.length]}`;
        const booking = {
            _id: bookingId,
            bookingCode,
            userId: account._id,
            courtId: court._id,
            bookingDate,
            startTime: "08:00",
            endTime: "09:00",
            durationHours: 1,
            courtPrice: court.pricePerHour,
            equipmentPrice: 0,
            systemFee: 0,
            totalPrice: court.pricePerHour,
            paymentStatus: "PAID",
            paymentMethod: "CASH",
            paidAt: new Date(new Date(bookingDate).getTime() + 4 * 3600000),
            status: "COMPLETED",
            reservationState: "COMMITTED",
            note: `[${seedTag}]`
        };
        const review = {
            _id: reviewId,
            userId: account._id,
            courtId: court._id,
            bookingId,
            rating,
            comment,
            images: [],
            status: "APPROVED",
            createdAt: new Date(new Date(bookingDate).getTime() + 5 * 3600000),
            updatedAt: new Date(new Date(bookingDate).getTime() + 5 * 3600000)
        };
        const [existingBooking, existingReview] = await Promise.all([
            Booking.findOne({ $or: [{ _id: bookingId }, { bookingCode }] }).lean(),
            Review.findById(reviewId).lean()
        ]);
        if (existingBooking && (String(existingBooking._id) !== bookingId || existingBooking.note !== `[${seedTag}]` || String(existingBooking.userId) !== account._id)) {
            throw new Error(`Reserved demo booking conflicts with existing data: ${bookingCode}`);
        }
        if (existingReview && (String(existingReview.bookingId) !== bookingId || String(existingReview.userId) !== account._id || ![comment, `Dữ liệu demo: ${comment}`].includes(existingReview.comment))) {
            throw new Error(`Reserved demo review conflicts with existing data: ${reviewId}`);
        }
        if (!existingBooking) operations.push(Booking.updateOne({ _id: bookingId }, { $setOnInsert: booking }, { upsert: true, runValidators: true }));
        if (!existingReview) operations.push(Review.updateOne({ _id: reviewId }, { $setOnInsert: review }, { upsert: true, runValidators: true, timestamps: false }));
        else if (existingReview.comment !== comment) operations.push(Review.updateOne({ _id: reviewId, comment: existingReview.comment }, { $set: { comment } }, { timestamps: false }));
    }

    await Promise.all(operations);
    for (const court of courts) {
        const approved = await Review.aggregate([
            { $match: { courtId: court._id, status: "APPROVED" } },
            { $group: { _id: null, count: { $sum: 1 }, average: { $avg: "$rating" } } }
        ]);
        await Court.updateOne({ _id: court._id }, { $set: { reviewCount: approved[0]?.count || 0, averageRating: Number((approved[0]?.average || 0).toFixed(1)) } });
    }

    const result = await Review.aggregate([
        { $match: { _id: { $in: Array.from({ length: 100 }, (_, i) => new mongoose.Types.ObjectId(objectId(`review-${i + 1}`))) } } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    console.log(JSON.stringify({ database: mongoose.connection.name, demoAccounts: 100, demoBookings: 100, demoReviews: result.reduce((sum, row) => sum + row.count, 0), ratings: result, courtsCovered: courts.length, credentialsFile: credentialFile.pathname }, null, 2));
} catch (error) {
    console.error("Demo review seed failed:", error.name, error.code || "", error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
