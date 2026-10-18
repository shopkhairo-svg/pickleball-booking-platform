// src/features/admin/pages/CourtManagement.jsx
import { useState, useEffect } from "react";
import adminService from "../../../services/adminService";

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
    const [existingImages, setExistingImages] = useState(court?.images || []);
    const [saving, setSaving] = useState(false);
    const [deletingImageId, setDeletingImageId] = useState(null);

    const handleDeleteImage = async (publicId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa hình ảnh này? Hành động này không thể hoàn tác.")) {
            return;
        }
        setDeletingImageId(publicId);
        try {
            await adminService.deleteCourtImage(court._id, publicId);
            setExistingImages(prev => prev.filter(img => img.publicId !== publicId));
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Không thể xóa ảnh!");
        } finally {
            setDeletingImageId(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => formData.append(key, value));
            files.forEach((file) => formData.append("images", file));

            if (court?._id) {
                await adminService.updateCourt(court._id, formData);
            } else {
                await adminService.createCourt(formData);
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
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
                        {existingImages.length > 0 && (
                            <div className="flex gap-4 mt-3 flex-wrap">
                                {existingImages.map((img, idx) => (
                                    <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                        <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            disabled={deletingImageId === img.publicId}
                                            onClick={() => handleDeleteImage(img.publicId)}
                                            className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center justify-center disabled:opacity-50"
                                            title="Xóa ảnh"
                                        >
                                            {deletingImageId === img.publicId ? (
                                                <svg className="animate-spin w-3 h-3 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
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

export default function CourtManagement() {
    const [courts, setCourts] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [editingCourt, setEditingCourt] = useState(null);
    const [maintenanceCourt, setMaintenanceCourt] = useState(null);
    const [showSubCourtsModal, setShowSubCourtsModal] = useState(false);
    const [selectedCourtForSubCourts, setSelectedCourtForSubCourts] = useState(null);
    const [filters, setFilters] = useState({ page: 1, type: "", status: "", search: "" });

    useEffect(() => {
        fetchCourts();
    }, [filters.page, filters.type, filters.status]);

    const fetchCourts = async () => {
        try {
            setLoading(true);
            const params = { page: filters.page, limit: 10 };
            if (filters.type) params.type = filters.type;
            if (filters.status) params.status = filters.status;
            if (filters.search) params.search = filters.search;
            const res = await adminService.getCourts(params);
            setCourts(res.courts);
            setPagination(res.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters({ ...filters, page: 1 });
        fetchCourts();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn ẩn cụm sân này?")) return;
        try {
            await adminService.deleteCourt(id);
            fetchCourts();
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        }
    };

    const handleBlock = async (id) => {
        try {
            await adminService.blockCourt(id);
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
                    <p className="text-gray-500 mt-1">Thêm, sửa, xóa và quản lý trạng thái cụm sân</p>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm sân mới
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                    <input
                        type="text" placeholder="Tìm kiếm tên sân, khu vực..."
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
                        <option value="INDOOR">Indoor</option>
                        <option value="OUTDOOR">Outdoor</option>
                    </select>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="AVAILABLE">Hoạt động</option>
                        <option value="MAINTENANCE">Bảo trì</option>
                        <option value="HIDDEN">Đã ẩn</option>
                    </select>
                    <button type="submit" className="px-5 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 font-medium text-sm">
                        Tìm kiếm
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : courts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-lg">Chưa có dữ liệu sân</p>
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
                                                {court.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-1">
                                                {court.status === "HIDDEN" ? (
                                                    <button
                                                        onClick={() => handleBlock(court._id)}
                                                        className="px-2.5 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                                        title="Khôi phục hoạt động"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">settings_backup_restore</span>
                                                        Khôi phục
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => openEdit(court)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600" title="Sửa">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setMaintenanceCourt(court);
                                                                setShowMaintenanceModal(true);
                                                            }}
                                                            className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600"
                                                            title="Bảo trì"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        </button>
                                                        <button onClick={() => handleDelete(court._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500" title="Ẩn sân">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
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

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalItems} sân)
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

            {/* Modal */}
            {showModal && (
                <CourtFormModal
                    court={editingCourt}
                    onClose={() => { setShowModal(false); setEditingCourt(null); fetchCourts(); }}
                    onSave={handleSaved}
                />
            )}

            {showMaintenanceModal && (
                <CourtMaintenanceModal
                    court={maintenanceCourt}
                    onClose={() => { setShowMaintenanceModal(false); setMaintenanceCourt(null); }}
                    onSave={() => { setShowMaintenanceModal(false); setMaintenanceCourt(null); fetchCourts(); }}
                />
            )}

            {showSubCourtsModal && selectedCourtForSubCourts && (
                <SubCourtsManagementModal
                    court={selectedCourtForSubCourts}
                    service={adminService}
                    onClose={() => { setShowSubCourtsModal(false); setSelectedCourtForSubCourts(null); }}
                    onSave={fetchCourts}
                />
            )}
        </div>
    );
}

const CourtMaintenanceModal = ({ court, onClose, onSave }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState("LOW");
    const [files, setFiles] = useState([]);
    const [saving, setSaving] = useState(false);

    const [subCourts, setSubCourts] = useState([]);
    const [selectedSubCourtIds, setSelectedSubCourtIds] = useState([]);
    const [loadingSubCourts, setLoadingSubCourts] = useState(false);

    useEffect(() => {
        const fetchSubCourts = async () => {
            try {
                setLoadingSubCourts(true);
                const res = await adminService.getSubCourts(court._id);
                setSubCourts(res.subCourts || []);
                if (res.subCourts && res.subCourts.length > 0) {
                    setSelectedSubCourtIds(res.subCourts.map(s => s._id));
                }
            } catch (err) {
                console.error("Lỗi khi tải sân nhỏ:", err);
            } finally {
                setLoadingSubCourts(false);
            }
        };
        fetchSubCourts();
    }, [court._id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (subCourts.length > 0 && selectedSubCourtIds.length === 0) {
            alert("Vui lòng chọn ít nhất một sân nhỏ cần bảo trì!");
            return;
        }
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("targetType", "COURT");
            formData.append("targetId", court._id);
            formData.append("title", title);
            formData.append("description", description);
            formData.append("severity", severity);
            if (selectedSubCourtIds.length > 0) {
                formData.append("subCourtIds", selectedSubCourtIds.join(","));
            }
            files.forEach(file => formData.append("images", file));
            await adminService.createMaintenance(formData);
            alert("Tạo yêu cầu bảo trì cụm sân thành công! Trạng thái các sân nhỏ đã chọn đã chuyển sang BẢO TRÌ.");
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
                    <h2 className="text-lg font-bold text-gray-800">Yêu cầu bảo trì cụm sân</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cụm sân</label>
                        <input
                            type="text" disabled value={court.name}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chủ sân tiếp nhận</label>
                        <input
                            type="text"
                            disabled
                            value={court.vendorId?.fullName ? `${court.vendorId.fullName} (${court.vendorId.email})` : "Chưa gán chủ sân"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chọn sân nhỏ cần bảo trì *</label>
                        {loadingSubCourts ? (
                            <p className="text-xs text-gray-400">Đang tải danh sách sân nhỏ...</p>
                        ) : subCourts.length === 0 ? (
                            <p className="text-xs text-red-500">Cụm sân này chưa cấu hình sân nhỏ!</p>
                        ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer pb-2 border-b">
                                    <input
                                        type="checkbox"
                                        checked={selectedSubCourtIds.length === subCourts.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedSubCourtIds(subCourts.map(s => s._id));
                                            } else {
                                                setSelectedSubCourtIds([]);
                                            }
                                        }}
                                        className="rounded text-primary focus:ring-primary/20"
                                    />
                                    <span>Chọn tất cả sân nhỏ ({subCourts.length})</span>
                                </label>
                                {subCourts.map((sub) => (
                                    <label key={sub._id} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer py-0.5">
                                        <input
                                            type="checkbox"
                                            checked={selectedSubCourtIds.includes(sub._id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedSubCourtIds([...selectedSubCourtIds, sub._id]);
                                                } else {
                                                    setSelectedSubCourtIds(selectedSubCourtIds.filter(id => id !== sub._id));
                                                }
                                            }}
                                            className="rounded text-primary focus:ring-primary/20"
                                        />
                                        <span>{sub.name} {sub.status === "MAINTENANCE" && <span className="text-[10px] text-amber-600 font-bold">(Đang bảo trì)</span>}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

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
                        <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium disabled:opacity-50">
                            {saving ? "Đang gửi..." : "Tạo yêu cầu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

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
