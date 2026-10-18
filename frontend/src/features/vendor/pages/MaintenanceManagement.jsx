// src/features/vendor/pages/MaintenanceManagement.jsx
import { useState, useEffect } from "react";
import { vendorService } from "../../../services/vendor.service";

const statusColors = {
    REPORTED: "bg-red-100 text-red-700 border border-red-200",
    ASSIGNED: "bg-indigo-100 text-indigo-700 border border-indigo-200",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    PENDING_CONFIRMATION: "bg-purple-100 text-purple-700 border border-purple-200",
    COMPLETED: "bg-green-100 text-green-700 border border-green-200",
};

const severityColors = {
    LOW: "bg-blue-100 text-blue-700",
    MEDIUM: "bg-orange-100 text-orange-700",
    HIGH: "bg-red-100 text-red-700",
};

const statusLabels = {
    REPORTED: "Chờ phân công",
    ASSIGNED: "Đã phân công",
    IN_PROGRESS: "Đang xử lý",
    PENDING_CONFIRMATION: "Chờ xác nhận",
    COMPLETED: "Đã hoàn thành",
};

const severityLabels = {
    LOW: "Thấp",
    MEDIUM: "Trung bình",
    HIGH: "Cao",
};

const countWorkLogImages = (record) => (
    record.workLogs || []
).reduce((total, log) => total + (log.images?.length || 0), 0);

