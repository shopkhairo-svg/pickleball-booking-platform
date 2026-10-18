// src/features/vendor/pages/EquipmentManagement.jsx
import { useState, useEffect } from "react";
import { vendorService } from "@/services/vendor.service";

const orderStatusColors = {
    PENDING: "bg-amber-100 text-amber-700 border border-amber-200",
    CONFIRMED: "bg-blue-100 text-blue-700 border border-blue-200",
    COMPLETED: "bg-green-100 text-green-700 border border-green-200",
    CANCELLED: "bg-red-100 text-red-700 border border-red-200",
};

const orderStatusLabels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã từ chối/hủy",
};

const deliveryStatusColors = {
    PENDING: "bg-amber-100 text-amber-700 border border-amber-200",
    PICKED_UP: "bg-blue-100 text-blue-700 border border-blue-200",
    SHIPPED: "bg-purple-100 text-purple-700 border border-purple-200 animate-pulse",
    COMPLETED: "bg-green-100 text-green-700 border border-green-200",
    CANCELLED: "bg-red-100 text-red-700 border border-red-200",
};

const deliveryStatusLabels = {
    PENDING: "Chờ lấy hàng",
    PICKED_UP: "Đang giao",
    SHIPPED: "Chờ xác nhận giao",
    COMPLETED: "Đã nhận hàng",
    CANCELLED: "Đã hủy",
};

const typeLabels = {
    PADDLE: "Vợt",
    BALL: "Bóng",
    ACCESSORY: "Phụ kiện",
};

