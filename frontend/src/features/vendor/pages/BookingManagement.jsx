import { useState, useEffect } from "react";
import { vendorService } from "@/services/vendor.service";

const statusColors = {
    PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    CONFIRMED: "bg-blue-50 text-blue-700 border border-blue-200",
    COMPLETED: "bg-green-50 text-green-700 border border-green-200",
    CANCELLED: "bg-red-50 text-red-700 border border-red-200",
};

const prepColors = {
    true: "bg-green-50 text-green-700 border border-green-200",
    false: "bg-yellow-50 text-yellow-700 border border-yellow-200",
};

export default function VendorBookingManagement() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [selectedBooking, setSelectedBooking] = useState(null);

    // States for returning equipment
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [returnItems, setReturnItems] = useState([]);

    useEffect(() => {
        fetchBookings();
    }, [statusFilter]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const res = await vendorService.getBookings(statusFilter);
            setBookings(res.bookings || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrepare = async (id) => {
        if (!window.confirm("Xác nhận đã chuẩn bị đầy đủ thiết bị cho thuê của đơn hàng này?")) return;
        try {
            await vendorService.prepareBooking(id);
            alert("Đã cập nhật trạng thái chuẩn bị hàng thành công!");
            fetchBookings();
            if (selectedBooking && selectedBooking._id === id) {
                setSelectedBooking(prev => ({ ...prev, isPrepared: true }));
            }
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        }
    };

    const startReturnProcess = () => {
        if (!selectedBooking || !selectedBooking.rentedEquipments) return;
        
        const itemsToReturn = selectedBooking.rentedEquipments.map(item => ({
            equipmentId: item.equipmentId?._id || item.equipmentId,
            name: item.equipmentId?.name || "Thiết bị",
            quantity: item.quantity,
            status: "RETURNED"
        }));
        
        setReturnItems(itemsToReturn);
        setReturnModalOpen(true);
    };

    const handleReturnConfirm = async (e) => {
        e.preventDefault();
        try {
            await vendorService.returnEquipment(selectedBooking._id, returnItems);
            alert("Xử lý trả thiết bị thuê và cập nhật kho hàng thành công!");
            setReturnModalOpen(false);
            setSelectedBooking(null);
            fetchBookings();
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        }
    };

    const updateReturnItemStatus = (equipmentId, status) => {
        setReturnItems(prev => prev.map(item => 
            item.equipmentId === equipmentId ? { ...item, status } : item
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản lý Đơn hàng</h1>
                    <p className="text-gray-500 mt-1">Quản lý lịch đặt sân và xác nhận chuẩn bị thiết bị thuê đi kèm</p>
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                    <option value="">Tất cả trạng thái đặt</option>
                    <option value="PENDING">Chờ xử lý (PENDING)</option>
                    <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
                    <option value="COMPLETED">Đã hoàn tất (COMPLETED)</option>
                    <option value="CANCELLED">Đã hủy (CANCELLED)</option>
                </select>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-lg">Chưa có đơn hàng nào.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Mã đơn</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Khách hàng</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Sân đặt</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Thời gian đặt</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Thuê đồ</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Trạng thái đặt</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Chuẩn bị đồ</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((booking) => (
                                    <tr key={booking._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-3 px-4 font-bold text-gray-900">{booking.bookingCode}</td>
                                        <td className="py-3 px-4 text-gray-700">
                                            <div>
                                                <p className="font-semibold">{booking.userId?.fullName}</p>
                                                <p className="text-xs text-gray-500">{booking.userId?.phone}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 font-medium">{booking.courtId?.name}</td>
                                        <td className="py-3 px-4 text-gray-600">
                                            <div>
                                                <p className="font-semibold">{booking.bookingDate}</p>
                                                <p className="text-xs text-primary font-bold">{booking.startTime} - {booking.endTime}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {booking.equipmentPrice > 0 ? (
                                                <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-xs font-bold">
                                                    Có ({booking.rentedEquipments?.length || 0} món)
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">Không</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[booking.status]}`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {booking.equipmentPrice > 0 ? (
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${prepColors[booking.isPrepared]}`}>
                                                    {booking.isPrepared ? "Xong" : "Chờ chuẩn bị"}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedBooking(booking)}
                                                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                                                >
                                                    Chi tiết
                                                </button>
                                                {booking.equipmentPrice > 0 && !booking.isPrepared && (
                                                    <button
                                                        onClick={() => handlePrepare(booking._id)}
                                                        className="px-3 py-1 bg-primary text-white hover:bg-primary/95 rounded-lg text-xs font-bold"
                                                    >
                                                        Chuẩn bị hàng
                                                    </button>
                                                )}
                                                {booking.equipmentPrice > 0 && booking.isPrepared && (
                                                    <span className="text-green-600 text-xs font-bold flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                        Sẵn sàng
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Booking Detail Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-soft">
                        <div className="px-6 py-4 bg-ink text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">Chi tiết đơn hàng #{selectedBooking.bookingCode}</h3>
                                <p className="text-xs text-white/70">Đặt lúc: {new Date(selectedBooking.createdAt).toLocaleString("vi-VN")}</p>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="p-1 hover:bg-white/10 rounded-lg">
                                <span className="material-symbols-outlined text-white">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* User details */}
                            <div className="space-y-1">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Khách hàng</h4>
                                <p className="text-sm font-bold text-gray-800">{selectedBooking.userId?.fullName}</p>
                                <p className="text-xs text-gray-500">SĐT: {selectedBooking.userId?.phone} | Email: {selectedBooking.userId?.email}</p>
                            </div>

                            {/* Booking details */}
                            <div className="space-y-1 pt-2 border-t border-gray-50">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Thông tin đặt sân</h4>
                                <p className="text-sm font-bold text-gray-800">{selectedBooking.courtId?.name}</p>
                                <p className="text-xs text-gray-500">
                                    Ngày: <span className="font-bold text-gray-700">{selectedBooking.bookingDate}</span>
                                    {" · "}
                                    Giờ: <span className="font-bold text-primary">{selectedBooking.startTime} - {selectedBooking.endTime}</span>
                                </p>
                            </div>

                            {/* Equipment preparation status if rented */}
                            {selectedBooking.equipmentPrice > 0 && (
                                <div className="space-y-1.5 pt-2 border-t border-gray-50">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Chuẩn bị thiết bị (Thuê tại sân)</h4>
                                    <p className="text-xs text-gray-700">
                                        <span className="font-semibold">Trạng thái:</span>{" "}
                                        <span className={`font-bold ${selectedBooking.isPrepared ? "text-green-600" : "text-amber-500"}`}>
                                            {selectedBooking.isPrepared ? "Đã chuẩn bị xong" : "Đang chờ chuẩn bị"}
                                        </span>
                                    </p>
                                </div>
                            )}

                            {/* Rented Equipments List */}
                            {selectedBooking.equipmentPrice > 0 && (
                                <div className="space-y-2 pt-2 border-t border-gray-50">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Dụng cụ thuê kèm</h4>
                                    <div className="space-y-1.5">
                                        {selectedBooking.rentedEquipments?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                                <div className="flex items-center gap-2">
                                                    {item.equipmentId?.image && <img src={item.equipmentId.image} alt="" className="w-8 h-8 rounded object-cover" />}
                                                    <div>
                                                        <p className="font-bold text-gray-800">{item.equipmentId?.name}</p>
                                                        <p className="text-[10px] text-gray-400">Đơn giá: {item.rentalPrice?.toLocaleString()}đ</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-gray-900">x{item.quantity}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                        item.returnStatus === "RETURNED" ? "bg-green-100 text-green-700" :
                                                        item.returnStatus === "DAMAGED" ? "bg-red-100 text-red-700" :
                                                        item.returnStatus === "LOST" ? "bg-gray-100 text-gray-700" :
                                                        "bg-amber-100 text-amber-700 animate-pulse"
                                                    }`}>
                                                        {item.returnStatus === "RENTING" ? "Đang thuê" :
                                                         item.returnStatus === "RETURNED" ? "Đã trả" :
                                                         item.returnStatus === "DAMAGED" ? "Hỏng" : "Mất"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Total price details */}
                            <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
                                <span className="text-sm font-bold text-gray-900">Tổng thanh toán:</span>
                                <span className="text-lg font-black text-primary">{selectedBooking.totalPrice?.toLocaleString("vi-VN")}đ</span>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="flex-1 py-2 border rounded-xl font-bold text-xs text-gray-700 bg-white hover:bg-gray-100"
                            >
                                Đóng
                            </button>
                            {selectedBooking.equipmentPrice > 0 && !selectedBooking.isPrepared && (
                                <button
                                    onClick={() => handlePrepare(selectedBooking._id)}
                                    className="flex-1 py-2 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90"
                                >
                                    Xác nhận chuẩn bị xong
                                </button>
                            )}
                            {selectedBooking.equipmentPrice > 0 && 
                             ["CONFIRMED", "COMPLETED"].includes(selectedBooking.status) &&
                             selectedBooking.rentedEquipments?.some(item => item.returnStatus === "RENTING") && (
                                <button
                                    onClick={startReturnProcess}
                                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[16px]">assignment_return</span>
                                    <span>Nghiệm thu trả đồ</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Return Equipment Modal */}
            {returnModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-gray-100">
                        <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 text-amber-800 flex justify-between items-center">
                            <h3 className="font-bold text-xs flex items-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                                Nghiệm thu trả thiết bị thuê
                            </h3>
                            <button onClick={() => setReturnModalOpen(false)} className="text-amber-600 hover:text-amber-800">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleReturnConfirm} className="p-5 space-y-4">
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {returnItems.map((item) => (
                                    <div key={item.equipmentId} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-gray-800">{item.name}</span>
                                            <span className="font-black text-gray-600 bg-gray-200 px-2 py-0.5 rounded">x{item.quantity}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: "Bình thường", value: "RETURNED" },
                                                { label: "Bị hỏng", value: "DAMAGED" },
                                                { label: "Bị mất", value: "LOST" }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => updateReturnItemStatus(item.equipmentId, opt.value)}
                                                    className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                                                        item.status === opt.value
                                                            ? opt.value === "RETURNED" ? "bg-green-500 border-green-500 text-white"
                                                              : opt.value === "DAMAGED" ? "bg-red-500 border-red-500 text-white"
                                                              : "bg-gray-500 border-gray-500 text-white"
                                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setReturnModalOpen(false)}
                                    className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold bg-white hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-colors shadow-sm"
                                >
                                    Xác nhận &amp; Nhận trả đồ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
