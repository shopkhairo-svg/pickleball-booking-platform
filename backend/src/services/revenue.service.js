import Wallet from "../models/wallet.model.js";
import WalletTransaction from "../models/walletTransaction.model.js";
import RevenueLog from "../models/revenueLog.model.js";

class RevenueService {
    async getSystemWallet() {
        return await Wallet.findOneAndUpdate(
            { ownerType: "SYSTEM" },
            { $setOnInsert: { ownerType: "SYSTEM" } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    }

    async holdBookingRevenue(booking) {
        const wallet = await this.getSystemWallet();
        const existing = await RevenueLog.findOne({ bookingId: booking._id });
        if (existing) return existing;

        wallet.pendingBalance += booking.totalPrice;
        await wallet.save();

        await WalletTransaction.create({
            walletId: wallet._id,
            bookingId: booking._id,
            type: "HOLD",
            amount: booking.totalPrice,
            status: "PENDING",
            description: `Giữ tiền đơn ${booking.bookingCode}`
        });

        return await RevenueLog.create({
            bookingId: booking._id,
            userId: booking.userId,
            courtId: booking.courtId,
            amount: booking.totalPrice,
            status: "HOLDING"
        });
    }

    async releaseBookingRevenue(booking) {
        const wallet = await this.getSystemWallet();
        const revenueLog = await RevenueLog.findOne({ bookingId: booking._id });
        if (!revenueLog || revenueLog.status === "AVAILABLE") return revenueLog;

        wallet.pendingBalance = Math.max(0, wallet.pendingBalance - revenueLog.amount);
        wallet.availableBalance += revenueLog.amount;
        await wallet.save();

        revenueLog.status = "AVAILABLE";
        revenueLog.releasedAt = new Date();
        await revenueLog.save();

        await WalletTransaction.create({
            walletId: wallet._id,
            bookingId: booking._id,
            type: "RELEASE",
            amount: revenueLog.amount,
            status: "AVAILABLE",
            description: `Ghi nhận doanh thu khả dụng cho đơn ${booking.bookingCode}`
        });

        return revenueLog;
    }

    async refundBookingRevenue(booking) {
        const wallet = await this.getSystemWallet();
        const revenueLog = await RevenueLog.findOne({ bookingId: booking._id });
        if (!revenueLog || ["REFUNDED", "CANCELLED"].includes(revenueLog.status)) return revenueLog;

        if (revenueLog.status === "HOLDING") {
            wallet.pendingBalance = Math.max(0, wallet.pendingBalance - revenueLog.amount);
        } else if (revenueLog.status === "AVAILABLE") {
            wallet.availableBalance = Math.max(0, wallet.availableBalance - revenueLog.amount);
        }
        wallet.refundedBalance += revenueLog.amount;
        await wallet.save();

        revenueLog.status = booking.paymentStatus === "PAID" ? "REFUNDED" : "CANCELLED";
        revenueLog.refundedAt = new Date();
        await revenueLog.save();

        await WalletTransaction.create({
            walletId: wallet._id,
            bookingId: booking._id,
            type: "REFUND",
            amount: revenueLog.amount,
            status: "REFUNDED",
            description: `Hoàn/hủy dòng tiền đơn ${booking.bookingCode}`
        });

        return revenueLog;
    }

    async getCashFlowStats() {
        const wallet = await this.getSystemWallet();
        const transactions = await WalletTransaction.find()
            .populate("bookingId", "bookingCode status paymentStatus")
            .sort({ createdAt: -1 })
            .limit(30);

        return {
            pendingBalance: wallet.pendingBalance,
            availableBalance: wallet.availableBalance,
            refundedBalance: wallet.refundedBalance,
            transactions
        };
    }
}

export default new RevenueService();
