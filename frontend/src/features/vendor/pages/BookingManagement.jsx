import { useEffect, useState } from "react";
import { vendorService } from "@/services/vendor.service";

const statusLabels = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy" };
const paymentLabels = { UNPAID: "Chưa thanh toán", PAID: "Đã thanh toán", REFUND_PENDING: "Chờ hoàn tiền", REFUNDED: "Đã hoàn tiền" };
const money = value => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

export default function VendorBookingManagement() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selectedBooking, setSelectedBooking] = useState(null);

    useEffect(() => {
        let active = true;
        vendorService.getBookings(statusFilter)
            .then(res => { if (active) { setBookings(res.bookings || []); setError(""); } })
            .catch(err => { if (active) setError(err.response?.data?.message || "Không thể tải lịch đặt sân."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [statusFilter]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="admin-page-title">Lịch đặt sân</h1>
                    <p className="admin-page-subtitle">Theo dõi lịch chơi tại sân của bạn. Quản trị viên xử lý xác nhận, thu tiền và hoàn tiền.</p>
                </div>
                <select aria-label="Lọc trạng thái đơn" value={statusFilter}
                    onChange={event => { setLoading(true); setSelectedBooking(null); setStatusFilter(event.target.value); }}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm">
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            </div>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                {loading ? <p className="p-12 text-center text-gray-500">Đang tải lịch đặt sân...</p>
                    : error ? null : bookings.length === 0 ? <p className="p-12 text-center text-gray-500">Chưa có lịch đặt sân phù hợp.</p>
                        : <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-gray-500"><tr>
                                {['Mã đơn', 'Khách hàng', 'Sân', 'Ngày và giờ', 'Trạng thái', 'Thanh toán', ''].map(label => <th key={label} className="px-4 py-3">{label}</th>)}
                            </tr></thead>
                            <tbody>{bookings.map(booking => <tr key={booking._id} className="border-t border-gray-100">
                                <td className="px-4 py-3 font-semibold">{booking.bookingCode}</td>
                                <td className="px-4 py-3">{booking.userId?.fullName}<p className="text-xs text-gray-500">{booking.userId?.phone}</p></td>
                                <td className="px-4 py-3">{booking.courtId?.name}</td>
                                <td className="px-4 py-3">{booking.bookingDate}<p className="text-xs text-primary">{booking.startTime} – {booking.endTime}</p></td>
                                <td className="px-4 py-3">{statusLabels[booking.status] || booking.status}</td>
                                <td className="px-4 py-3">{paymentLabels[booking.paymentStatus] || booking.paymentStatus}<p className="text-xs">{money(booking.totalPrice)}</p></td>
                                <td className="px-4 py-3"><button onClick={() => setSelectedBooking(booking)} className="rounded-lg bg-gray-100 px-3 py-2 font-semibold">Chi tiết</button></td>
                            </tr>)}</tbody>
                        </table>}
            </div>
            {selectedBooking && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="vendor-booking-title">
                <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
                    <h2 id="vendor-booking-title" className="text-lg font-bold">Đơn {selectedBooking.bookingCode}</h2>
                    <dl className="my-5 space-y-3 text-sm">
                        <div><dt className="text-gray-500">Khách hàng</dt><dd>{selectedBooking.userId?.fullName} · {selectedBooking.userId?.phone}</dd><dd>{selectedBooking.userId?.email}</dd></div>
                        <div><dt className="text-gray-500">Sân và khung giờ</dt><dd>{selectedBooking.courtId?.name}</dd><dd>{selectedBooking.bookingDate} · {selectedBooking.startTime} – {selectedBooking.endTime}</dd></div>
                        <div><dt className="text-gray-500">Trạng thái</dt><dd>{statusLabels[selectedBooking.status]} · {paymentLabels[selectedBooking.paymentStatus]}</dd></div>
                        <div><dt className="text-gray-500">Tổng tiền</dt><dd className="font-bold text-primary">{money(selectedBooking.totalPrice)}</dd></div>
                        {selectedBooking.note && <div><dt className="text-gray-500">Ghi chú</dt><dd>{selectedBooking.note}</dd></div>}
                        {selectedBooking.cancelReason && <div><dt className="text-gray-500">Lý do hủy</dt><dd>{selectedBooking.cancelReason}</dd></div>}
                    </dl>
                    {selectedBooking.equipmentPrice > 0 && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Đơn cũ có dụng cụ thuê kèm. Chức năng chuẩn bị và trả dụng cụ đang phát triển; vui lòng liên hệ quản trị viên để đối soát.</p>}
                    <button onClick={() => setSelectedBooking(null)} className="w-full rounded-xl border border-gray-200 py-2 font-semibold">Đóng</button>
                </div>
            </div>}
        </div>
    );
}
