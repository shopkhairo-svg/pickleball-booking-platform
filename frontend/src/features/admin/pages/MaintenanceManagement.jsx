// src/features/admin/pages/MaintenanceManagement.jsx
import { useState, useEffect } from "react";
import adminService from "../../../services/adminService";

const statusColors = {
    REPORTED: "bg-red-100 text-red-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-green-100 text-green-700",
};

const severityColors = {
    LOW: "bg-blue-100 text-blue-700",
    MEDIUM: "bg-orange-100 text-orange-700",
    HIGH: "bg-red-100 text-red-700",
};

const MaintenanceFormModal = ({ onClose, onSave }) => {
    const [form, setForm] = useState({
        targetType: "COURT",
        targetId: "",
        title: "",
        description: "",
        severity: "LOW",
    });
    const [courts, setCourts] = useState([]);
    const [equipments, setEquipments] = useState([]);
    const [subCourts, setSubCourts] = useState([]);
    const [selectedSubCourtIds, setSelectedSubCourtIds] = useState([]);
    const [loadingTargets, setLoadingTargets] = useState(false);
    const [loadingSubCourts, setLoadingSubCourts] = useState(false);
    const [saving, setSaving] = useState(false);

    // Tải danh sách cụm sân và thiết bị khi modal mở
    useEffect(() => {
        const fetchTargets = async () => {
            setLoadingTargets(true);
            try {
                const [courtsRes, equipmentsRes] = await Promise.all([
                    adminService.getCourts({ limit: 100 }),
                    adminService.getEquipments({ limit: 100 })
                ]);
                const courtList = courtsRes.courts || [];
                const equipList = equipmentsRes.equipments || [];
                setCourts(courtList);
                setEquipments(equipList);

                // Chọn mặc định targetId
                if (form.targetType === "COURT" && courtList.length > 0) {
                    setForm(prev => ({ ...prev, targetId: courtList[0]._id }));
                } else if (form.targetType === "EQUIPMENT" && equipList.length > 0) {
                    setForm(prev => ({ ...prev, targetId: equipList[0]._id }));
                }
            } catch (err) {
                console.error("Lỗi khi tải danh sách đối tượng bảo trì:", err);
            } finally {
                setLoadingTargets(false);
            }
        };
        fetchTargets();
    }, []);

    // Tải danh sách sân con khi targetType là COURT và targetId thay đổi
    useEffect(() => {
        if (form.targetType === "COURT" && form.targetId) {
            setLoadingSubCourts(true);
            adminService.getSubCourts(form.targetId)
                .then(res => {
                    setSubCourts(res.subCourts || []);
                    setSelectedSubCourtIds([]);
                })
                .catch(err => {
                    console.error("Lỗi khi tải sân con:", err);
                    setSubCourts([]);
                })
                .finally(() => {
                    setLoadingSubCourts(false);
                });
        } else {
            setSubCourts([]);
            setSelectedSubCourtIds([]);
        }
    }, [form.targetType, form.targetId]);

    const handleTargetTypeChange = (type) => {
        const defaultId = type === "COURT"
            ? courts[0]?._id || ""
            : equipments[0]?._id || "";
        setForm(prev => ({ ...prev, targetType: type, targetId: defaultId }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.targetId) {
            alert("Vui lòng chọn đối tượng cần bảo trì!");
            return;
        }
        setSaving(true);
        try {
            const body = {
                ...form,
                subCourtIds: form.targetType === "COURT" ? selectedSubCourtIds : []
            };
            await adminService.createMaintenance(body);
            onSave();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-lg font-bold text-gray-800">Tạo yêu cầu Bảo trì</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Đối tượng *</label>
                            <select
                                value={form.targetType}
                                onChange={(e) => handleTargetTypeChange(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="COURT">Sân</option>
                                <option value="EQUIPMENT">Thiết bị</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ</label>
                            <select
                                value={form.severity}
                                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="LOW">Thấp</option>
                                <option value="MEDIUM">Trung bình</option>
                                <option value="HIGH">Cao</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {form.targetType === "COURT" ? "Chọn Sân *" : "Chọn Thiết bị *"}
                        </label>
                        {loadingTargets ? (
                            <p className="text-xs text-gray-400 py-2">Đang tải...</p>
                        ) : form.targetType === "COURT" ? (
                            courts.length === 0 ? (
                                <p className="text-xs text-red-500 py-2">Không tìm thấy cụm sân nào.</p>
                            ) : (
                                <select
                                    required
                                    value={form.targetId}
                                    onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                >
                                    {courts.map(c => (
                                        <option key={c._id} value={c._id}>
                                            {c.name} ({c.location}) - Chủ sân: {c.vendorId?.fullName || "Chưa gán"}
                                        </option>
                                    ))}
                                </select>
                            )
                        ) : (
                            equipments.length === 0 ? (
                                <p className="text-xs text-red-500 py-2">Không tìm thấy thiết bị nào.</p>
                            ) : (
                                <select
                                    required
                                    value={form.targetId}
                                    onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                >
                                    {equipments.map(eq => (
                                        <option key={eq._id} value={eq._id}>{eq.name} (Tồn: {eq.quantity})</option>
                                    ))}
                                </select>
                            )
                        )}
                    </div>

                    {form.targetType === "COURT" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Chọn sân con bảo trì {loadingSubCourts ? "(Đang tải...)" : ""}
                            </label>
                            {subCourts.length === 0 ? (
                                <p className="text-xs text-gray-400">Không tìm thấy sân con nào.</p>
                            ) : (
                                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 max-h-40 overflow-y-auto space-y-2">
                                    <p className="text-[10px] text-gray-400 mb-1">Để trống nếu muốn bảo trì toàn bộ cụm sân</p>
                                    {subCourts.map(sc => (
                                        <label key={sc._id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-primary">
                                            <input
                                                type="checkbox"
                                                checked={selectedSubCourtIds.includes(sc._id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedSubCourtIds([...selectedSubCourtIds, sc._id]);
                                                    } else {
                                                        setSelectedSubCourtIds(selectedSubCourtIds.filter(id => id !== sc._id));
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span>{sc.name} ({sc.status})</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                        <input
                            type="text" required value={form.title} placeholder="Mô tả ngắn vấn đề..."
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
                        <textarea
                            rows={3} value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                            placeholder="Chi tiết hư hỏng, vị trí, tình trạng..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">
                            Hủy bỏ
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium disabled:opacity-50">
                            {saving ? "Đang xử lý..." : "Tạo yêu cầu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function MaintenanceManagement() {
    const [records, setRecords] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({ page: 1, targetType: "", status: "" });

    useEffect(() => {
        fetchMaintenance();
    }, [filters.page, filters.targetType, filters.status]);

    const fetchMaintenance = async () => {
        try {
            setLoading(true);
            const params = { page: filters.page, limit: 10 };
            if (filters.targetType) params.targetType = filters.targetType;
            if (filters.status) params.status = filters.status;
            const res = await adminService.getMaintenance(params);
            setRecords(res.records);
            setPagination(res.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await adminService.updateMaintenanceStatus(id, newStatus);
            fetchMaintenance();
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        }
    };

    const handleSaved = () => {
        setShowModal(false);
        fetchMaintenance();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("vi-VN");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản lý Bảo trì</h1>
                    <p className="text-gray-500 mt-1">Theo dõi và xử lý yêu cầu bảo trì sân & thiết bị</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tạo yêu cầu
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-3">
                    <select
                        value={filters.targetType}
                        onChange={(e) => setFilters({ ...filters, targetType: e.target.value, page: 1 })}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                        <option value="">Tất cả đối tượng</option>
                        <option value="COURT">Sân</option>
                        <option value="EQUIPMENT">Thiết bị</option>
                    </select>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="REPORTED">Đã báo cáo</option>
                        <option value="IN_PROGRESS">Đang xử lý</option>
                        <option value="COMPLETED">Hoàn thành</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-lg">Chưa có yêu cầu bảo trì nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500 whitespace-nowrap">Tiêu đề</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500 whitespace-nowrap">Đối tượng</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500 whitespace-nowrap">Mức độ</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500 whitespace-nowrap">Ngày tạo</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500 whitespace-nowrap">Ngày xong</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500 whitespace-nowrap">Người tạo</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500 whitespace-nowrap">Trạng thái</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500 whitespace-nowrap">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r) => (
                                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-gray-800">
                                                {r.title}
                                                {r.targetType === "EQUIPMENT" && (
                                                    <span className="ml-2 inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold">
                                                        Số lượng: {r.equipmentMaintenanceQty || 1}
                                                    </span>
                                                )}
                                            </p>
                                            {r.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.description}</p>}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                                                {r.targetType === "COURT" ? "Sân" : "Thiết bị"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${severityColors[r.severity]}`}>
                                                {r.severity}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{formatDate(r.maintenanceDate)}</td>
                                        <td className="py-3 px-4 text-gray-600">{formatDate(r.completedDate)}</td>
                                        <td className="py-3 px-4 text-gray-600 text-xs">{r.createdBy?.fullName || "—"}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[r.status]}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-1">
                                                {r.status === "REPORTED" && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(r._id, "IN_PROGRESS")}
                                                        className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-100"
                                                    >
                                                        Bắt đầu
                                                    </button>
                                                )}
                                                {r.status === "IN_PROGRESS" && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(r._id, "COMPLETED")}
                                                        className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100"
                                                    >
                                                        Hoàn thành
                                                    </button>
                                                )}
                                                {r.status === "COMPLETED" && (
                                                    <span className="text-xs text-gray-400">✓ Done</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalItems} yêu cầu)
                        </span>
                        <div className="flex gap-2">
                            <button disabled={pagination.currentPage <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">Trước</button>
                            <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">Sau</button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <MaintenanceFormModal
                    onClose={() => setShowModal(false)}
                    onSave={handleSaved}
                />
            )}
        </div>
    );
}