const MaintenanceEvidenceModal = ({ record, onClose }) => {
    const totalWorkLogImages = countWorkLogImages(record);

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl">
                <div className="flex items-start justify-between gap-4 border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Chi tiết lộ trình bảo trì</h3>
                        <p className="mt-1 text-sm text-gray-500">{record.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1.5 hover:bg-gray-100 rounded-lg">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {record.images?.length > 0 && (
                    <section className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Ảnh hiện trạng ban đầu</h4>
                        <div className="grid grid-cols-3 gap-3">
                            {record.images.map((image) => (
                                <a
                                    key={image.publicId || image.imageUrl}
                                    href={image.imageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:opacity-90 transition-opacity aspect-video"
                                >
                                    <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                {/* Vertical Timeline */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Lịch trình xử lý chi tiết</h4>
                        <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-600">
                            {totalWorkLogImages} ảnh bằng chứng
                        </span>
                    </div>

                    <div className="relative border-l-2 border-gray-100 ml-3 pl-6 space-y-6">
                        {/* Milestone: Báo cáo sự cố */}
                        <div className="relative">
                            <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-indigo-600 border-indigo-600">
                                <span className="block h-1.5 w-1.5 rounded-full bg-white"></span>
                            </span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-gray-800">
                                        Báo cáo sự cố thành công
                                    </p>
                                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {formatDateTime(record.createdAt)}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">Yêu cầu bảo trì được tạo trên hệ thống.</p>
                            </div>
                        </div>

                        {/* Milestones from workLogs */}
                        {(record.workLogs || []).map((log, index) => (
                            <div key={log._id || index} className="relative">
                                <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-primary border-primary">
                                    <span className="block h-1.5 w-1.5 rounded-full bg-white"></span>
                                </span>
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100/50 mt-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-bold text-primary">
                                            {statusLabels[log.status] || log.status}
                                        </p>
                                        <span className="text-[10px] text-gray-400">
                                            {formatDateTime(log.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Thực hiện bởi: {log.updatedBy?.fullName || record.assignedStaffId?.fullName || "Thợ bảo trì"}</p>
                                    {log.note && (
                                        <p className="text-xs text-gray-600 bg-white border border-gray-100 rounded-lg p-2.5 mt-2 leading-relaxed">
                                            {log.note}
                                        </p>
                                    )}
                                    {log.images?.length > 0 && (
                                        <div className="mt-2.5 grid grid-cols-3 gap-2">
                                            {log.images.map((image, idx) => (
                                                <a
                                                    key={idx} href={image.imageUrl} target="_blank" rel="noreferrer"
                                                    className="block aspect-square overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:opacity-85 transition-opacity"
                                                >
                                                    <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                <div className="flex justify-end pt-2 border-t">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-600">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function MaintenanceManagement() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterType, setFilterType] = useState("");
    const [staff, setStaff] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState({});
    const [selectedEvidenceRecord, setSelectedEvidenceRecord] = useState(null);

    const fetchMaintenance = async () => {
        try {
            setLoading(true);
            const [maintenanceRes, staffRes] = await Promise.all([
                vendorService.getMaintenance(),
                vendorService.getMaintenanceStaff()
            ]);
            setRecords(maintenanceRes.records || []);
            setStaff(staffRes.staff || []);
        } catch (err) {
            console.error("Lỗi khi tải danh sách bảo trì", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignStaff = async (record) => {
        const staffId = selectedStaff[record._id];
        if (!staffId) {
            alert("Vui lòng chọn thợ bảo trì phù hợp!");
            return;
        }
        try {
            await vendorService.assignMaintenanceStaff(record._id, staffId);
            alert("Phân công thợ bảo trì thành công!");
            fetchMaintenance();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            fetchMaintenance();
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    const handleStatusUpdate = async (id, status) => {
        const actionText = status === "IN_PROGRESS" ? "bắt đầu bảo trì" : "hoàn thành bảo trì";
        if (!window.confirm(`Bạn có chắc chắn muốn xác nhận ${actionText}?`)) return;

        try {
            await vendorService.updateMaintenanceStatus(id, status);
            alert("Cập nhật trạng thái bảo trì thành công!");
            fetchMaintenance();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Có lỗi xảy ra!");
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const filteredRecords = records.filter(r => {
        const matchStatus = !filterStatus || r.status === filterStatus;
        const matchType = !filterType || r.targetType === filterType;
        return matchStatus && matchType;
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Yêu cầu Bảo trì được giao</h1>
                <p className="text-gray-500 mt-1">Quản lý và thực hiện bảo trì sân & thiết bị do bạn sở hữu hoặc cung ứng</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                    <option value="">Tất cả loại đối tượng</option>
                    <option value="COURT">Sân</option>
                    <option value="EQUIPMENT">Thiết bị</option>
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="REPORTED">Mới giao (Đã báo cáo)</option>
                    <option value="ASSIGNED">Đã phân công</option>
                    <option value="IN_PROGRESS">Đang tiến hành</option>
                    <option value="PENDING_CONFIRMATION">Chờ xác nhận</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-lg">Không tìm thấy yêu cầu bảo trì nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-3.5 px-4 font-semibold text-gray-500 whitespace-nowrap">Chi tiết vấn đề</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-gray-500 whitespace-nowrap">Đối tượng bảo trì</th>
                                    <th className="text-center py-3.5 px-4 font-semibold text-gray-500 whitespace-nowrap">Phân loại</th>
                                    <th className="text-center py-3.5 px-4 font-semibold text-gray-500 whitespace-nowrap">Mức độ</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-gray-500 whitespace-nowrap">Ngày yêu cầu</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-gray-500 whitespace-nowrap">Ngày hoàn tất</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-gray-500 whitespace-nowrap">Thợ phụ trách</th>
                                    <th className="text-center py-3.5 px-4 font-semibold text-gray-500 whitespace-nowrap">Trạng thái</th>
                                    <th className="text-center py-3.5 px-4 font-semibold text-gray-500 whitespace-nowrap">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((r) => (
                                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-4 px-4">
                                            <p className="font-semibold text-gray-800">{r.title}</p>
                                            {r.description && (
                                                <p className="text-xs text-gray-400 mt-1 max-w-xs truncate" title={r.description}>
                                                    {r.description}
                                                </p>
                                            )}
                                            {r.images?.length > 0 && (
                                                <div className="mt-2 flex gap-1.5">
                                                    {r.images.slice(0, 3).map((image) => (
                                                        <a
                                                            key={image.publicId || image.imageUrl}
                                                            href={image.imageUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="block h-10 w-10 overflow-hidden rounded-lg border border-gray-100 bg-gray-50"
                                                        >
                                                            <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                                                        </a>
                                                    ))}
                                                    {r.images.length > 3 && (
                                                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-bold text-gray-500">
                                                            +{r.images.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {countWorkLogImages(r) > 0 && (
                                                <button
                                                    onClick={() => setSelectedEvidenceRecord(r)}
                                                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">image</span>
                                                    Xem ảnh thợ ({countWorkLogImages(r)})
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 font-medium text-gray-700">
                                            <span>{r.targetName}</span>
                                            {r.targetType === "EQUIPMENT" && (
                                                <p className="text-xs text-amber-600 mt-0.5 font-bold">Số lượng: {r.equipmentMaintenanceQty || 1}</p>
                                            )}
                                            {r.targetLocation && (
                                                <p className="text-xs text-gray-400 mt-0.5">{r.targetLocation}</p>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
                                                {r.targetType === "COURT" ? "Sân" : "Thiết bị"}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${severityColors[r.severity]}`}>
                                                {severityLabels[r.severity] || r.severity}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-gray-500 text-xs">{formatDate(r.maintenanceDate)}</td>
                                        <td className="py-4 px-4 text-gray-500 text-xs">{formatDate(r.completedDate)}</td>
                                        <td className="py-4 px-4 text-gray-600 text-xs">
                                            {r.assignedStaffId ? (
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-gray-800">{r.assignedStaffId.fullName}</p>
                                                    <p className="text-gray-400">{r.assignedStaffId.phone || r.assignedStaffId.email}</p>
                                                    <button
                                                        onClick={() => setSelectedEvidenceRecord(r)}
                                                        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline mt-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">track_changes</span>
                                                        Xem lộ trình
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <span className="text-gray-400">Chưa phân công</span>
                                                    <button
                                                        onClick={() => setSelectedEvidenceRecord(r)}
                                                        className="block text-[11px] font-bold text-primary hover:underline mt-1"
                                                    >
                                                        Xem chi tiết
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusColors[r.status]}`}>
                                                {statusLabels[r.status] || r.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                {r.status !== "COMPLETED" && (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <select
                                                            value={selectedStaff[r._id] || ""}
                                                            onChange={(e) => setSelectedStaff(prev => ({ ...prev, [r._id]: e.target.value }))}
                                                            className="max-w-[180px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-primary"
                                                        >
                                                            <option value="">Chọn thợ</option>
                                                            {staff
                                                                .filter(s => s.maintenanceSkills?.includes(r.targetType))
                                                                .map(s => (
                                                                    <option key={s._id} value={s._id}>{s.fullName}</option>
                                                                ))}
                                                        </select>
                                                        <button
                                                            onClick={() => handleAssignStaff(r)}
                                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                                                        >
                                                            Gán
                                                        </button>
                                                    </div>
                                                )}
                                                {r.status === "PENDING_CONFIRMATION" && (
                                                    <>
                                                        {countWorkLogImages(r) > 0 && (
                                                            <button
                                                                onClick={() => setSelectedEvidenceRecord(r)}
                                                                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                                                            >
                                                                Xem ảnh thợ
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleStatusUpdate(r._id, "COMPLETED")}
                                                            className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                                                        >
                                                            Xác nhận hoàn tất
                                                        </button>
                                                    </>
                                                )}
                                                {r.status === "REPORTED" && !r.assignedStaffId && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(r._id, "IN_PROGRESS")}
                                                        className="px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                                                    >
                                                        Tự xử lý
                                                    </button>
                                                )}
                                                {r.status === "IN_PROGRESS" && !r.assignedStaffId && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(r._id, "COMPLETED")}
                                                        className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                                                    >
                                                        Hoàn thành trực tiếp
                                                    </button>
                                                )}
                                                {r.status === "COMPLETED" && (
                                                    <span className="text-gray-400 text-xs font-semibold">✓ Đã xong</span>
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
            {selectedEvidenceRecord && (
                <MaintenanceEvidenceModal
                    record={selectedEvidenceRecord}
                    onClose={() => setSelectedEvidenceRecord(null)}
                />
            )}
        </div>
    );
}
