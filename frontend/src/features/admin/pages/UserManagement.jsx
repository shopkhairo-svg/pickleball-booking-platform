// src/features/admin/pages/UserManagement.jsx
import { useState, useEffect } from "react";
import adminService from "../../../services/adminService";

const statusColors = {
    ACTIVE: "bg-green-100 text-green-700",
    BLOCKED: "bg-red-100 text-red-700",
};

const UserDetailModal = ({ userId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetail();
    }, [userId]);

    const fetchDetail = async () => {
        try {
            const res = await adminService.getUserDetail(userId);
            setData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (num) => num?.toLocaleString("vi-VN") + "đ";

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-lg font-bold text-gray-800">Chi tiết Người dùng</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : data ? (
                    <div className="p-6 space-y-6">
                        {/* User Info */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                {data.user?.avatar ? (
                                    <img src={data.user.avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-primary">
                                        {data.user?.fullName?.charAt(0)?.toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{data.user?.fullName}</h3>
                                <p className="text-sm text-gray-500">{data.user?.email}</p>
                                <p className="text-sm text-gray-400">{data.user?.phone || "Chưa có SĐT"}</p>
                                <div className="flex gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[data.user?.status]}`}>
                                        {data.user?.status}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                        {data.user?.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Booking History */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-3">
                                Lịch sử đặt sân ({data.bookingHistory?.length || 0})
                            </h4>
                            {data.bookingHistory?.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {data.bookingHistory.map((b) => (
                                        <div key={b._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">{b.courtId?.name || "N/A"}</p>
                                                <p className="text-xs text-gray-400">{b.bookingDate} | {b.startTime}-{b.endTime}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-700">{formatMoney(b.totalPrice)}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    b.status === "CONFIRMED" ? "bg-blue-100 text-blue-700" :
                                                    b.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                                                    b.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                                                    "bg-yellow-100 text-yellow-700"
                                                }`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-4">Chưa có lịch sử đặt sân</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">Không tìm thấy dữ liệu</div>
                )}
            </div>
        </div>
    );
};

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [filters, setFilters] = useState({ page: 1, role: "", status: "", search: "" });

    useEffect(() => {
        fetchUsers();
    }, [filters.page, filters.role, filters.status]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = { page: filters.page, limit: 10 };
            if (filters.role) params.role = filters.role;
            if (filters.status) params.status = filters.status;
            if (filters.search) params.search = filters.search;
            const res = await adminService.getUsers(params);
            setUsers(res.users);
            setPagination(res.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters({ ...filters, page: 1 });
        fetchUsers();
    };

    const handleToggleStatus = async (id) => {
        if (!window.confirm("Bạn có chắc muốn thay đổi trạng thái tài khoản này?")) return;
        try {
            await adminService.toggleUserStatus(id);
            fetchUsers();
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        }
    };

    const handleRoleChange = async (id, newRole, vendorType = null) => {
        const typeText = vendorType ? (vendorType === "COURT" ? " (Chủ sân)" : " (Cung cấp thiết bị)") : "";
        if (!window.confirm(`Xác nhận chuyển đổi vai trò tài khoản này thành ${newRole}${typeText}?`)) return;
        try {
            await adminService.updateUserRole(id, { role: newRole, vendorType });
            alert("Cập nhật vai trò người dùng thành công!");
            fetchUsers();
        } catch (err) {
            alert(err?.response?.data?.message || err.message);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("vi-VN");
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Quản lý Người dùng</h1>
                <p className="text-gray-500 mt-1">Xem danh sách, khóa/mở tài khoản người chơi</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                    <input
                        type="text" placeholder="Tìm kiếm tên, email..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                    <select
                        value={filters.role}
                        onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                        <option value="">Tất cả role</option>
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                        <option value="VENDOR">Vendor</option>
                        <option value="SHIPPER">Shipper</option>
                        <option value="MAINTENANCE_STAFF">Thợ bảo trì</option>
                    </select>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="ACTIVE">Active</option>
                        <option value="BLOCKED">Blocked</option>
                    </select>
                    <button type="submit" className="px-5 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 font-medium text-sm">
                        Tìm kiếm
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-lg">Không tìm thấy người dùng nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Người dùng</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">SĐT</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Role</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Trạng thái</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Ngày tạo</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Đăng nhập cuối</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                                                    ) : (
                                                        <span className="text-sm font-bold text-primary">
                                                            {user.fullName?.charAt(0)?.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{user.fullName}</p>
                                                    <p className="text-xs text-gray-400">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{user.phone || "—"}</td>
                                        <td className="py-3 px-4 text-center">
                                            {user.role === "ADMIN" ? (
                                                <span className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700">
                                                    ADMIN
                                                </span>
                                            ) : (
                                                <select
                                                    value={user.role === "VENDOR" ? `VENDOR_${user.vendorType || "COURT"}` : user.role}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val.startsWith("VENDOR_")) {
                                                            const type = val.split("_")[1];
                                                            handleRoleChange(user._id, "VENDOR", type);
                                                        } else {
                                                            handleRoleChange(user._id, val, null);
                                                        }
                                                    }}
                                                    className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-gray-100 transition-colors"
                                                >
                                                    <option value="USER">USER</option>
                                                    <option value="SHIPPER">SHIPPER (Giao hàng)</option>
                                                    <option value="MAINTENANCE_STAFF">THỢ BẢO TRÌ</option>
                                                    <option value="VENDOR_COURT">VENDOR (Chủ sân)</option>
                                                    <option value="VENDOR_EQUIPMENT">VENDOR (Cung cấp thiết bị)</option>
                                                </select>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[user.status]}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                                        <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(user.lastLogin)}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => setSelectedUserId(user._id)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600" title="Chi tiết">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                {user.role !== "ADMIN" && (
                                                    <button
                                                        onClick={() => handleToggleStatus(user._id)}
                                                        className={`p-2 rounded-lg ${user.status === "ACTIVE" ? "hover:bg-red-50 text-red-500" : "hover:bg-green-50 text-green-600"}`}
                                                        title={user.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
                                                    >
                                                        {user.status === "ACTIVE" ? (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalItems} người dùng)
                        </span>
                        <div className="flex gap-2">
                            <button disabled={pagination.currentPage <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">Trước</button>
                            <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">Sau</button>
                        </div>
                    </div>
                )}
            </div>

            {selectedUserId && (
                <UserDetailModal
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            )}
        </div>
    );
}
