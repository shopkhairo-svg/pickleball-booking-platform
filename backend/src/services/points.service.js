import UserPointsWallet from "../models/userPointsWallet.model.js";
import PointTransaction from "../models/pointTransaction.model.js";

const POINT_TO_VND = parseInt(process.env.POINT_TO_VND || "1000", 10);

class PointsService {
    async getWallet(userId) {
        if (!userId) throw new Error("Thiếu mã người dùng!");

        let wallet = await UserPointsWallet.findOne({ userId });
        if (!wallet) {
            wallet = await UserPointsWallet.create({ userId });
        }

        return {
            wallet,
            pointToVnd: POINT_TO_VND
        };
    }

    async earn(userId, points, reference = {}) {
        const safePoints = parseInt(points, 10);
        if (!safePoints || safePoints <= 0) throw new Error("Số điểm cộng không hợp lệ!");

        const wallet = await UserPointsWallet.findOneAndUpdate(
            { userId },
            {
                $inc: {
                    balance: safePoints,
                    lifetimeEarned: safePoints
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        await PointTransaction.create({
            userId,
            type: "EARN",
            points: safePoints,
            moneyValue: safePoints * POINT_TO_VND,
            referenceId: reference.referenceId || null,
            referenceType: reference.referenceType || null,
            description: reference.description || "Cộng điểm tích lũy"
        });

        return wallet;
    }

    async spend(userId, points, reference = {}) {
        const safePoints = parseInt(points, 10);
        if (!safePoints || safePoints <= 0) {
            return {
                pointsUsed: 0,
                discountAmount: 0,
                wallet: (await this.getWallet(userId)).wallet
            };
        }

        const { wallet } = await this.getWallet(userId);
        if (wallet.balance < safePoints) {
            throw new Error(`Ví điểm chỉ còn ${wallet.balance} điểm, không đủ để sử dụng!`);
        }

        wallet.balance -= safePoints;
        wallet.lifetimeSpent += safePoints;
        await wallet.save();

        const discountAmount = safePoints * POINT_TO_VND;
        await PointTransaction.create({
            userId,
            type: "SPEND",
            points: -safePoints,
            moneyValue: discountAmount,
            referenceId: reference.referenceId || null,
            referenceType: reference.referenceType || null,
            description: reference.description || "Sử dụng điểm khi đặt sân"
        });

        return {
            pointsUsed: safePoints,
            discountAmount,
            wallet
        };
    }

    async refund(userId, points, reference = {}) {
        const safePoints = parseInt(points, 10);
        if (!safePoints || safePoints <= 0) return null;

        const wallet = await UserPointsWallet.findOneAndUpdate(
            { userId },
            { $inc: { balance: safePoints } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        await PointTransaction.create({
            userId,
            type: "REFUND",
            points: safePoints,
            moneyValue: safePoints * POINT_TO_VND,
            referenceId: reference.referenceId || null,
            referenceType: reference.referenceType || null,
            description: reference.description || "Hoàn điểm"
        });

        return wallet;
    }

    async getTransactions(userId, limit = 20) {
        return await PointTransaction.find({ userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit, 10) || 20);
    }
}

export { POINT_TO_VND };
export default new PointsService();
