import { useEffect, useState } from "react";
import { commerceService } from "@/services/commerce.service";

const emptyForm = {
    code: "",
    name: "",
    description: "",
    discountType: "PERCENT",
    discountValue: 10,
    minOrderValue: 0,
    maxDiscountValue: "",
    usageLimit: "",
    perUserLimit: 1,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "ACTIVE"
};

const statusBadge = {
    ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
    INACTIVE: "bg-gray-100 text-gray-600 border-gray-200",
    EXPIRED: "bg-red-100 text-red-600 border-red-200",
};

const discountTypeLabel = {
    PERCENT: { label: "Giảm %", icon: "percent", color: "text-blue-600 bg-blue-50" },
    FIXED: { label: "Giảm tiền", icon: "payments", color: "text-purple-600 bg-purple-50" },
};

function InputField({ label, icon, required, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                {icon && <span className="material-symbols-outlined text-[14px] text-gray-400">{icon}</span>}
                {label}
                {required && <span className="text-red-400">*</span>}
            </label>
            {children}
        </div>
    );
}

export default function CouponManagement() {
    const [coupons, setCoupons] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [showForm, setShowForm] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const res = await commerceService.getAdminCoupons();
            if (res.success) setCoupons(res.coupons || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCoupons(); }, []);

    const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const showMsg = (text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: "", type: "" });
        try {
            const payload = {
                ...form,
                discountValue: Number(form.discountValue),
                minOrderValue: Number(form.minOrderValue || 0),
                maxDiscountValue: form.maxDiscountValue ? Number(form.maxDiscountValue) : null,
                usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
                perUserLimit: Number(form.perUserLimit || 1),
            };
            const res = await commerceService.createCoupon(payload);
            if (res.success) {
                setForm(emptyForm);
                setShowForm(false);
                showMsg(res.message || "Tạo mã giảm giá thành công!", "success");
                fetchCoupons();
            }
        } catch (error) {
            showMsg(error.response?.data?.message || "Không thể lưu mã giảm giá!", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xóa mã giảm giá này?")) return;
        setDeletingId(id);
        try {
            await commerceService.deleteCoupon(id);
            showMsg("Đã xóa mã giảm giá!", "success");
            fetchCoupons();
        } catch (err) {
            showMsg(err?.response?.data?.message || "Không thể xóa!", "error");
        } finally {
            setDeletingId(null);
        }
    };

    const inputCls = "admin-input w-full";
    const selectCls = inputCls;

    const totalActive = coupons.filter(c => c.status === "ACTIVE").length;
    const totalUsed = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

    return (
        <div className="space-y-6">
            {/* ─── Page Header ─── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="admin-page-title">Quản lý mã giảm giá</h1>
                    <p className="admin-page-subtitle">Tạo và quản lý coupon khuyến mãi cho người dùng</p>
                </div>
                <button
                    onClick={() => { setShowForm(v => !v); setMessage({ text: "", type: "" }); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                        showForm
                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            : "bg-primary text-white hover:bg-on-primary-container shadow-primary/20"
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">
                        {showForm ? "close" : "add"}
                    </span>
                    {showForm ? "Đóng form" : "Tạo coupon mới"}
                </button>
            </div>

            {/* ─── Stats ─── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Tổng coupon", value: coupons.length, icon: "confirmation_number", color: "text-blue-600 bg-blue-50" },
                    { label: "Đang hoạt động", value: totalActive, icon: "check_circle", color: "text-emerald-600 bg-emerald-50" },
                    { label: "Tổng lượt dùng", value: totalUsed, icon: "how_to_vote", color: "text-purple-600 bg-purple-50" },
                ].map(s => (
                    <div key={s.label} className="admin-card flex items-center gap-3 p-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${s.color}`}>
                            <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-gray-800">{s.value}</p>
                            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Toast message ─── */}
            {message.text && (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold border ${
                    message.type === "success"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-600 border-red-200"
                }`}>
                    <span className="material-symbols-outlined text-[18px]">
                        {message.type === "success" ? "check_circle" : "error"}
                    </span>
                    {message.text}
                </div>
            )}

            {/* ─── Create Form ─── */}
            {showForm && (
                <div className="admin-card overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-container">
                            <span className="material-symbols-outlined text-primary text-[18px]">confirmation_number</span>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Tạo mã giảm giá mới</h2>
                            <p className="text-xs text-gray-500">Điền đầy đủ thông tin bên dưới</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Mã code */}
                            <InputField label="Mã code" icon="tag" required>
                                <input
                                    value={form.code}
                                    onChange={e => handleChange("code", e.target.value.toUpperCase())}
                                    placeholder="VD: SUMMER30"
                                    className={inputCls + " font-mono font-bold tracking-widest"}
                                    required
                                />
                            </InputField>

                            {/* Tên mã */}
                            <InputField label="Tên mã giảm giá" icon="label" required>
                                <input
                                    value={form.name}
                                    onChange={e => handleChange("name", e.target.value)}
                                    placeholder="VD: Giảm 30% mùa hè"
                                    className={inputCls}
                                    required
                                />
                            </InputField>

                            {/* Mô tả */}
                            <InputField label="Mô tả" icon="notes">
                                <input
                                    value={form.description}
                                    onChange={e => handleChange("description", e.target.value)}
                                    placeholder="Mô tả ngắn về coupon..."
                                    className={inputCls}
                                />
                            </InputField>

                            {/* Loại giảm */}
                            <InputField label="Loại giảm giá" icon="discount" required>
                                <select
                                    value={form.discountType}
                                    onChange={e => handleChange("discountType", e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="PERCENT">Giảm theo % (phần trăm)</option>
                                    <option value="FIXED">Giảm tiền cố định</option>
                                </select>
                            </InputField>

                            {/* Giá trị giảm */}
                            <InputField
                                label={form.discountType === "PERCENT" ? "Phần trăm giảm (%)" : "Số tiền giảm (đ)"}
                                icon="sell"
                                required
                            >
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={0}
                                        max={form.discountType === "PERCENT" ? 100 : undefined}
                                        value={form.discountValue}
                                        onChange={e => handleChange("discountValue", e.target.value)}
                                        className={inputCls + " pr-10"}
                                        required
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                                        {form.discountType === "PERCENT" ? "%" : "đ"}
                                    </span>
                                </div>
                            </InputField>

                            {/* Đơn tối thiểu */}
                            <InputField label="Giá trị đơn tối thiểu (đ)" icon="shopping_cart">
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.minOrderValue}
                                        onChange={e => handleChange("minOrderValue", e.target.value)}
                                        placeholder="0"
                                        className={inputCls + " pr-6"}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">đ</span>
                                </div>
                            </InputField>

                            {/* Giảm tối đa */}
                            <InputField label="Giảm tối đa (đ) — nếu có" icon="money_off">
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.maxDiscountValue}
                                        onChange={e => handleChange("maxDiscountValue", e.target.value)}
                                        placeholder="Không giới hạn"
                                        className={inputCls + " pr-6"}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">đ</span>
                                </div>
                            </InputField>

                            {/* Tổng lượt dùng */}
                            <InputField label="Tổng lượt dùng" icon="how_to_vote">
                                <input
                                    type="number"
                                    min={1}
                                    value={form.usageLimit}
                                    onChange={e => handleChange("usageLimit", e.target.value)}
                                    placeholder="Không giới hạn"
                                    className={inputCls}
                                />
                            </InputField>

                            {/* Lượt/user */}
                            <InputField label="Lượt dùng tối đa / người" icon="person" required>
                                <input
                                    type="number"
                                    min={1}
                                    value={form.perUserLimit}
                                    onChange={e => handleChange("perUserLimit", e.target.value)}
                                    className={inputCls}
                                    required
                                />
                            </InputField>

                            {/* Ngày bắt đầu */}
                            <InputField label="Ngày bắt đầu" icon="calendar_today" required>
                                <input
                                    type="date"
                                    value={form.startDate}
                                    onChange={e => handleChange("startDate", e.target.value)}
                                    className={inputCls}
                                    required
                                />
                            </InputField>

                            {/* Ngày kết thúc */}
                            <InputField label="Ngày kết thúc" icon="event" required>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={e => handleChange("endDate", e.target.value)}
                                    min={form.startDate}
                                    className={inputCls}
                                    required
                                />
                            </InputField>

                            {/* Trạng thái */}
                            <InputField label="Trạng thái" icon="toggle_on">
                                <select
                                    value={form.status}
                                    onChange={e => handleChange("status", e.target.value)}
                                    className={selectCls}
                                >
                                        <option value="ACTIVE">Hoạt động</option>
                                        <option value="INACTIVE">Tạm dừng</option>
                                </select>
                            </InputField>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary disabled:opacity-60"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                        Tạo mã giảm giá
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setForm(emptyForm); setMessage({ text: "", type: "" }); }}
                                className="btn-secondary"
                            >
                                <span className="material-symbols-outlined text-[18px]">refresh</span>
                                Đặt lại
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ─── Coupon List ─── */}
            <div className="admin-card overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-700">
                        Danh sách mã giảm giá
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">{coupons.length}</span>
                    </h2>
                </div>

                {loading ? (
                    <div className="py-16 text-center">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-gray-400">Đang tải...</p>
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-gray-300 text-4xl">confirmation_number</span>
                        </div>
                        <p className="text-gray-500 font-semibold">Chưa có mã giảm giá nào</p>
                        <p className="text-sm text-gray-400 mt-1">Nhấn "Tạo coupon mới" để bắt đầu</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-xs font-bold text-gray-500">
                                    <th className="text-left px-5 py-3">Mã code</th>
                                    <th className="text-left px-5 py-3">Tên / Mô tả</th>
                                    <th className="text-left px-5 py-3">Loại & Giá trị</th>
                                    <th className="text-left px-5 py-3">Điều kiện</th>
                                    <th className="text-left px-5 py-3">Lượt dùng</th>
                                    <th className="text-left px-5 py-3">Thời hạn</th>
                                    <th className="text-left px-5 py-3">Trạng thái</th>
                                    <th className="text-right px-5 py-3">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {coupons.map(coupon => {
                                    const typeInfo = discountTypeLabel[coupon.discountType] || discountTypeLabel.FIXED;
                                    const isExpired = new Date(coupon.endDate) < new Date();
                                    const displayStatus = isExpired && coupon.status === "ACTIVE" ? "EXPIRED" : coupon.status;
                                    return (
                                        <tr key={coupon._id} className="hover:bg-gray-50/60 transition-colors">
                                            {/* Code */}
                                            <td className="px-5 py-4">
                                                <span className="font-mono font-black text-primary bg-primary/8 px-2.5 py-1 rounded-lg text-sm tracking-wider border border-primary/20">
                                                    {coupon.code}
                                                </span>
                                            </td>

                                            {/* Tên */}
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-gray-800">{coupon.name}</p>
                                                {coupon.description && (
                                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{coupon.description}</p>
                                                )}
                                            </td>

                                            {/* Loại & giá trị */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${typeInfo.color}`}>
                                                        <span className="material-symbols-outlined text-[12px]">{typeInfo.icon}</span>
                                                        {typeInfo.label}
                                                    </span>
                                                </div>
                                                <p className="font-black text-gray-800 mt-1">
                                                    {coupon.discountType === "PERCENT"
                                                        ? `${coupon.discountValue}%`
                                                        : coupon.discountType === "FIXED"
                                                            ? `${coupon.discountValue?.toLocaleString("vi-VN")}đ`
                                                            : "—"
                                                    }
                                                    {coupon.maxDiscountValue && (
                                                        <span className="text-xs font-normal text-gray-400 ml-1">
                                                            (tối đa {coupon.maxDiscountValue?.toLocaleString("vi-VN")}đ)
                                                        </span>
                                                    )}
                                                </p>
                                            </td>

                                            {/* Điều kiện */}
                                            <td className="px-5 py-4">
                                                <p className="text-gray-700 text-xs">
                                                    Đơn tối thiểu: <span className="font-semibold">{coupon.minOrderValue?.toLocaleString("vi-VN") || 0}đ</span>
                                                </p>
                                                <p className="text-gray-500 text-xs mt-0.5">
                                                    {coupon.perUserLimit} lượt/người
                                                </p>
                                            </td>

                                            {/* Lượt dùng */}
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-black text-gray-800">{coupon.usedCount}</span>
                                                <span className="text-xs font-semibold text-gray-400"> / {coupon.usageLimit ?? "∞"}</span>
                                            </td>

                                            {/* Thời hạn */}
                                            <td className="px-5 py-4">
                                                <p className="text-xs text-gray-500">
                                                    {new Date(coupon.startDate).toLocaleDateString("vi-VN")}
                                                </p>
                                                <p className="text-xs font-semibold text-gray-700">
                                                    → {new Date(coupon.endDate).toLocaleDateString("vi-VN")}
                                                </p>
                                            </td>

                                            {/* Trạng thái */}
                                            <td className="px-5 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadge[displayStatus] || statusBadge.INACTIVE}`}>
                                                    {displayStatus === "ACTIVE" ? "Đang hoạt động"
                                                        : displayStatus === "INACTIVE" ? "Tạm dừng"
                                                            : "Hết hạn"}
                                                </span>
                                            </td>

                                            {/* Thao tác */}
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(coupon._id)}
                                                    disabled={deletingId === coupon._id}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 hover:text-red-700 font-semibold hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 ml-auto"
                                                >
                                                    {deletingId === coupon._id ? (
                                                        <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[15px]">delete</span>
                                                    )}
                                                    Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
