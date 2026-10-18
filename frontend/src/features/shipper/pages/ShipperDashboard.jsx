// src/features/shipper/pages/ShipperDashboard.jsx
import { useState, useEffect, useRef } from "react";
import shipperService from "@/services/shipper.service";

const deliveryStatusColors = {
    PENDING: "bg-amber-100 text-amber-700 border border-amber-200",
    PICKED_UP: "bg-blue-100 text-blue-700 border border-blue-200",
    SHIPPED: "bg-purple-100 text-purple-700 border border-purple-200 animate-pulse",
    COMPLETED: "bg-green-100 text-green-700 border border-green-200",
    CANCELLED: "bg-red-100 text-red-700 border border-red-200",
};

const deliveryStatusLabels = {
    PENDING: "Chờ lấy hàng (tại Vendor)",
    PICKED_UP: "Đang giao hàng (đến sân)",
    SHIPPED: "Đã giao (Chờ Vendor duyệt)",
    COMPLETED: "Đã hoàn thành",
    CANCELLED: "Đã hủy",
};

// MODAL BÁO CÁO GIAO HÀNG (CẦN UPLOAD ẢNH BẰNG CHỨNG)
const ReportDeliveryModal = ({ delivery, onClose, onSave }) => {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            alert("Bắt buộc phải tải lên hình ảnh bằng chứng giao hàng thành công!");
            return;
        }
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("status", "SHIPPED");
            formData.append("proofImage", file);
            if (notes) {
                formData.append("notes", notes);
            }

            await shipperService.updateDeliveryStatus(delivery._id, formData);
            alert("Giao hàng thành công! Đang chờ Vendor kiểm duyệt và hoàn thành.");
            onSave();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl border">
                <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-bold text-gray-800">Báo Cáo Giao Hàng Thành Công</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hình ảnh bằng chứng (Đã ký nhận/Đã bàn giao) *
                        </label>
                        <div 
                            onClick={() => fileInputRef.current.click()}
                            className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center cursor-pointer hover:border-primary bg-gray-50 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden"
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">add_a_photo</span>
                                    <p className="text-xs font-semibold text-gray-500">Chụp hoặc chọn ảnh từ thiết bị</p>
                                    <p className="text-[10px] text-gray-400 mt-1">Hỗ trợ JPG, PNG, WEBP</p>
                                </>
                            )}
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (nếu có)</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ghi chú người nhận hàng hoặc tình trạng thiết bị..."
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none text-sm"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">
                            Hủy bỏ
                        </button>
                        <button type="submit" disabled={submitting || !file} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                            {submitting ? "Đang gửi..." : "Gửi báo cáo"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function ShipperDashboard() {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("ACTIVE"); // ACTIVE hoặc HISTORY
    const [selectedDeliveryForProof, setSelectedDeliveryForProof] = useState(null);
    const [actioningId, setActioningId] = useState(null);

    useEffect(() => {
        fetchDeliveries();
    }, [activeTab]);

    const fetchDeliveries = async () => {
        try {
            setLoading(true);
            const res = await shipperService.getDeliveries({ status: activeTab });
            setDeliveries(res.deliveries || []);
        } catch (err) {
            console.error("Lỗi khi tải danh sách vận đơn", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePickUp = async (id) => {
        if (!window.confirm("Xác nhận bạn đã lấy dụng cụ/thiết bị từ kho của Vendor để bắt đầu giao?")) return;
        setActioningId(id);
        try {
            const formData = new FormData();
            formData.append("status", "PICKED_UP");
            await shipperService.updateDeliveryStatus(id, formData);
            alert("Lấy hàng thành công! Đang tiến hành giao tới cụm sân.");
            fetchDeliveries();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        } finally {
            setActioningId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản lý Đơn Giao Hàng</h1>
                    <p className="text-gray-500 mt-1">Theo dõi, nhận hàng tại nhà cung cấp và bàn giao thiết bị tới các cụm sân</p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("ACTIVE")}
                    className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
                        activeTab === "ACTIVE"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                    Đơn đang thực hiện
                </button>
                <button
                    onClick={() => setActiveTab("HISTORY")}
                    className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
                        activeTab === "HISTORY"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">history</span>
                    Lịch sử giao hàng
                </button>
            </div>

            {/* DELIVERIES LIST */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                </div>
            ) : deliveries.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">inbox</span>
                    <p className="text-lg">Không có vận đơn nào trong mục này</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {deliveries.map((d) => {
                        const order = d.importOrderId;
                        const equipment = order?.equipmentId;
                        const court = equipment?.courtId;
                        const vendor = order?.vendorId;

                        return (
                            <div key={d._id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden">
                                {/* Top Header of Card */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Mã vận đơn</span>
                                        <p className="text-xs font-mono font-bold text-gray-800">#{d._id}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${deliveryStatusColors[d.status]}`}>
                                        {deliveryStatusLabels[d.status]}
                                    </span>
                                </div>

                                {/* Equipment Info */}
                                <div className="bg-gray-50 rounded-xl p-3.5 flex items-center gap-3">
                                    {equipment?.image ? (
                                        <img src={equipment.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                            <span className="material-symbols-outlined">inventory_2</span>
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-gray-800">{equipment?.name || "Dụng cụ đã bị xóa"}</h4>
                                        <p className="text-xs text-gray-500">Số lượng: <span className="font-bold text-gray-700">{order?.quantity}</span></p>
                                    </div>
                                </div>

                                {/* Path Details */}
                                <div className="space-y-3 relative before:absolute before:left-3.5 before:top-4 before:bottom-4 before:border-l-2 before:border-dashed before:border-gray-200">
                                    {/* 1. VENDOR (Nơi lấy hàng) */}
                                    <div className="flex gap-3 text-xs">
                                        <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold z-10 flex-shrink-0">
                                            A
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">Lấy hàng tại (Vendor):</p>
                                            <p className="text-gray-700 font-semibold">{vendor?.fullName || "N/A"}</p>
                                            <p className="text-gray-500">SĐT: {vendor?.phone || "N/A"}</p>
                                        </div>
                                    </div>

                                    {/* 2. COURT (Nơi giao hàng) */}
                                    <div className="flex gap-3 text-xs">
                                        <div className="w-7 h-7 rounded-full bg-green-50 border border-green-200 text-green-700 flex items-center justify-center font-bold z-10 flex-shrink-0">
                                            B
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">Giao hàng đến cụm sân:</p>
                                            <p className="text-gray-700 font-semibold">{court?.name || "Kho hệ thống"}</p>
                                            <p className="text-gray-500">{court?.address || court?.location || "Địa chỉ văn phòng hệ thống"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Dates & Notes */}
                                {(d.notes || d.proofImage) && (
                                    <div className="border-t pt-3 space-y-2 text-xs text-gray-600">
                                        {d.notes && <p><strong>Ghi chú:</strong> {d.notes}</p>}
                                        {d.proofImage && (
                                            <div>
                                                <p className="mb-1 font-semibold">Bằng chứng giao hàng:</p>
                                                <img src={d.proofImage} alt="Bằng chứng" className="h-16 rounded object-cover border" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                {activeTab === "ACTIVE" && (
                                    <div className="flex gap-3 pt-2">
                                        {d.status === "PENDING" && (
                                            <button
                                                disabled={actioningId !== null}
                                                onClick={() => handlePickUp(d._id)}
                                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">check_box</span>
                                                Xác nhận lấy hàng
                                            </button>
                                        )}
                                        {d.status === "PICKED_UP" && (
                                            <button
                                                onClick={() => setSelectedDeliveryForProof(d)}
                                                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                                Báo cáo giao xong (Chụp ảnh)
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedDeliveryForProof && (
                <ReportDeliveryModal
                    delivery={selectedDeliveryForProof}
                    onClose={() => setSelectedDeliveryForProof(null)}
                    onSave={() => { setSelectedDeliveryForProof(null); fetchDeliveries(); }}
                />
            )}
        </div>
    );
}
