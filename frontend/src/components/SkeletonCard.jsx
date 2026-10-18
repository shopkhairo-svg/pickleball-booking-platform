// src/components/SkeletonCard.jsx
export default function SkeletonCard() {
    return (
        <div className="surface-panel-flat overflow-hidden">
            <div className="shimmer relative h-56 w-full bg-surface-container">
                <div className="absolute bottom-3 left-3 h-8 w-36 rounded-xl bg-white/55" />
            </div>

            <div className="space-y-4 p-5">
                <div className="h-6 w-4/5 rounded-lg bg-surface-container-high" />
                <div className="h-3.5 w-3/5 rounded-lg bg-surface-container" />
                <div className="grid grid-cols-3 gap-2">
                    <div className="h-9 rounded-xl bg-surface-container" />
                    <div className="h-9 rounded-xl bg-surface-container" />
                    <div className="h-9 rounded-xl bg-surface-container" />
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4">
                    <div className="w-1/3 space-y-1.5">
                        <div className="h-2.5 rounded bg-surface-container" />
                        <div className="h-6 w-4/5 rounded bg-surface-container-high" />
                    </div>
                    <div className="h-10 w-24 rounded-xl bg-surface-container-high" />
                </div>
            </div>
        </div>
    );
}
