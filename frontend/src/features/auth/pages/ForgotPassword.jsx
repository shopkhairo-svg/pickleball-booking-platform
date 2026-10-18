import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormInput from "@/components/FormInput";
import { authService } from "@/services/auth.service";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Nhập Email, 2: Nhập OTP & Mật khẩu mới
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSendOTP = async (event) => {
        event.preventDefault();
        if (!email) {
            setErrorMsg("Vui lòng điền địa chỉ email!");
            return;
        }

        setIsLoading(true);
        setErrorMsg("");

        try {
            const res = await authService.forgotPassword(email);
            if (res.success) {
                setStep(2);
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Email không tồn tại trong hệ thống!");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyAndReset = async (event) => {
        event.preventDefault();
        if (!otpCode || otpCode.length !== 6) {
            setErrorMsg("Vui lòng nhập mã OTP gồm 6 chữ số!");
            return;
        }
        if (!newPassword || !confirmPassword) {
            setErrorMsg("Vui lòng nhập mật khẩu mới và xác nhận mật khẩu!");
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

        setIsLoading(true);
        setErrorMsg("");

        try {
            const res = await authService.resetPassword({ email, otpCode, newPassword });
            if (res.success) {
                setIsSuccess(true);
                setTimeout(() => navigate("/login"), 2500);
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Đã có lỗi xảy ra, vui lòng kiểm tra lại mã OTP!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-background">
            <main className="app-shell flex min-h-[100dvh] items-center justify-center py-10">
                <div className="surface-panel w-full max-w-[460px] p-6 md:p-8">
                    {step === 1 && !isSuccess && (
                        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Quay lại đăng nhập
                        </Link>
                    )}

                    <div className="mb-7">
                        <h1 className="text-3xl font-black tracking-tight text-on-surface">
                            {isSuccess ? "Thành công" : step === 1 ? "Khôi phục mật khẩu" : "Đặt lại mật khẩu"}
                        </h1>
                        <p className="muted-copy mt-2">
                            {isSuccess
                                ? "Mật khẩu của bạn đã được thay đổi thành công."
                                : step === 1
                                    ? "Nhập email tài khoản, hệ thống sẽ gửi mã xác thực OTP."
                                    : `Mã OTP đã được gửi đến email ${email}.`}
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-error">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {errorMsg}
                        </div>
                    )}

                    {!isSuccess ? (
                        step === 1 ? (
                            <form onSubmit={handleSendOTP} className="space-y-6">
                                <FormInput label="Email" type="email" icon="mail" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                                <button type="submit" disabled={isLoading} className="btn-primary w-full">
                                    {isLoading ? "Đang gửi OTP..." : "Nhận mã OTP"}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyAndReset} className="space-y-5">
                                <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-center text-sm leading-6 text-on-surface-variant">
                                    Mã OTP hết hạn sau 5 phút. Nhập OTP và mật khẩu mới để hoàn tất.
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-on-surface">Mã OTP (6 chữ số)</label>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        placeholder="000000"
                                        value={otpCode}
                                        onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                                        className="field-control h-12 text-center text-xl font-black tracking-[8px]"
                                    />
                                </div>
                                <FormInput label="Mật khẩu mới" icon="lock" type={showPassword ? "text" : "password"} placeholder="Tối thiểu 6 ký tự" value={newPassword} onChange={(event) => setNewPassword(event.target.value)}>
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface">
                                        <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility_off" : "visibility"}</span>
                                    </button>
                                </FormInput>
                                <FormInput label="Xác nhận mật khẩu mới" icon="lock_reset" type={showPassword ? "text" : "password"} placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                                <button type="submit" disabled={isLoading} className="btn-primary w-full">
                                    {isLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep(1);
                                        setErrorMsg("");
                                    }}
                                    className="mx-auto block text-sm font-bold text-on-surface-variant hover:text-primary"
                                >
                                    Sửa email nhận OTP
                                </button>
                            </form>
                        )
                    ) : (
                        <div className="py-4 text-center">
                            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-container text-primary">
                                <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    check_circle
                                </span>
                            </div>
                            <h3 className="mt-5 text-2xl font-black text-on-surface">Đặt lại thành công!</h3>
                            <p className="muted-copy mx-auto mt-2 max-w-sm">
                                Mật khẩu của bạn đã được thay đổi. Hệ thống đang chuyển hướng về màn hình đăng nhập...
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
