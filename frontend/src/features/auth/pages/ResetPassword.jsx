import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import FormInput from "@/components/FormInput";
import { authService } from "@/services/auth.service";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");
    const userId = searchParams.get("id");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isLoading) return;
        setErrorMsg("");

        if (!newPassword || !confirmPassword) {
            setErrorMsg("Vui lòng điền đầy đủ thông tin!");
            return;
        }
        if (newPassword.length < 6) {
            setErrorMsg("Mật khẩu mới phải từ 6 ký tự trở lên!");
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg("Mật khẩu xác nhận không trùng khớp!");
            return;
        }
        if (!token || !userId) {
            setErrorMsg("Đường dẫn khôi phục không hợp lệ hoặc thiếu tham số xác thực!");
            return;
        }

        setIsLoading(true);
        try {
            const data = await authService.resetPassword({ userId, token, newPassword });
            if (data.success) {
                setIsSuccess(true);
                setTimeout(() => navigate("/login"), 2200);
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Đã có lỗi xảy ra, vui lòng thử lại!");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-background">
            <main className="app-shell flex min-h-[100dvh] items-center justify-center py-10">
                <div className="surface-panel w-full max-w-[460px] p-6 md:p-8">
                    <div className="mb-7">
                        <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white">
                            <span className="material-symbols-outlined">lock_reset</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-on-surface">Đặt lại mật khẩu</h1>
                        <p className="muted-copy mt-2">Tạo mật khẩu mới để bảo vệ tài khoản PickleballPro.</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-error">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {errorMsg}
                        </div>
                    )}

                    {!isSuccess ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm leading-6 text-on-surface-variant">
                                Mật khẩu mới cần tối thiểu 6 ký tự. Không dùng lại mật khẩu cũ nếu có thể.
                            </div>
                            <FormInput label="Mật khẩu mới" icon="lock" type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu mới" value={newPassword} onChange={(event) => setNewPassword(event.target.value)}>
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface">
                                    <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility_off" : "visibility"}</span>
                                </button>
                            </FormInput>
                            <FormInput label="Xác nhận mật khẩu mới" icon="lock_reset" type={showPassword ? "text" : "password"} placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                            <button type="submit" disabled={isLoading} className="btn-primary w-full">
                                {isLoading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                            </button>
                        </form>
                    ) : (
                        <div className="py-6 text-center">
                            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-container text-primary">
                                <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    check_circle
                                </span>
                            </div>
                            <h3 className="mt-5 text-2xl font-black text-on-surface">Mật khẩu đã đổi</h3>
                            <p className="muted-copy mx-auto mt-2 max-w-sm">Bạn sẽ được đưa về màn hình đăng nhập trong giây lát.</p>
                            <Link to="/login" className="mt-5 block text-sm font-bold text-primary hover:underline">
                                Về đăng nhập
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
