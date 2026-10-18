import CourtCard from "@/components/CourtCard";

export default function CourtRail({ title, courts = [], emptyText = "Chưa có dữ liệu phù hợp." }) {
    if (!courts.length) {
        return (
            <section className="space-y-3">
                <h2 className="text-2xl font-black text-on-surface">{title}</h2>
                <div className="surface-panel-flat p-6 text-sm text-on-surface-variant">
                    {emptyText}
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-black text-on-surface">{title}</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                {courts.map(court => (
                    <CourtCard key={court._id} court={court} />
                ))}
            </div>
        </section>
    );
}
