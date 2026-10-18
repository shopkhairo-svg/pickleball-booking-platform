import { useEffect, useMemo, useRef, useState } from "react";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/authStore";

const roleMeta = {
    ADMIN: {
        title: "Hồ sơ quản trị viên",
        label: "Quản trị viên",
        icon: "admin_panel_settings",
        subtitle: "Thông tin định danh dùng trong khu vực điều hành hệ thống.",
        fallback: "A",
    },
    VENDOR: {
        title: "Hồ sơ đối tác",
        label: "Đối tác",
        icon: "storefront",
        subtitle: "Thông tin liên hệ hiển thị trong các luồng sân, thiết bị và giao nhận.",
        fallback: "V",
    },
    SHIPPER: {
        title: "Hồ sơ shipper",
        label: "Shipper",
        icon: "local_shipping",
        subtitle: "Thông tin cá nhân dùng khi nhận và cập nhật vận đơn.",
        fallback: "S",
    },
    MAINTENANCE_STAFF: {
        title: "Hồ sơ thợ bảo trì",
        label: "Thợ bảo trì",
        icon: "construction",
        subtitle: "Thông tin liên hệ cho các yêu cầu bảo trì được phân công.",
        fallback: "M",
    },
};

const vendorTypeLabels = {
    COURT: "Chủ sân",
    EQUIPMENT: "Nhà cung cấp thiết bị",
};

const skillLabels = {
    COURT: "Sân",
    EQUIPMENT: "Thiết bị",
};

export default function RoleProfile() {
    const { user: storeUser, accessToken, setAuth } = useAuthStore();
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({ fullName: "", phone: "" });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const fileInputRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        userService.getMyProfile()
            .then((res) => {
                if (!mounted) return;
                const nextProfile = res.user || storeUser;
                setProfile(nextProfile);
                setForm({
                    fullName: nextProfile?.fullName || "",
                    phone: nextProfile?.phone || "",
                });
            })
            .catch(() => {
                if (!mounted) return;
                setProfile(storeUser);
                setForm({
                    fullName: storeUser?.fullName || "",
                    phone: storeUser?.phone || "",
                });
            })
            .finally(() => mounted && setLoading(false));

        return () => {
            mounted = false;
        };
    }, [storeUser]);

    useEffect(() => {
        if (!avatarPreview) return undefined;
        return () => URL.revokeObjectURL(avatarPreview);
    }, [avatarPreview]);

    const displayUser = profile || storeUser || {};
    const meta = roleMeta[displayUser.role] || roleMeta.ADMIN;

    const extraBadges = useMemo(() => {
        const badges = [];
        if (displayUser.role === "VENDOR" && displayUser.vendorType) {
            badges.push(vendorTypeLabels[displayUser.vendorType] || displayUser.vendorType);
        }
        if (displayUser.role === "MAINTENANCE_STAFF" && displayUser.maintenanceSkills?.length) {
            badges.push(`Kỹ năng: ${displayUser.maintenanceSkills.map(skill => skillLabels[skill] || skill).join(", ")}`);
        }
        return badges;
    }, [displayUser]);

    const avatarSrc = avatarPreview || displayUser.avatar;
    const fallbackInitial = displayUser.fullName?.charAt(0)?.toUpperCase() || meta.fallback;

    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setSuccessMsg("");
        setErrorMsg("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setSuccessMsg("");
        setErrorMsg("");

        try {
            const formData = new FormData();
            formData.append("fullName", form.fullName);
            formData.append("phone", form.phone);
            if (avatarFile) formData.append("avatar", avatarFile);

            const res = await userService.updateMyProfile(formData);
            if (res?.success && res.user) {
                setProfile(res.user);
                setAuth(res.user, accessToken);
                setAvatarFile(null);
                setAvatarPreview("");
                setSuccessMsg("Đã cập nhật hồ sơ cá nhân.");
            }
        } catch (err) {
            setErrorMsg(err?.response?.data?.message || "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handleResetAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{meta.title}</h1>
                    <p className="mt-1 text-gray-500">{meta.subtitle}</p>
                </div>
                <span className="inline-flex w-max items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                    {meta.label}
                </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="bg-gray-900 px-6 py-7 text-white">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="group relative h-24 w-24 overflow-hidden rounded-2xl border border-white/15 bg-white/10"
                            title="Đổi ảnh đại diện"
                        >
                            {avatarSrc ? (
                                <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <span className="grid h-full w-full place-items-center text-3xl font-black">
                                    {fallbackInitial}
                                </span>
                            )}
                            <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                                <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                            </span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />

                        <div className="min-w-0 flex-1">
                            {loading ? (
                                <div className="space-y-2">
                                    <div className="h-7 w-48 rounded bg-white/20" />
                                    <div className="h-4 w-64 rounded bg-white/10" />
                                </div>
                            ) : (
                                <>
                                    <h2 className="truncate text-2xl font-black">{displayUser.fullName || meta.label}</h2>
                                    <p className="mt-1 text-sm text-white/65">{displayUser.email}</p>
                                </>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                                    {meta.label}
                                </span>
                                {extraBadges.map((badge) => (
                                    <span key={badge} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                                        {badge}
                                    </span>
                                ))}
                                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                    displayUser.status === "BLOCKED"
                                        ? "border-red-400/30 bg-red-400/15 text-red-200"
                                        : "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"
                                }`}>
                                    {displayUser.status === "BLOCKED" ? "Đã khóa" : "Đang hoạt động"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
                    {avatarPreview && (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                            <div className="flex items-center gap-3">
                                <img src={avatarPreview} alt="Preview" className="h-14 w-14 rounded-xl object-cover" />
                                <div>
                                    <p className="text-sm font-bold text-primary">Ảnh mới đã chọn</p>
                                    <p className="text-xs text-gray-500">Lưu thay đổi để áp dụng ảnh này.</p>
                                </div>
                            </div>
                            <button type="button" onClick={handleResetAvatar} className="text-xs font-bold text-red-500 hover:text-red-600">
                                Hủy ảnh
                            </button>
                        </div>
                    )}

                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700">Họ và tên</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">person</span>
                                <input
                                    value={form.fullName}
                                    onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pl-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                                    placeholder="Nhập họ và tên"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700">Số điện thoại</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">phone</span>
                                <input
                                    value={form.phone}
                                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pl-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                                    placeholder="Nhập số điện thoại"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Email đăng nhập</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">mail</span>
                            <input
                                value={displayUser.email || ""}
                                readOnly
                                className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-10 text-sm text-gray-400 outline-none"
                            />
                        </div>
                    </div>

                    {successMsg && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            {successMsg}
                        </div>
                    )}
                    {errorMsg && (
                        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">save</span>
                                    Lưu hồ sơ
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                        >
                            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                            Đổi ảnh đại diện
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
