import { useEffect, useState } from "react";
import CourtCard from "@/components/CourtCard";
import { engagementService } from "@/services/engagement.service";

export default function Favorites() {
    const [courts, setCourts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        engagementService.getFavorites()
            .then(res => {
                if (mounted && res.success) setCourts(res.courts || []);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => { mounted = false; };
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <div className="app-shell py-10">
                <div className="mb-8">
                    <h1 className="section-heading">Sân yêu thích</h1>
                    <p className="muted-copy mt-2">Những sân bạn đã lưu để quay lại nhanh hơn.</p>
                </div>

                {loading ? (
                    <div className="h-40 rounded-2xl bg-surface-container animate-pulse" />
                ) : courts.length === 0 ? (
                    <div className="surface-panel-flat p-10 text-center">
                        <span className="material-symbols-outlined text-[44px] text-outline">favorite</span>
                        <h2 className="text-xl font-black text-on-surface mt-3">Chưa có sân yêu thích</h2>
                        <p className="muted-copy mt-1">Bấm biểu tượng trái tim trên thẻ sân để lưu lại.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {courts.map(court => <CourtCard key={court._id} court={court} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