// MODAL: GÁN SHIPPER
const AssignShipperModal = ({ order, onClose, onSave }) => {
    const [shippers, setShippers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedShipperId, setSelectedShipperId] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchShippers = async () => {
            try {
                const res = await vendorService.getShippers();
                setShippers(res.shippers || []);
                if (res.shippers && res.shippers.length > 0) {
                    setSelectedShipperId(res.shippers[0]._id);
                }
            } catch (err) {
                console.error("Lỗi khi lấy danh sách shipper", err);
            } finally {
                setLoading(false);
            }
        };
        fetchShippers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedShipperId) {
            alert("Vui lòng chọn 1 shipper!");
            return;
        }
        setSaving(true);
        try {
            await vendorService.assignShipper(order._id, selectedShipperId);
            alert("Gán shipper giao hàng thành công!");
            onSave();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-bold text-gray-800">Gán Shipper Vận Chuyển</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Shipper khả dụng *</label>
                        {loading ? (
                            <p className="text-sm text-gray-400">Đang tải danh sách shipper...</p>
                        ) : shippers.length === 0 ? (
                            <p className="text-sm text-red-500 font-bold">Không tìm thấy shipper nào đang hoạt động trên hệ thống!</p>
                        ) : (
                            <select
                                required
                                value={selectedShipperId}
                                onChange={(e) => setSelectedShipperId(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                {shippers.map((s) => (
                                    <option key={s._id} value={s._id}>
                                        {s.fullName} ({s.phone || "Không SĐT"})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">
                            Hủy bỏ
                        </button>
                        <button type="submit" disabled={saving || shippers.length === 0} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium disabled:opacity-50">
                            {saving ? "Đang xử lý..." : "Xác nhận gán"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// MODAL: XEM LỘ TRÌNH VÀ XÁC NHẬN HOÀN THÀNH VẬN CHUYỂN
const ViewProofModal = ({ order, onClose, onConfirm }) => {
    const [confirming, setConfirming] = useState(false);

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            await vendorService.confirmDeliveryCompleted(order.delivery._id);
            alert("Xác nhận giao nhận hoàn tất! Tồn kho hệ thống đã được cập nhật.");
            onConfirm();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        } finally {
            setConfirming(false);
        }
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const delivery = order.delivery || {};
    const status = delivery.status || "PENDING";

    const milestones = [
        {
            label: "Khởi tạo vận đơn",
            time: formatDateTime(delivery.assignedAt || order.createdAt),
            isDone: !!(delivery.assignedAt || order.createdAt),
            desc: `Shipper ${delivery.shipperId?.fullName || "được chỉ định"} nhận bàn giao vận đơn.`
        },
        {
            label: "Shipper đã lấy hàng",
            time: formatDateTime(delivery.pickedUpAt),
            isDone: ["PICKED_UP", "SHIPPED", "COMPLETED"].includes(status),
            desc: "Đã bốc xếp hàng lên phương tiện vận chuyển."
        },
        {
            label: "Giao hàng thành công",
            time: formatDateTime(delivery.shippedAt),
            isDone: ["SHIPPED", "COMPLETED"].includes(status),
            desc: "Hàng đã đến sân đích và shipper đã cập nhật ảnh chụp xác minh."
        },
        {
            label: "Hoàn thành đối soát",
            time: formatDateTime(delivery.completedAt),
            isDone: status === "COMPLETED",
            desc: "Vendor xác thực chất lượng hàng nhận bàn giao và lưu kho."
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-3.5">
                    <h3 className="text-base font-bold text-gray-800">Thông tin lộ trình vận chuyển</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-lg">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="space-y-4 text-xs text-gray-600">
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-1.5">
                        <p><strong>Người giao hàng (Shipper):</strong> {delivery.shipperId?.fullName || "Chưa gán"}</p>
                        <p><strong>Số điện thoại:</strong> {delivery.shipperId?.phone || "N/A"}</p>
                        {delivery.notes && (
                            <p className="mt-1 text-gray-500"><strong>Ghi chú:</strong> {delivery.notes}</p>
                        )}
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3.5">
                        <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Lịch trình chi tiết</p>
                        <div className="relative border-l-2 border-gray-100 ml-3 pl-6 space-y-5">
                            {milestones.map((m, idx) => (
                                <div key={idx} className="relative">
                                    <span className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                                        m.isDone ? "bg-primary border-primary" : "bg-white border-gray-200"
                                    }`}>
                                        {m.isDone && (
                                            <span className="block h-1.5 w-1.5 rounded-full bg-white"></span>
                                        )}
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xs font-bold ${m.isDone ? "text-gray-800" : "text-gray-400"}`}>
                                                {m.label}
                                            </p>
                                            {m.time && (
                                                <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                                                    {m.time}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{m.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {delivery.proofImage && (
                        <div className="space-y-2 pt-1">
                            <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Ảnh bằng chứng giao nhận</p>
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center max-h-[220px]">
                                <img src={delivery.proofImage} alt="Bằng chứng giao hàng" className="object-contain max-h-[220px] w-full" />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-3 border-t">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold transition-colors">
                            Đóng
                        </button>
                        {delivery.status === "SHIPPED" && (
                            <button type="button" onClick={handleConfirm} disabled={confirming} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5 transition-colors">
                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                {confirming ? "Đang xác nhận..." : "Xác nhận hoàn thành"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function VendorEquipmentManagement() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState(null); 
    const [selectedOrderForShipper, setSelectedOrderForShipper] = useState(null);
    const [selectedOrderForProof, setSelectedOrderForProof] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await vendorService.getImportOrders();
            setOrders(res.orders || []);
        } catch (err) {
            console.error("Lỗi khi tải danh sách đơn cung cấp", err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (id) => {
        setActioning(id);
        try {
            await vendorService.confirmImportOrder(id);
            alert("Xác nhận cung cấp đơn hàng thành công! Hãy gán shipper để giao.");
            fetchOrders();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        } finally {
            setActioning(null);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn từ chối/hủy đơn hàng này?")) return;
        setActioning(id);
        try {
            await vendorService.cancelImportOrder(id);
            alert("Đã hủy đơn hàng!");
            fetchOrders();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        } finally {
            setActioning(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Cung cấp Thiết bị & Dụng cụ</h1>
                <p className="text-gray-500 mt-1">Quản lý các yêu cầu cung cấp dụng cụ, thiết bị, chỉ định shipper và xác nhận hoàn thành giao nhận</p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">local_shipping</span>
                        <p className="text-lg">Chưa có yêu cầu cung cấp thiết bị nào được gửi tới bạn.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-3.5 px-4 font-medium text-gray-500">Dụng cụ / Thiết bị</th>
                                    <th className="text-left py-3.5 px-4 font-medium text-gray-500">Phân loại</th>
                                    <th className="text-center py-3.5 px-4 font-medium text-gray-500">Số lượng</th>
                                    <th className="text-left py-3.5 px-4 font-medium text-gray-500">Người yêu cầu (Admin)</th>
                                    <th className="text-left py-3.5 px-4 font-medium text-gray-500">Shipper</th>
                                    <th className="text-center py-3.5 px-4 font-medium text-gray-500">Trạng thái đơn</th>
                                    <th className="text-center py-3.5 px-4 font-medium text-gray-500">Trạng thái giao nhận</th>
                                    <th className="text-center py-3.5 px-4 font-medium text-gray-500">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-4 px-4 font-bold text-gray-800">
                                            {order.equipmentId?.name || <span className="text-gray-400 font-normal">Dụng cụ đã bị xóa</span>}
                                        </td>
                                        <td className="py-4 px-4 text-gray-600">
                                            {typeLabels[order.equipmentId?.type] || order.equipmentId?.type || "-"}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-800 font-bold rounded-lg text-xs">
                                                {order.quantity}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="font-semibold text-gray-700">{order.adminId?.fullName}</span>
                                            <p className="text-xs text-gray-400">{order.adminId?.email}</p>
                                        </td>
                                        <td className="py-4 px-4 text-gray-700">
                                            {order.delivery?.shipperId ? (
                                                <div className="space-y-1">
                                                    <span className="font-semibold">{order.delivery.shipperId.fullName}</span>
                                                    <p className="text-xs text-gray-400">{order.delivery.shipperId.phone}</p>
                                                    <button
                                                        onClick={() => setSelectedOrderForProof(order)}
                                                        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline mt-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">track_changes</span>
                                                        Xem lộ trình giao
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Chưa chỉ định</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${orderStatusColors[order.status]}`}>
                                                {orderStatusLabels[order.status]}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {order.delivery ? (
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${deliveryStatusColors[order.delivery.status]}`}>
                                                    {deliveryStatusLabels[order.delivery.status]}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {order.status === "PENDING" && (
                                                    <>
                                                        <button
                                                            disabled={actioning !== null}
                                                            onClick={() => handleConfirm(order._id)}
                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
                                                        >
                                                            Xác nhận
                                                        </button>
                                                        <button
                                                            disabled={actioning !== null}
                                                            onClick={() => handleCancel(order._id)}
                                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-xs transition-colors"
                                                        >
                                                            Từ chối
                                                        </button>
                                                    </>
                                                )}
                                                {order.status === "CONFIRMED" && (
                                                    <>
                                                        {(!order.delivery || !order.delivery.shipperId) ? (
                                                            <button
                                                                onClick={() => setSelectedOrderForShipper(order)}
                                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                                                                Gán Shipper
                                                            </button>
                                                        ) : order.delivery.status === "SHIPPED" ? (
                                                            <button
                                                                onClick={() => setSelectedOrderForProof(order)}
                                                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">verified</span>
                                                                Duyệt giao nhận
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-500 font-medium">Đang giao...</span>
                                                        )}
                                                        <button
                                                            disabled={actioning !== null}
                                                            onClick={() => handleCancel(order._id)}
                                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-xs transition-colors"
                                                        >
                                                            Hủy đơn
                                                        </button>
                                                    </>
                                                )}
                                                {["COMPLETED", "CANCELLED"].includes(order.status) && (
                                                    <span className="text-gray-400 text-xs">-</span>
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

            {selectedOrderForShipper && (
                <AssignShipperModal
                    order={selectedOrderForShipper}
                    onClose={() => setSelectedOrderForShipper(null)}
                    onSave={() => { setSelectedOrderForShipper(null); fetchOrders(); }}
                />
            )}

            {selectedOrderForProof && (
                <ViewProofModal
                    order={selectedOrderForProof}
                    onClose={() => setSelectedOrderForProof(null)}
                    onConfirm={() => { setSelectedOrderForProof(null); fetchOrders(); }}
                />
            )}
        </div>
    );
}
