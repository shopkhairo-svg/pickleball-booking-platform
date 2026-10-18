import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { engagementService } from "@/services/engagement.service";
import { useAuthStore } from "@/store/authStore";

export default function FavoriteButton({ courtId, compact = false, onChange }) {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        if (!isAuthenticated || !courtId) return undefined;

        engagementService.getFavoriteStatus(courtId)
            .then(res => {
                if (mounted && res.success) setIsFavorite(res.isFavorite);
            })
            .catch(() => {});

        return () => { mounted = false; };
    }, [courtId, isAuthenticated]);

    const handleToggle = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!isAuthenticated) {
            navigate("/login");
            return;
        }

        setLoading(true);
        try {
            const res = await engagementService.toggleFavorite(courtId);
            if (res.success) {
                setIsFavorite(res.isFavorite);
                onChange?.(res.isFavorite);
            }
        } catch (error) {
            alert(error.response?.data?.message || "Không thể cập nhật yêu thích!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            title={isFavorite ? "Bỏ yêu thích" : "Thêm yêu thích"}
            className={`inline-flex items-center justify-center rounded-full transition-all ${
                compact
                    ? "w-9 h-9 bg-white/90 shadow text-rose-500 hover:bg-white"
                    : "px-4 py-2 gap-2 bg-white border border-outline-variant text-on-surface hover:border-rose-300 hover:text-rose-600"
            } ${loading ? "opacity-60" : ""}`}
        >
            <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
            >
                favorite
            </span>
            {!compact && <span className="text-sm font-bold">{isFavorite ? "Đã yêu thích" : "Yêu thích"}</span>}
        </button>
    );
}
