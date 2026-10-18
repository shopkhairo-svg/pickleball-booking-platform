// src/features/court/pages/CourtList.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { courtService } from "@/services/court.service";
import CourtCard from "@/components/CourtCard";
import SkeletonCard from "@/components/SkeletonCard";

export default function CourtList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [courts, setCourts] = useState([]);
    const [pagination, setPagination] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // State cục bộ cho form (chưa áp dụng)
    const [localSearch, setLocalSearch] = useState(searchParams.get("search") || "");
    const [localLocation, setLocalLocation] = useState(searchParams.get("location") || "");
    const [localMinPrice, setLocalMinPrice] = useState(searchParams.get("minPrice") || "");
    const [localMaxPrice, setLocalMaxPrice] = useState(searchParams.get("maxPrice") || "");

    // State đã được áp dụng (dùng để hiển thị chip)
    const [appliedSearch, setAppliedSearch] = useState(searchParams.get("search") || "");
    const [appliedLocation, setAppliedLocation] = useState(searchParams.get("location") || "");
    const [appliedMinPrice, setAppliedMinPrice] = useState(searchParams.get("minPrice") || "");
    const [appliedMaxPrice, setAppliedMaxPrice] = useState(searchParams.get("maxPrice") || "");

    const type = searchParams.get("type") || "";
    const page = searchParams.get("page") || "1";

    // Đồng bộ state cục bộ khi URL thay đổi từ bên ngoài
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const newSearch = searchParams.get("search") || "";
            const newLocation = searchParams.get("location") || "";
            const newMinPrice = searchParams.get("minPrice") || "";
            const newMaxPrice = searchParams.get("maxPrice") || "";

            setLocalSearch(newSearch);
            setLocalLocation(newLocation);
            setLocalMinPrice(newMinPrice);
            setLocalMaxPrice(newMaxPrice);

            setAppliedSearch(newSearch);
            setAppliedLocation(newLocation);
            setAppliedMinPrice(newMinPrice);
            setAppliedMaxPrice(newMaxPrice);
        }, 0);

        return () => window.clearTimeout(timer);
    }, [searchParams]);

    // Gọi API khi URL thay đổi
    useEffect(() => {
        let isMounted = true;
        const timer = window.setTimeout(() => {
            setIsLoading(true);

            const params = Object.fromEntries([...searchParams]);
            if (!params.page) params.page = "1";

            courtService.getCourts(params)
                .then(res => {
                    if (res.success && isMounted) {
                        setCourts(res.courts);
                        setPagination(res.pagination);
                    }
                })
                .catch(err => console.error("Lỗi fetch danh sách sân:", err))
                .finally(() => {
                    if (isMounted) setIsLoading(false);
                });
        }, 0);

        return () => {
            isMounted = false;
            window.clearTimeout(timer);
        };
    }, [searchParams]);

    // Cập nhật filter dạng click (type, page) - Áp dụng ngay
    const updateFilter = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("page", "1");
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };

    // Áp dụng bộ lọc từ sidebar
    const handleApplyFilters = (e) => {
        e.preventDefault();
        const newParams = new URLSearchParams(searchParams);
        newParams.set("page", "1");

        if (localSearch.trim()) newParams.set("search", localSearch.trim());
        else newParams.delete("search");

        if (localLocation.trim()) newParams.set("location", localLocation.trim());
        else newParams.delete("location");

        if (localMinPrice) newParams.set("minPrice", localMinPrice);
        else newParams.delete("minPrice");

        if (localMaxPrice) newParams.set("maxPrice", localMaxPrice);
        else newParams.delete("maxPrice");

        setSearchParams(newParams);
        setIsFilterOpen(false);

        // Cập nhật applied state
        setAppliedSearch(localSearch.trim());
        setAppliedLocation(localLocation.trim());
        setAppliedMinPrice(localMinPrice);
        setAppliedMaxPrice(localMaxPrice);
    };

    // Reset tất cả bộ lọc
    const handleResetAll = () => {
        setSearchParams({});
        setLocalSearch("");
        setLocalLocation("");
        setLocalMinPrice("");
        setLocalMaxPrice("");
        setAppliedSearch("");
        setAppliedLocation("");
        setAppliedMinPrice("");
        setAppliedMaxPrice("");
    };

    // Xóa một filter cụ thể
    const removeFilter = (filterName) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("page", "1");
        newParams.delete(filterName);
        setSearchParams(newParams);

        if (filterName === "search") setLocalSearch("");
        if (filterName === "location") setLocalLocation("");
        if (filterName === "minPrice") setLocalMinPrice("");

        if (filterName === "maxPrice") setLocalMaxPrice("");
    };

    const hasActiveFilters = appliedSearch || appliedLocation || type || appliedMinPrice || appliedMaxPrice;

    return (
        <div className="min-h-screen bg-background">
            <div className="app-shell py-8 lg:py-10">

                <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-200/50 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="section-heading">
                            Khám phá sân bóng
                        </h1>
                        <p className="muted-copy mt-2 max-w-xl">
                            {pagination.totalItems || 0} sân đang sẵn sàng đặt lịch, lọc theo khu vực, loại sân và mức giá.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="btn-primary lg:hidden"
                    >
                        <span className="material-symbols-outlined text-[18px]">tune</span>
                        {hasActiveFilters ? "Đang lọc" : "Lọc sân"}
                        {hasActiveFilters && (
                            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                                {[appliedSearch, appliedLocation, type, appliedMinPrice, appliedMaxPrice].filter(Boolean).length}
                            </span>
                        )}
                    </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    <aside className={`
                        lg:w-80 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto
                        ${isFilterOpen ? "fixed inset-0 z-50 bg-black/50 lg:relative lg:bg-transparent" : "hidden lg:block"}
                    `}>
                        <form onSubmit={handleApplyFilters} className={`
                            surface-panel
                            ${isFilterOpen ? "absolute inset-x-4 top-20 bottom-4 overflow-y-auto" : ""}
                            lg:relative lg:inset-auto lg:overflow-visible
                        `}>
                            <div className="flex items-center justify-between border-b border-zinc-100 p-5">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px] text-primary">tune</span>
                                    <h2 className="text-sm font-bold text-zinc-800">Bộ lọc sân</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsFilterOpen(false)}
                                    className="lg:hidden p-2 rounded-full hover:bg-zinc-50 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>

                            <div className="p-5 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-1 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[16px]">search</span>
                                        Tìm kiếm
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Tên câu lạc bộ..."
                                        value={localSearch}
                                        onChange={(e) => setLocalSearch(e.target.value)}
                                        className="field-control"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-1 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                                        Khu vực / Quận huyện
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Thủ Đức, Quận 7..."
                                        value={localLocation}
                                        onChange={(e) => setLocalLocation(e.target.value)}
                                        className="field-control"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Loại sân</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: "", label: "Tất cả", icon: "grid_view" },
                                            { value: "INDOOR", label: "Trong nhà", icon: "home" },
                                            { value: "OUTDOOR", label: "Ngoài trời", icon: "park" }
                                        ].map((t) => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => updateFilter("type", t.value)}
                                                className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-[10px] font-bold transition-all ${
                                                    type === t.value
                                                        ? "bg-primary text-white shadow-sm"
                                                        : "border border-zinc-200 bg-white text-zinc-500 hover:border-primary/45 hover:text-primary"
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-1 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[16px]">attach_money</span>
                                        Giá mỗi giờ
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                placeholder="Từ (đ)"
                                                value={localMinPrice}
                                                onChange={(e) => setLocalMinPrice(e.target.value)}
                                                className="field-control px-2.5 py-2"
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-zinc-400">đến</span>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                placeholder="Đến (đ)"
                                                value={localMaxPrice}
                                                onChange={(e) => setLocalMaxPrice(e.target.value)}
                                                className="field-control px-2.5 py-2"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <button
                                        type="submit"
                                        className="btn-primary w-full py-2.5 text-xs"
                                    >
                                        Áp dụng bộ lọc
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetAll}
                                        className="btn-secondary w-full py-2.5 text-xs"
                                    >
                                        Xóa tất cả
                                    </button>
                                </div>
                            </div>
                        </form>
                    </aside>

                    <main className="flex-1 space-y-6">
                        {hasActiveFilters && (
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/50 bg-zinc-50/50 p-2.5">
                                <span className="text-xs font-bold text-zinc-500">Đang lọc:</span>
                                {appliedSearch && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-2 py-1 text-xs font-bold text-on-primary-container">
                                        {appliedSearch.length > 20 ? appliedSearch.slice(0, 20) + "..." : appliedSearch}
                                        <button onClick={() => removeFilter("search")} className="hover:bg-primary/20 rounded-full p-0.5">
                                            <span className="material-symbols-outlined text-[12px]">close</span>
                                        </button>
                                    </span>
                                )}
                                {appliedLocation && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-2 py-1 text-xs font-bold text-on-primary-container">
                                        {appliedLocation}
                                        <button onClick={() => removeFilter("location")} className="hover:bg-primary/20 rounded-full p-0.5">
                                            <span className="material-symbols-outlined text-[12px]">close</span>
                                        </button>
                                    </span>
                                )}
                                {type && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-2 py-1 text-xs font-bold text-on-primary-container">
                                        {type === "INDOOR" ? "Trong nhà" : "Ngoài trời"}
                                        <button onClick={() => updateFilter("type", "")} className="hover:bg-primary/20 rounded-full p-0.5">
                                            <span className="material-symbols-outlined text-[12px]">close</span>
                                        </button>
                                    </span>
                                )}
                                {(appliedMinPrice || appliedMaxPrice) && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-2 py-1 text-xs font-bold text-on-primary-container">
                                        {appliedMinPrice || "0"}đ - {appliedMaxPrice || "∞"}đ
                                        <button onClick={() => { removeFilter("minPrice"); removeFilter("maxPrice"); }} className="hover:bg-primary/20 rounded-full p-0.5">
                                            <span className="material-symbols-outlined text-[12px]">close</span>
                                        </button>
                                    </span>
                                )}
                                <button
                                    onClick={handleResetAll}
                                    className="ml-2 text-xs font-bold text-primary hover:underline"
                                >
                                    Xóa tất cả
                                </button>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold tracking-tight text-zinc-900">
                                Sân khả dụng
                                <span className="ml-1.5 text-xs font-semibold text-zinc-400">({pagination.totalItems || 0} kết quả)</span>
                            </h2>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : courts.length === 0 ? (
                            <div className="surface-panel-flat px-6 py-16 text-center">
                                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-zinc-50 border border-zinc-100">
                                    <span className="material-symbols-outlined text-2xl text-zinc-400">search_off</span>
                                </div>
                                <h3 className="mb-1.5 text-base font-bold text-zinc-800">Không tìm thấy sân bóng</h3>
                                <p className="mx-auto mb-6 max-w-sm text-xs text-zinc-400 leading-relaxed">Thử nới khoảng giá, bỏ loại sân hoặc đổi khu vực tìm kiếm.</p>
                                <button
                                    onClick={handleResetAll}
                                    className="btn-primary py-2.5 px-4 text-xs"
                                >
                                    Xóa tất cả bộ lọc
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {courts.map(court => (
                                        <CourtCard key={court._id} court={court} />
                                    ))}
                                </div>

                                {pagination.totalPages > 1 && (
                                    <div className="pt-8 flex justify-center items-center gap-1">
                                        <button
                                            disabled={parseInt(page) === 1}
                                            onClick={() => updateFilter("page", parseInt(page) - 1)}
                                            className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 hover:border-primary hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                        </button>

                                        {[...Array(Math.min(pagination.totalPages, 5))].map((_, idx) => {
                                            const total = pagination.totalPages;
                                            const current = parseInt(page);
                                            let pNum;

                                            if (total <= 5) {
                                                pNum = idx + 1;
                                            } else if (current <= 3) {
                                                pNum = idx + 1;
                                                if (idx === 4) pNum = total;
                                            } else if (current >= total - 2) {
                                                pNum = total - 4 + idx;
                                            } else {
                                                pNum = current - 2 + idx;
                                                if (idx === 4) pNum = total;
                                            }

                                            if (idx === 3 && total > 5 && current < total - 2 && current > 3) {
                                                return <span key="ellipsis" className="px-2 text-zinc-400">...</span>;
                                            }

                                            return (
                                                <button
                                                    key={pNum}
                                                    onClick={() => updateFilter("page", pNum)}
                                                    className={`w-9 h-9 rounded-full font-bold text-xs transition-all ${
                                                        current === pNum
                                                            ? "bg-primary text-white shadow-sm"
                                                            : "text-zinc-600 hover:bg-zinc-100"
                                                    }`}
                                                >
                                                    {pNum}
                                                </button>
                                            );
                                        })}

                                        <button
                                            disabled={parseInt(page) === pagination.totalPages}
                                            onClick={() => updateFilter("page", parseInt(page) + 1)}
                                            className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 hover:border-primary hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
