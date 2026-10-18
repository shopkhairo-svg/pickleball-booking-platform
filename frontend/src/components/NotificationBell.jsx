import { useEffect, useState } from "react";
import { notificationService } from "@/services/notification.service";
import { useAuthStore } from "@/store/authStore";

export default function NotificationBell() {
    const { isAuthenticated, accessToken } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toast, setToast] = useState(null);

    const fetchNotifications = async () => {
        if (!isAuthenticated) return;
        const res = await notificationService.getNotifications();
        if (res.success) {
            setNotifications(res.notifications || []);
            setUnreadCount(res.unreadCount || 0);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchNotifications().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated || !accessToken) return undefined;

        const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
        const source = new EventSource(`${baseUrl}/notifications/stream?token=${encodeURIComponent(accessToken)}`);

        source.addEventListener("notification", (event) => {
            const notification = JSON.parse(event.data);
            setNotifications(prev => [notification, ...prev].slice(0, 20));
            setUnreadCount(prev => prev + 1);
            setToast(notification);
            setTimeout(() => setToast(null), 4000);
        });

        return () => source.close();
    }, [isAuthenticated, accessToken]);

    if (!isAuthenticated) return null;

    const handleMarkAllRead = async () => {
        await notificationService.markAllRead();
        setUnreadCount(0);
        setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className="relative rounded-full p-2 text-on-surface-variant transition-all hover:bg-primary-container hover:text-primary"
                title="Thông báo"
            >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-outline-variant/70 bg-white shadow-soft">
                    <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between">
                        <p className="font-bold text-sm text-on-surface">Thông báo</p>
                        <button onClick={handleMarkAllRead} className="text-xs font-semibold text-primary">Đã đọc</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="p-4 text-sm text-on-surface-variant">Chưa có thông báo.</p>
                        ) : notifications.map(item => (
                            <div key={item._id} className={`border-b border-outline-variant/30 p-4 ${item.isRead ? "bg-white" : "bg-primary-container/60"}`}>
                                <p className="font-bold text-sm text-on-surface">{item.title}</p>
                                <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{item.message || item.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed right-4 top-20 z-[60] w-80 rounded-2xl border border-primary/20 bg-white px-4 py-3 shadow-soft">
                    <p className="font-bold text-sm text-on-surface">{toast.title}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{toast.message || toast.content}</p>
                </div>
            )}
        </div>
    );
}
