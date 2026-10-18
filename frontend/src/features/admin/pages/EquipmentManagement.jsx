// src/features/admin/pages/EquipmentManagement.jsx
import { useState, useEffect } from "react";
import adminService from "../../../services/adminService";

const statusColors = {
    AVAILABLE: "bg-green-100 text-green-700",
    IN_USE: "bg-blue-100 text-blue-700",
    DAMAGED: "bg-red-100 text-red-700",
    LOST: "bg-gray-100 text-gray-500",
};

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
    CANCELLED: "Đã hủy",
};

const typeLabels = {
    PADDLE: "Vợt",
    BALL: "Bóng",
    ACCESSORY: "Phụ kiện",
};

const EquipmentFormModal = ({ equipment, onClose, onSave }) => {
    const initialCourtId = typeof equipment?.courtId === "object"
        ? equipment?.courtId?._id || ""
        : equipment?.courtId || "";
    const [form, setForm] = useState({
        name: equipment?.name || "",
        type: equipment?.type || "PADDLE",
        description: equipment?.description || "",
        quantity: equipment?.quantity || "",
        rentalType: equipment?.rentalType || "HOUR",
        rentalPrice: equipment?.rentalPrice || "",
        image: equipment?.image || "",
        vendorId: "",
        courtId: initialCourtId,
    });
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(equipment?.image || "");
    const [removeImage, setRemoveImage] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [courts, setCourts] = useState([]);
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [loadingCourts, setLoadingCourts] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchCourts = async () => {
            try {
                setLoadingCourts(true);
                const res = await adminService.getCourts({ limit: 100 });
                setCourts(res.courts || []);
            } catch (err) {
                console.error("Lỗi khi tải danh sách sân", err);
            } finally {
                setLoadingCourts(false);
            }
        };
        fetchCourts();
    }, []);

    useEffect(() => {
        if (!equipment?._id) {
            const fetchVendors = async () => {
                try {
                    setLoadingVendors(true);
                    const res = await adminService.getUsers({ role: "VENDOR", vendorType: "EQUIPMENT", limit: 100 });
                    const vendorList = res.users || [];
                    setVendors(vendorList);
                    if (vendorList.length > 0) {
                        setForm(f => ({ ...f, vendorId: vendorList[0]._id }));
                    }
                } catch (err) {
                    console.error("Lỗi khi tải danh sách vendor", err);
                } finally {
                    setLoadingVendors(false);
                }
            };
            fetchVendors();
        }
    }, [equipment?._id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!equipment?._id && !form.vendorId) {
            alert("Vui lòng chọn nhà cung cấp!");
            return;
        }
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("type", form.type);
            formData.append("description", form.description);
            formData.append("rentalType", form.rentalType);
            formData.append("rentalPrice", form.rentalPrice);
            formData.append("courtId", form.courtId);
            if (!equipment?._id) {
                formData.append("quantity", form.quantity);
                formData.append("vendorId", form.vendorId);
            }
            if (imageFile) {
                formData.append("image", imageFile);
            } else if (removeImage) {
                formData.append("image", "");
            } else if (form.image) {
                formData.append("image", form.image);
            }

            if (equipment?._id) {
                await adminService.updateEquipment(equipment._id, formData);
            } else {
                await adminService.createEquipment(formData);
            }
            onSave();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-lg font-bold text-gray-800">
                        {equipment?._id ? "Cập nhật Thiết bị" : "Tạo thiết bị & đơn nhập"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên thiết bị *</label>
                        <input
                            type="text" required value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Loại *</label>
                            <select
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="PADDLE">Vợt (Paddle)</option>
                                <option value="BALL">Bóng</option>
                                <option value="ACCESSORY">Phụ kiện</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {equipment?._id ? "Tổng tồn kho (chỉ hiển thị)" : "Số lượng nhập ban đầu *"}
                            </label>
                            <input
                                type="number" required min={0} value={form.quantity}
                                disabled={!!equipment?._id}
                                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-gray-100 disabled:text-gray-500"
                            />
                        </div>
                    </div>

                    {!equipment?._id && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp (Vendor) *</label>
                            {loadingVendors ? (
                                <p className="text-xs text-gray-400">Đang tải danh sách nhà cung cấp...</p>
                            ) : vendors.length === 0 ? (
                                <p className="text-xs text-red-500">Không tìm thấy nhà cung cấp nào. Vui lòng tạo tài khoản Vendor trước!</p>
                            ) : (
                                <select
                                    required
                                    value={form.vendorId}
                                    onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                >
                                    {vendors.map(v => (
                                        <option key={v._id} value={v._id}>{v.fullName} ({v.email})</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sân áp dụng</label>
                        {loadingCourts ? (
                            <p className="text-xs text-gray-400">Đang tải danh sách sân...</p>
                        ) : (
                            <select
                                value={form.courtId}
                                onChange={(e) => setForm({ ...form, courtId: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="">Dùng chung toàn hệ thống (Global)</option>
                                {courts.map(court => (
                                    <option key={court._id} value={court._id}>
                                        {court.name} {court.location ? `- ${court.location}` : ""}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tính phí theo *</label>
                            <select
                                value={form.rentalType}
                                onChange={(e) => setForm({ ...form, rentalType: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="HOUR">Theo giờ</option>
                                <option value="TURN">Theo lượt</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giá thuê (VNĐ) *</label>
                            <input
                                type="number" required min={0} value={form.rentalPrice}
                                onChange={(e) => setForm({ ...form, rentalPrice: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                        <textarea
                            rows={2} value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh thiết bị (Chọn tệp)</label>
                        <input
                            type="file" accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setImageFile(file);
                                    setPreviewUrl(URL.createObjectURL(file));
                                    setRemoveImage(false);
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs"
                        />
                        {previewUrl && (
                            <div className="mt-2 flex items-center gap-3">
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPreviewUrl("");
                                        setImageFile(null);
                                        setRemoveImage(true);
                                        setForm(f => ({ ...f, image: "" }));
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg border border-red-200 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Xóa ảnh
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">
                            Hủy bỏ
                        </button>
                        <button type="submit" disabled={saving || (!equipment?._id && vendors.length === 0)} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium disabled:opacity-50">
                            {saving ? "Đang lưu..." : equipment?._id ? "Cập nhật" : "Tạo thiết bị & đơn nhập"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StockInModal = ({ equipment, onClose, onSave }) => {
    const [quantity, setQuantity] = useState("");
    const [vendors, setVendors] = useState([]);
    const [selectedVendorId, setSelectedVendorId] = useState("");
    const [loadingVendors, setLoadingVendors] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                setLoadingVendors(true);
                const res = await adminService.getUsers({ role: "VENDOR", vendorType: "EQUIPMENT", limit: 100 });
                setVendors(res.users || []);
                if (res.users && res.users.length > 0) {
                    setSelectedVendorId(res.users[0]._id);
                }
            } catch (err) {
                console.error("Lỗi khi lấy danh sách nhà cung cấp", err);
            } finally {
                setLoadingVendors(false);
            }
        };
        fetchVendors();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedVendorId) {
            alert("Vui lòng chọn một nhà cung cấp!");
            return;
        }
        setSaving(true);
        try {
            await adminService.createImportOrder({
                equipmentId: equipment._id,
                quantity: parseInt(quantity),
                vendorId: selectedVendorId
            });
            alert("Tạo đơn nhập kho thành công! Đang chờ Vendor xác nhận.");
            onSave();
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-bold text-gray-800">Yêu cầu nhập kho (Stock In)</h2>
                    <p className="text-sm text-gray-500 mt-1">Thiết bị: <span className="font-bold text-gray-700">{equipment.name}</span></p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp (Vendor) *</label>
                        {loadingVendors ? (
                            <div className="text-sm text-gray-400 py-2">Đang tải danh sách nhà cung cấp...</div>
                        ) : vendors.length === 0 ? (
                            <div className="text-sm text-red-500 py-2">Không tìm thấy tài khoản Vendor nào. Vui lòng tạo tài khoản Vendor trước!</div>
                        ) : (
                            <select
                                required
                                value={selectedVendorId}
                                onChange={(e) => setSelectedVendorId(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                {vendors.map(v => (
                                    <option key={v._id} value={v._id}>{v.fullName} ({v.email})</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng yêu cầu nhập *</label>
                        <input
                            type="number" required min={1} value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            placeholder="Ví dụ: 10, 20..."
                        />
                        <p className="text-xs text-gray-400 mt-1">Hiện tại trên hệ thống: {equipment.availableQuantity} / {equipment.quantity}</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">
                            Hủy
                        </button>
                        <button type="submit" disabled={saving || vendors.length === 0} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium disabled:opacity-50">
                            {saving ? "Đang xử lý..." : "Tạo đơn nhập"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EquipmentMaintenanceModal = ({ equipment, onClose, onSave }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState("LOW");
    const [files, setFiles] = useState([]);
    const [saving, setSaving] = useState(false);

    const maxAvailable = Math.max(0, (equipment.availableQuantity || 0) - (equipment.maintenanceQuantity || 0));
    const [maintenanceQty, setMaintenanceQty] = useState(maxAvailable > 0 ? 1 : 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (maxAvailable <= 0) {
            alert("Thiết bị này đã hết số lượng khả dụng để bảo trì!");
            return;
        }
        if (maintenanceQty <= 0 || maintenanceQty > maxAvailable) {
            alert(`Số lượng bảo trì không hợp lệ (phải từ 1 đến ${maxAvailable} chiếc)!`);
            return;
        }
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("targetType", "EQUIPMENT");
            formData.append("targetId", equipment._id);
            formData.append("title", title);
            formData.append("description", description);
            formData.append("severity", severity);
            formData.append("maintenanceQty", maintenanceQty);
            files.forEach(file => formData.append("images", file));
            await adminService.createMaintenance(formData);
            alert("Tạo yêu cầu bảo trì thiết bị thành công!");
            onSave();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-lg font-bold text-gray-800">Yêu cầu bảo trì thiết bị</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Thiết bị</label>
                        <input
                            type="text" disabled value={equipment.name}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ bảo trì</label>
                            <select
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="LOW">Thấp (Low)</option>
                                <option value="MEDIUM">Trung bình (Medium)</option>
                                <option value="HIGH">Cao (High)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Số lượng bảo trì *
                            </label>
                            <input
                                type="number"
                                required
                                min={1}
                                max={maxAvailable}
                                value={maintenanceQty}
                                onChange={(e) => setMaintenanceQty(parseInt(e.target.value) || "")}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">Khả dụng tối đa: {maxAvailable} chiếc</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề yêu cầu *</label>
                        <input
                            type="text" required value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            placeholder="Mô tả ngắn hư hỏng..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
                        <textarea
                            rows={3} value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                            placeholder="Chi tiết về hỏng hóc..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh hiện trạng</label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => setFiles(Array.from(e.target.files || []))}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        <p className="mt-1 text-xs text-gray-400">Có thể chọn tối đa 5 ảnh minh chứng.</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">
                            Hủy
                        </button>
                        <button type="submit" disabled={saving || maxAvailable <= 0} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium disabled:opacity-50">
                            {saving ? "Đang gửi..." : "Tạo yêu cầu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EquipmentRentalsModal = ({ equipment, onClose }) => {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRentals = async () => {
            try {
                setLoading(true);
                const res = await adminService.getEquipmentRentals(equipment._id);
                setRentals(res.rentals || res.data?.rentals || []);
            } catch (err) {
                console.error("Lỗi khi tải lịch thuê:", err);
                setError(err?.response?.data?.message || err.message || "Không thể tải lịch thuê.");
            } finally {
                setLoading(false);
            }
        };
        if (equipment?._id) {
            fetchRentals();
        }
    }, [equipment?._id]);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Lịch Trình Thuê Chi Tiết</h2>
                        <p className="text-sm text-gray-500 mt-1">Thiết bị: <span className="font-semibold text-gray-700">{equipment.name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                            <p className="text-sm text-gray-500 mt-2">Đang tải lịch trình thuê...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500 font-medium">{error}</div>
                    ) : rentals.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm">Chưa có đơn đặt lịch nào thuê thiết bị này.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 border-b">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold">Mã đơn</th>
                                        <th className="py-3 px-4 font-semibold">Khách hàng</th>
                                        <th className="py-3 px-4 font-semibold">Ngày chơi</th>
                                        <th className="py-3 px-4 font-semibold">Khung giờ</th>
                                        <th className="py-3 px-4 font-semibold text-center">Số lượng</th>
                                        <th className="py-3 px-4 font-semibold text-center">Trạng thái thuê</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rentals.map((r, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="py-3 px-4 font-bold text-primary">#{r.bookingCode}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-gray-800">{r.clientName}</div>
                                                <div className="text-xs text-gray-400">{r.clientPhone}</div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-700">{r.bookingDate}</td>
                                            <td className="py-3 px-4 text-gray-700">
                                                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-medium rounded text-xs">
                                                    {r.startTime} - {r.endTime}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-gray-800">{r.quantity}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    r.returnStatus === "RETURNED" ? "bg-green-100 text-green-700" :
                                                    r.returnStatus === "PREPARED" ? "bg-amber-100 text-amber-700" :
                                                    "bg-blue-100 text-blue-700"
                                                }`}>
                                                    {
                                                        r.returnStatus === "RETURNED" ? "Đã trả" :
                                                        r.returnStatus === "PREPARED" ? "Đã chuẩn bị" :
                                                        "Đang thuê"
                                                    }
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="p-6 bg-gray-50 border-t flex justify-end">
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium text-sm transition-colors">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

const ViewAdminProofModal = ({ order, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-bold text-gray-800">Ảnh Bằng Chứng Giao Hàng</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="space-y-3 text-sm text-gray-600">
                    <p><strong>Người giao:</strong> {order.delivery?.shipperId?.fullName} ({order.delivery?.shipperId?.phone || "N/A"})</p>
                    <p><strong>Nhà cung cấp:</strong> {order.vendorId?.fullName}</p>
                    {order.delivery?.notes && (
                        <p><strong>Ghi chú:</strong> {order.delivery.notes}</p>
                    )}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center max-h-[300px] shadow-inner">
                        {order.delivery?.proofImage ? (
                            <img src={order.delivery.proofImage} alt="Bằng chứng giao hàng" className="object-contain max-h-[300px] w-full" />
                        ) : (
                            <p className="py-12 text-gray-400">Không tìm thấy ảnh bằng chứng.</p>
                        )}
                    </div>
                    <div className="pt-2">
                        <button type="button" onClick={onClose} className="w-full px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function EquipmentManagement() {
    const [activeTab, setActiveTab] = useState("equipments");
    const [equipments, setEquipments] = useState([]);
    const [importOrders, setImportOrders] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showStockIn, setShowStockIn] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [showRentalsModal, setShowRentalsModal] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState(null);
    const [maintenanceEquipment, setMaintenanceEquipment] = useState(null);
    const [selectedEquipmentForRentals, setSelectedEquipmentForRentals] = useState(null);
    const [selectedOrderForAdminProof, setSelectedOrderForAdminProof] = useState(null);
    const [filters, setFilters] = useState({ page: 1, type: "", status: "", search: "" });

    const fetchEquipments = async () => {
        try {
            setLoading(true);
            const params = { page: filters.page, limit: 10 };
            if (filters.type) params.type = filters.type;
            if (filters.status) params.status = filters.status;
            if (filters.search) params.search = filters.search;
            const res = await adminService.getEquipments(params);
            setEquipments(res.equipments);
            setPagination(res.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchImportOrders = async () => {
        try {
            setLoadingOrders(true);
            const res = await adminService.getImportOrders({ page: filters.page, limit: 10 });
            setImportOrders(res.orders || []);
            setPagination(res.pagination || {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingOrders(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (activeTab === "equipments") {
                fetchEquipments();
            } else {
                fetchImportOrders();
            }
        }, 0);
        return () => window.clearTimeout(timer);
        // Search is submitted manually; adding fetch functions would refetch on each search keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.page, filters.type, filters.status, activeTab]);

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters({ ...filters, page: 1 });
        if (activeTab === "equipments") {
            fetchEquipments();
        } else {
            fetchImportOrders();
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xóa thiết bị này?")) return;
        try {
            await adminService.deleteEquipment(id);
            fetchEquipments();
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy đơn nhập kho này?")) return;
        try {
            await adminService.cancelImportOrder(orderId);
            fetchImportOrders();
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        }
    };

    const handleSaved = () => {
        setShowModal(false);
        setShowStockIn(false);
        setEditingEquipment(null);
        if (activeTab === "equipments") {
            fetchEquipments();
        } else {
            fetchImportOrders();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản lý Kho & Thiết bị</h1>
                    <p className="text-gray-500 mt-1">Quản lý kho vợt, bóng, phụ kiện và lịch sử cung cấp từ Vendor</p>
                </div>
                <button
                    onClick={() => { setEditingEquipment(null); setShowModal(true); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tạo thiết bị mới
                </button>
            </div>

            {/* TABS */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => { setActiveTab("equipments"); setFilters({ ...filters, page: 1 }); }}
                    className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 ${
                        activeTab === "equipments"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Danh sách Thiết bị
                </button>
                <button
                    onClick={() => { setActiveTab("importOrders"); setFilters({ ...filters, page: 1 }); }}
                    className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 ${
                        activeTab === "importOrders"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Đơn nhập kho (Từ Vendor)
                </button>
            </div>

            {/* Filter Section (Only for Equipments) */}
            {activeTab === "equipments" && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                        <input
                            type="text" placeholder="Tìm kiếm tên thiết bị..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="">Tất cả loại</option>
                            <option value="PADDLE">Vợt</option>
                            <option value="BALL">Bóng</option>
                            <option value="ACCESSORY">Phụ kiện</option>
                        </select>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="AVAILABLE">Sẵn sàng</option>
                            <option value="IN_USE">Đang dùng</option>
                            <option value="DAMAGED">Hỏng</option>
                            <option value="LOST">Thất lạc</option>
                        </select>
                        <button type="submit" className="px-5 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 font-medium text-sm">
                            Tìm kiếm
                        </button>
                    </form>
                </div>
            )}

            {/* TABLE CONTAINER */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {activeTab === "equipments" ? (
                    loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                        </div>
                    ) : equipments.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p className="text-lg">Kho thiết bị trống</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-medium text-gray-500">Thiết bị</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-500">Loại</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-500">Sân áp dụng</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-500">Tồn kho</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-500">Khả dụng</th>
                                        <th className="text-right py-3 px-4 font-medium text-gray-500">Giá thuê</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-500 whitespace-nowrap">Tính phí</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-500">Trạng thái</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-500">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {equipments.map((eq) => (
                                        <tr key={eq._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="py-3 px-4 font-medium text-gray-800">
                                                <div className="flex items-center gap-2">
                                                    {eq.image && <img src={eq.image} alt="" className="w-8 h-8 rounded object-cover" />}
                                                    <span>{eq.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">{typeLabels[eq.type] || eq.type}</td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {eq.courtId?.name || "Hệ thống (Global)"}
                                            </td>
                                            <td className="py-3 px-4 text-center font-semibold text-gray-700">{eq.quantity}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`font-semibold ${eq.availableQuantity > 0 ? "text-green-600" : "text-red-500"}`}>
                                                    {eq.availableQuantity}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium text-gray-700">
                                                {eq.rentalPrice?.toLocaleString("vi-VN")}đ
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                                                    {eq.rentalType === "HOUR" ? "Theo giờ" : "Theo lượt"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[eq.status]}`}>
                                                    {eq.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => { setEditingEquipment(eq); setShowModal(true); }} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600" title="Sửa">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => { setEditingEquipment(eq); setShowStockIn(true); }} className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600" title="Nhập thêm (Yêu cầu Vendor)">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => { setMaintenanceEquipment(eq); setShowMaintenanceModal(true); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold border border-amber-200 transition-colors" title="Bảo trì thiết bị">
                                                        <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        Bảo trì
                                                    </button>
                                                    <button onClick={() => { setSelectedEquipmentForRentals(eq); setShowRentalsModal(true); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 transition-colors" title="Xem lịch thuê">
                                                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Lịch thuê
                                                    </button>
                                                    <button onClick={() => handleDelete(eq._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500" title="Xóa">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    loadingOrders ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                        </div>
                    ) : importOrders.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p className="text-lg">Chưa có đơn nhập kho nào được tạo</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-medium text-gray-500">Thiết bị</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-500">Loại</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-500">Số lượng nhập</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-500">Nhà cung cấp (Vendor)</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-500">Giao hàng (Shipper)</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-500">Người yêu cầu (Admin)</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-500">Ngày tạo</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-500">Trạng thái</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-500">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importOrders.map((order) => (
                                        <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="py-3 px-4 font-semibold text-gray-800">
                                                {order.equipmentId?.name || "Thiết bị đã xóa"}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {typeLabels[order.equipmentId?.type] || order.equipmentId?.type || "-"}
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-gray-700">
                                                {order.quantity}
                                            </td>
                                            <td className="py-3 px-4 text-gray-700">
                                                <span className="font-semibold">{order.vendorId?.fullName}</span>
                                                <p className="text-xs text-gray-400">{order.vendorId?.email}</p>
                                            </td>
                                            <td className="py-3 px-4 text-gray-700">
                                                {order.delivery?.shipperId ? (
                                                    <div>
                                                        <span className="font-semibold text-xs">{order.delivery.shipperId.fullName}</span>
                                                        <span className={`block w-max px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                            order.delivery.status === "PENDING" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                                                            order.delivery.status === "PICKED_UP" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                                                            order.delivery.status === "SHIPPED" ? "bg-purple-100 text-purple-700 border border-purple-200 animate-pulse" :
                                                            order.delivery.status === "COMPLETED" ? "bg-green-100 text-green-700 border border-green-200" :
                                                            "bg-red-100 text-red-700 border border-red-200"
                                                        }`}>
                                                            {
                                                                order.delivery.status === "PENDING" ? "Chờ lấy hàng" :
                                                                order.delivery.status === "PICKED_UP" ? "Đang giao" :
                                                                order.delivery.status === "SHIPPED" ? "Chờ xác nhận" :
                                                                order.delivery.status === "COMPLETED" ? "Giao thành công" :
                                                                "Đã hủy"
                                                            }
                                                        </span>
                                                        {order.delivery.proofImage && (
                                                            <button
                                                                onClick={() => setSelectedOrderForAdminProof(order)}
                                                                className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline"
                                                            >
                                                                <span className="material-symbols-outlined text-[13px]">image</span>
                                                                Xem ảnh bằng chứng
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">Chưa gán</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                <span className="font-semibold">{order.adminId?.fullName}</span>
                                                <p className="text-xs text-gray-400">{order.adminId?.email}</p>
                                            </td>
                                            <td className="py-3 px-4 text-center text-gray-500 text-xs">
                                                {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${orderStatusColors[order.status]}`}>
                                                    {orderStatusLabels[order.status]}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {["PENDING", "CONFIRMED"].includes(order.status) ? (
                                                    <button
                                                        onClick={() => handleCancelOrder(order._id)}
                                                        className="px-3 py-1 bg-red-555 border border-red-200 hover:bg-red-550 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                                                    >
                                                        Hủy đơn
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            Trang {pagination.currentPage} / {pagination.totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.currentPage <= 1}
                                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                            >
                                Trước
                            </button>
                            <button
                                disabled={pagination.currentPage >= pagination.totalPages}
                                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <EquipmentFormModal
                    equipment={editingEquipment}
                    onClose={() => { setShowModal(false); setEditingEquipment(null); }}
                    onSave={handleSaved}
                />
            )}
            {showStockIn && editingEquipment && (
                <StockInModal
                    equipment={editingEquipment}
                    onClose={() => { setShowStockIn(false); setEditingEquipment(null); }}
                    onSave={handleSaved}
                />
            )}
            {showMaintenanceModal && maintenanceEquipment && (
                <EquipmentMaintenanceModal
                    equipment={maintenanceEquipment}
                    onClose={() => { setShowMaintenanceModal(false); setMaintenanceEquipment(null); }}
                    onSave={handleSaved}
                />
            )}
            {showRentalsModal && selectedEquipmentForRentals && (
                <EquipmentRentalsModal
                    equipment={selectedEquipmentForRentals}
                    onClose={() => { setShowRentalsModal(false); setSelectedEquipmentForRentals(null); }}
                />
            )}
            {selectedOrderForAdminProof && (
                <ViewAdminProofModal
                    order={selectedOrderForAdminProof}
                    onClose={() => setSelectedOrderForAdminProof(null)}
                />
            )}
        </div>
    );
}
