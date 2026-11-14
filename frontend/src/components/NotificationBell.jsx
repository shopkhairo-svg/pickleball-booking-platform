import { useEffect, useState } from "react";
import { notificationService } from "@/services/notification.service";
import { useAuthStore } from "@/store/authStore";

export default function NotificationBell() {
    const { isAuthenticated, accessToken } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) return undefined;

        const baseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
        let stopped = false;
        let source;
        let reconnectTimer;
        let toastTimer;
        let failures = 0;

        const refreshNotifications = async () => {
            // Uses the shared Axios interceptor, including its single concurrent refresh.
            const result = await notificationService.getNotifications();
            if (stopped || !result.success) return;
            setNotifications(result.notifications || []);
            setUnreadCount(result.unreadCount || 0);
        };

        const reconnect = () => {
            if (stopped) return;
            const delay = Math.min(1000 * 2 ** Math.min(failures++, 5), 30000);
            reconnectTimer = setTimeout(async () => {
                try {
                    await refreshNotifications();
                    // A refreshed token triggers this effect again with the new session.
                    if (!stopped && useAuthStore.getState().accessToken === accessToken) connect();
                } catch (error) {
                    if ([401, 403].includes(error.response?.status)) return;
                    reconnect();
                }
            }, delay);
        };

        const connect = () => {
            if (stopped || !accessToken) return;
            source = new EventSource(`${baseUrl}/notifications/stream?token=${encodeURIComponent(accessToken)}`);
            source.addEventListener("ready", () => { failures = 0; });
            source.addEventListener("notification", event => {
                if (stopped) return;
                let notification;
                try { notification = JSON.parse(event.data); } catch { return; }
                if (!notification?._id) return;
                setNotifications(prev => [notification, ...prev.filter(item => item._id !== notification._id)].slice(0, 20));
                setUnreadCount(prev => prev + 1);
                setToast(notification);
                clearTimeout(toastTimer);
                toastTimer = setTimeout(() => { if (!stopped) setToast(null); }, 4000);
            });
            source.onerror = () => {
                // EventSource retries with the same stale URL unless explicitly replaced.
                source.close();
                reconnect();
            };
        };

        void refreshNotifications().catch(error => {
            if (!accessToken && ![401, 403].includes(error.response?.status)) reconnect();
        });
        connect();
        return () => {
            stopped = true;
            source?.close();
            clearTimeout(reconnectTimer);
            clearTimeout(toastTimer);
        };
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
