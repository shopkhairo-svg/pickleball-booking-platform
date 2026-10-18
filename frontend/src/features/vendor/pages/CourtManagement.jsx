import { useState, useEffect } from "react";
import { vendorService } from "@/services/vendor.service";

const statusColors = {
    AVAILABLE: "bg-green-100 text-green-700",
    MAINTENANCE: "bg-yellow-100 text-yellow-700",
    HIDDEN: "bg-gray-100 text-gray-500",
};

const CourtFormModal = ({ court, onClose, onSave }) => {
    const [form, setForm] = useState({
        name: court?.name || "",
        location: court?.location || "",
        address: court?.address || "",
        type: court?.type || "INDOOR",
        description: court?.description || "",
        pricePerHour: court?.pricePerHour || "",
        openTime: court?.openTime || "06:00",
        closeTime: court?.closeTime || "22:00",
        slotDuration: court?.slotDuration || 60,
        amenities: court?.amenities?.join(", ") || "",
    });
    const [files, setFiles] = useState([]);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => formData.append(key, value));
            files.forEach((file) => formData.append("images", file));

            if (court?._id) {
                await vendorService.updateCourt(court._id, formData);
            } else {
                await vendorService.createCourt(formData);
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
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-lg font-bold text-gray-800">
                        {court?._id ? "Cập nhật Cụm sân" : "Thêm Cụm sân mới"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tên sân *</label>
                            <input
                                type="text" required value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực *</label>
                            <input
                                type="text" required value={form.location}
                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                        <input
                            type="text" value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Loại sân *</label>
                            <select
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="INDOOR">Indoor</option>
                                <option value="OUTDOOR">Outdoor</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giá/giờ (VNĐ) *</label>
                            <input
                                type="number" required min={0} value={form.pricePerHour}
                                onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Slot (phút)</label>
                            <input
                                type="number" min={30} value={form.slotDuration}
                                onChange={(e) => setForm({ ...form, slotDuration: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giờ mở cửa</label>
                            <input
                                type="time" value={form.openTime}
                                onChange={(e) => setForm({ ...form, openTime: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giờ đóng cửa</label>
                            <input
                                type="time" value={form.closeTime}
                                onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                        <textarea
                            rows={3} value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiện ích (ngăn cách bởi dấu phẩy)</label>
                        <input
                            type="text" value={form.amenities} placeholder="Wi-Fi, Nhà vệ sinh, Bãi xe..."
                            onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh</label>
                        <input
                            type="file" accept="image/*" multiple
                            onChange={(e) => setFiles(Array.from(e.target.files))}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        {court?.images?.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {court.images.map((img, idx) => (
                                    <img key={idx} src={img.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button" onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit" disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium disabled:opacity-50"
                        >
                            {saving ? "Đang lưu..." : court?._id ? "Cập nhật" : "Tạo mới"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function VendorCourtManagement() {
    const [courts, setCourts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCourt, setEditingCourt] = useState(null);
    const [showSubCourtsModal, setShowSubCourtsModal] = useState(false);
    const [selectedCourtForSubCourts, setSelectedCourtForSubCourts] = useState(null);

    const fetchCourts = async () => {
        try {
            setLoading(true);
            const res = await vendorService.getCourts();
            setCourts(res.courts || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            fetchCourts();
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn ẩn cụm sân này?")) return;
        try {
            await vendorService.deleteCourt(id);
            fetchCourts();
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        }
    };

    const handleRestore = async (id) => {
        try {
            const formData = new FormData();
            formData.append("status", "AVAILABLE");
            await vendorService.updateCourt(id, formData);
            fetchCourts();
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        }
    };

    const openEdit = (court) => {
        setEditingCourt(court);
        setShowModal(true);
    };

    const openCreate = () => {
        setEditingCourt(null);
        setShowModal(true);
    };

    const handleSaved = () => {
        setShowModal(false);
        setEditingCourt(null);
        fetchCourts();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản lý Sân</h1>
                    <p className="text-gray-500 mt-1">Quản lý danh sách các cụm sân và sân nhỏ trực thuộc</p>
                </div>
                {courts.length === 0 && (
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Thêm sân mới
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : courts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-lg">Chưa cấu hình cụm sân nào.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Sân</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Khu vực</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Loại</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-500">Giá/giờ</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Sân con</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Trạng thái</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courts.map((court) => (
                                    <tr key={court._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                {court.images?.[0]?.imageUrl ? (
                                                    <img src={court.images[0].imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                        <span className="material-symbols-outlined text-[20px]">sports_tennis</span>
                                                    </div>
                                                )}
                                                <span className="font-medium text-gray-800">{court.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{court.location}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${court.type === "INDOOR" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}>
                                                {court.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-700">
                                            {court.pricePerHour?.toLocaleString("vi-VN")}đ
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                onClick={() => { setSelectedCourtForSubCourts(court); setShowSubCourtsModal(true); }}
                                                className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg font-bold text-xs transition-colors"
                                                title="Quản lý sân nhỏ"
                                            >
                                                {court.subCourtsCount || 0} sân con
                                            </button>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[court.status]}`}>
                                                {court.status === "AVAILABLE" ? "Hoạt động" : court.status === "MAINTENANCE" ? "Bảo trì" : "Đã ẩn"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {court.status === "HIDDEN" ? (
                                                    <button
                                                        onClick={() => handleRestore(court._id)}
                                                        className="px-2.5 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                                        title="Khôi phục hoạt động"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">settings_backup_restore</span>
                                                        Khôi phục
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => openEdit(court)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600" title="Sửa">
                                                            <span className="material-symbols-outlined text-md">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDelete(court._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500" title="Ẩn sân">
                                                            <span className="material-symbols-outlined text-md">delete</span>
                                                        </button>
                                                    </>
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

            {/* Modal Form */}
            {showModal && (
                <CourtFormModal
                    court={editingCourt}
                    onClose={() => { setShowModal(false); setEditingCourt(null); }}
                    onSave={handleSaved}
                />
            )}

            {showSubCourtsModal && selectedCourtForSubCourts && (
                <SubCourtsManagementModal
                    court={selectedCourtForSubCourts}
                    service={vendorService}
                    onClose={() => { setShowSubCourtsModal(false); setSelectedCourtForSubCourts(null); }}
                    onSave={fetchCourts}
                />
            )}
        </div>
    );
}

const SubCourtsManagementModal = ({ court, onClose, onSave, service }) => {
    const [subCourts, setSubCourts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const fetchSubCourts = async () => {
        try {
            setLoading(true);
            const res = await service.getSubCourts(court._id);
            setSubCourts(res.subCourts || []);
        } catch (err) {
            console.error("Lỗi khi tải danh sách sân nhỏ:", err);
            alert(err?.response?.data?.message || err.message || "Không thể tải danh sách sân nhỏ.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (court?._id) {
            fetchSubCourts();
        }
    }, [court?._id]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setAdding(true);
        try {
            await service.createSubCourt(court._id, { name: newName.trim() });
            setNewName("");
            fetchSubCourts();
            if (onSave) onSave();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Không thể thêm sân nhỏ.");
        } finally {
            setAdding(false);
        }
    };

    const handleUpdateStatus = async (subCourtId, currentStatus) => {
        const nextStatus = currentStatus === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE";
        setUpdatingId(subCourtId);
        try {
            await service.updateSubCourt(subCourtId, { status: nextStatus });
            fetchSubCourts();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Không thể cập nhật trạng thái.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleUpdateName = async (subCourtId) => {
        if (!editingName.trim()) return;
        setUpdatingId(subCourtId);
        try {
            await service.updateSubCourt(subCourtId, { name: editingName.trim() });
            setEditingId(null);
            setEditingName("");
            fetchSubCourts();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Không thể đổi tên sân nhỏ.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (subCourtId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa sân nhỏ này?")) return;
        setUpdatingId(subCourtId);
        try {
            await service.deleteSubCourt(subCourtId);
            fetchSubCourts();
            if (onSave) onSave();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Không thể xóa sân nhỏ.");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Quản lý Sân con (SubCourts)</h2>
                        <p className="text-sm text-gray-500 mt-1">Cụm sân: <span className="font-semibold text-gray-700">{court.name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input
                            type="text"
                            required
                            placeholder="Nhập tên sân nhỏ mới (VD: Sân số 3)..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            disabled={adding}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                        <button
                            type="submit"
                            disabled={adding || !newName.trim()}
                            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {adding ? "Thêm..." : "Thêm sân con"}
                        </button>
                    </form>

                    <div className="max-h-[40vh] overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            </div>
                        ) : subCourts.length === 0 ? (
                            <p className="text-center py-8 text-sm text-gray-400">Cụm sân này chưa có sân con nào.</p>
                        ) : (
                            subCourts.map((sc) => (
                                <div key={sc._id} className="p-3 flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {editingId === sc._id ? (
                                            <div className="flex gap-1.5 items-center">
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="px-2.5 py-1 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleUpdateName(sc._id)}
                                                    disabled={updatingId === sc._id}
                                                    className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100"
                                                    title="Lưu"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => { setEditingId(null); setEditingName(""); }}
                                                    className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"
                                                    title="Hủy"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className={`font-medium truncate ${sc.status === "HIDDEN" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                                                    {sc.name}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                    sc.status === "AVAILABLE" ? "bg-green-50 text-green-700" :
                                                    sc.status === "MAINTENANCE" ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-500"
                                                }`}>
                                                    {sc.status === "AVAILABLE" ? "AVAILABLE" : sc.status === "MAINTENANCE" ? "MAINTENANCE" : "HIDDEN"}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-1 items-center shrink-0">
                                        {sc.status === "HIDDEN" ? (
                                            <button
                                                onClick={() => handleUpdateStatus(sc._id, "HIDDEN")}
                                                disabled={updatingId !== null}
                                                className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors animate-pulse"
                                                title="Khôi phục hoạt động"
                                            >
                                                Khôi phục
                                            </button>
                                        ) : (
                                            <>
                                                {editingId !== sc._id && (
                                                    <button
                                                        onClick={() => { setEditingId(sc._id); setEditingName(sc.name); }}
                                                        disabled={updatingId !== null}
                                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                                                        title="Sửa tên"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleUpdateStatus(sc._id, sc.status)}
                                                    disabled={updatingId !== null}
                                                    className={`p-1.5 rounded transition-colors ${
                                                        sc.status === "AVAILABLE"
                                                            ? "hover:bg-yellow-50 text-yellow-600"
                                                            : "hover:bg-green-50 text-green-600"
                                                    }`}
                                                    title={sc.status === "AVAILABLE" ? "Chuyển sang bảo trì" : "Mở khóa sân"}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(sc._id)}
                                                    disabled={updatingId !== null}
                                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                                                    title="Xóa sân"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
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
