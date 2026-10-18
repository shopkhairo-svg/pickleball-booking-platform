import { useCallback, useEffect, useMemo, useState } from "react";
import maintenanceStaffService from "@/services/maintenanceStaff.service";

const statusLabels = {
    ASSIGNED: "Đã phân công",
    IN_PROGRESS: "Đang xử lý",
    PENDING_CONFIRMATION: "Chờ chủ sân xác nhận",
    COMPLETED: "Đã hoàn thành",
};

const statusColors = {
    ASSIGNED: "bg-indigo-100 text-indigo-700 border-indigo-200",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700 border-yellow-200",
    PENDING_CONFIRMATION: "bg-purple-100 text-purple-700 border-purple-200",
    COMPLETED: "bg-green-100 text-green-700 border-green-200",
};

const severityLabels = {
    LOW: "Thấp",
    MEDIUM: "Trung bình",
    HIGH: "Cao",
};

export default function MaintenanceDashboard() {
    const [records, setRecords] = useState([]);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [forms, setForms] = useState({});

    const fetchRecords = useCallback(async () => {
        try {
            setLoading(true);
            const res = await maintenanceStaffService.getMaintenance(status);
            setRecords(res.records || []);
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Không thể tải danh sách bảo trì!");
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            fetchRecords();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [fetchRecords]);

    const stats = useMemo(() => ({
        total: records.length,
        active: records.filter(r => ["ASSIGNED", "IN_PROGRESS"].includes(r.status)).length,
        waiting: records.filter(r => r.status === "PENDING_CONFIRMATION").length,
    }), [records]);

    const updateForm = (id, patch) => {
        setForms(prev => ({
            ...prev,
            [id]: { ...(prev[id] || { note: "", images: [] }), ...patch }
        }));
    };

    const submitProgress = async (record, nextStatus) => {
        const formState = forms[record._id] || { note: "", images: [] };
        if (nextStatus === "PENDING_CONFIRMATION" && !formState.note.trim()) {
            alert("Vui lòng nhập ghi chú xử lý trước khi gửi chờ xác nhận!");
            return;
        }

        const formData = new FormData();
        formData.append("status", nextStatus);
        formData.append("note", formState.note || "");
        Array.from(formState.images || []).forEach(file => formData.append("images", file));

        try {
            await maintenanceStaffService.updateProgress(record._id, formData);
            alert("Cập nhật tiến độ thành công!");
            updateForm(record._id, { note: "", images: [] });
            fetchRecords();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Không thể cập nhật tiến độ!");
        }
    };

    const formatDate = (value) => {
        if (!value) return "—";
        return new Date(value).toLocaleDateString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Công việc bảo trì</h1>
                    <p className="mt-1 text-gray-500">Cập nhật tiến độ xử lý và gửi ảnh minh chứng cho chủ sở hữu xác nhận</p>
                </div>
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-primary lg:w-64"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="ASSIGNED">Đã phân công</option>
                    <option value="IN_PROGRESS">Đang xử lý</option>
                    <option value="PENDING_CONFIRMATION">Chờ xác nhận</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                </select>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase text-gray-400">Tổng việc</p>
                    <p className="mt-2 text-2xl font-black text-gray-800">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase text-gray-400">Đang cần xử lý</p>
                    <p className="mt-2 text-2xl font-black text-yellow-600">{stats.active}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase text-gray-400">Chờ xác nhận</p>
                    <p className="mt-2 text-2xl font-black text-purple-600">{stats.waiting}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-gray-100 bg-white">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : records.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-white py-14 text-center text-gray-400">
                    Không có yêu cầu bảo trì nào
                </div>
            ) : (
                <div className="grid gap-4">
                    {records.map(record => {
                        const formState = forms[record._id] || { note: "", images: [] };
                        const isClosed = record.status === "COMPLETED";
                        const canStart = record.status === "ASSIGNED";
                        const canSubmit = ["ASSIGNED", "IN_PROGRESS"].includes(record.status);

                        return (
                            <article key={record._id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusColors[record.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                                {statusLabels[record.status] || record.status}
                                            </span>
                                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                                                {record.targetType === "COURT" ? "Sân" : "Thiết bị"}
                                            </span>
                                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                                                {severityLabels[record.severity] || record.severity}
                                            </span>
                                        </div>
                                        <h2 className="mt-3 text-lg font-black text-gray-900">{record.title}</h2>
                                        <p className="mt-1 text-sm text-gray-500">{record.description || "Không có mô tả chi tiết"}</p>

                                        <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-3">
                                            <div>
                                                <p className="text-xs font-bold uppercase text-gray-400">Đối tượng</p>
                                                <p className="mt-1 font-semibold text-gray-800">{record.targetName}</p>
                                                <p className="text-xs text-gray-400">{record.targetLocation || record.targetEquipmentType || ""}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase text-gray-400">Chủ sở hữu</p>
                                                <p className="mt-1 font-semibold text-gray-800">{record.assignedVendorId?.fullName || "—"}</p>
                                                <p className="text-xs text-gray-400">{record.assignedVendorId?.phone || record.assignedVendorId?.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase text-gray-400">Ngày yêu cầu</p>
                                                <p className="mt-1 font-semibold text-gray-800">{formatDate(record.maintenanceDate || record.createdAt)}</p>
                                            </div>
                                        </div>

                                        {record.images?.length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {record.images.map(image => (
                                                    <a
                                                        key={image.publicId || image.imageUrl}
                                                        href={image.imageUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="h-16 w-16 overflow-hidden rounded-lg border border-gray-100 bg-gray-50"
                                                    >
                                                        <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full rounded-xl border border-gray-100 bg-gray-50 p-4 xl:w-[360px]">
                                        {isClosed ? (
                                            <div className="text-sm font-semibold text-green-700">Chủ sở hữu đã xác nhận hoàn tất.</div>
                                        ) : (
                                            <div className="space-y-3">
                                                <textarea
                                                    value={formState.note}
                                                    onChange={(event) => updateForm(record._id, { note: event.target.value })}
                                                    rows={3}
                                                    placeholder="Ghi chú tình trạng xử lý..."
                                                    className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                                                />
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={(event) => updateForm(record._id, { images: event.target.files })}
                                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
                                                />
                                                <div className="flex flex-wrap gap-2">
                                                    {canStart && (
                                                        <button
                                                            onClick={() => submitProgress(record, "IN_PROGRESS")}
                                                            className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-bold text-yellow-700 hover:bg-yellow-100"
                                                        >
                                                            Bắt đầu xử lý
                                                        </button>
                                                    )}
                                                    {canSubmit && (
                                                        <button
                                                            onClick={() => submitProgress(record, "PENDING_CONFIRMATION")}
                                                            className="rounded-lg border border-primary/20 bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90"
                                                        >
                                                            Gửi chờ xác nhận
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
