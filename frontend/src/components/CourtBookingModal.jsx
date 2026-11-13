import { useState } from "react";
import { Link } from "react-router-dom";
import { userService } from "@/services/user.service";

export default function CourtBookingModal({ court, slot, date, onClose, onBooked }) {
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [booking, setBooking] = useState(null);
    const minutes = time => time.split(":").reduce((h, m) => Number(h) * 60 + Number(m));
    const price = Math.round(court.pricePerHour * (minutes(slot.endTime) - minutes(slot.time)) / 60);
    const fee = Math.round(price * 0.05);
    const submit = async e => {
        e.preventDefault();
        if (busy || booking) return;
        setBusy(true); setError("");
        try {
            const result = await userService.createBooking({ slotId: slot.slotId, note, paymentMethod: "CASH" });
            setBooking(result);
            onBooked(slot.slotId);
        } catch (err) { setError(err.response?.data?.message || "Không thể đặt sân. Vui lòng thử lại."); }
        finally { setBusy(false); }
    };
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="booking-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
                <h2 id="booking-title" className="text-xl font-bold">{booking ? "Đã gửi yêu cầu đặt sân" : "Xác nhận đặt sân"}</h2>
                <button aria-label="Đóng" disabled={busy} onClick={onClose} className="p-2">✕</button>
            </div>
            <p className="mt-4 font-semibold">{court.name} · {slot.courtName}</p>
            <p className="mt-2">{date} · {slot.time}–{slot.endTime} (giờ Việt Nam)</p>
            {booking ? <div className="mt-6 space-y-4">
                <p>Mã đơn: <strong>{booking.bookingCode}</strong></p>
                <p>Đơn đang chờ quản trị viên xác nhận. Thanh toán tại sân: <strong>{booking.totalPrice.toLocaleString("vi-VN")}đ</strong>.</p>
                <p className="text-sm text-gray-600">Khi lịch được xác nhận, hệ thống sẽ gửi email nhắc trước giờ chơi 30 phút tới email tài khoản của bạn.</p>
                <Link className="block rounded-xl bg-primary p-3 text-center text-white" to="/user/profile">Xem lịch đặt sân</Link>
            </div> : <form onSubmit={submit} className="mt-6 space-y-4">
                <p>Tiền sân: {price.toLocaleString("vi-VN")}đ · Phí dịch vụ 5%: {fee.toLocaleString("vi-VN")}đ</p>
                <p className="font-bold">Tổng cộng: {(price + fee).toLocaleString("vi-VN")}đ — thanh toán tại sân</p>
                <label className="block">Ghi chú<textarea value={note} maxLength={1000} onChange={e => setNote(e.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label>
                <p className="text-sm text-gray-500">Thuê dụng cụ, ưu đãi và thanh toán online đang phát triển.</p>
                <p className="text-sm text-gray-600">Bạn có thể tự hủy trước giờ chơi ít nhất 36 tiếng. Nếu cần hủy sát giờ, hãy liên hệ sân.</p>
                {error && <p role="alert" className="text-red-600">{error}</p>}
                <button disabled={busy} className="w-full rounded-xl bg-primary p-3 font-bold text-white disabled:opacity-50">{busy ? "Đang đặt sân…" : "Đặt sân"}</button>
            </form>}
        </section>
    </div>;
}
