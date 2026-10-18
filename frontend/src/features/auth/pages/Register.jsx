import { useState } from "react";
import { Link } from "react-router-dom";
import FormInput from "@/components/FormInput";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

export default function Register() {
    const [step, setStep] = useState(1);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const setAuth = useAuthStore((state) => state.setAuth);

    const handleRegisterSubmit = async (event) => {
        event.preventDefault();
        if (isLoading) return;

        if (!name || !email || !password || !confirmPassword) {
            setErrorMsg("Vui lòng nhập đầy đủ thông tin!");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg("Mật khẩu xác nhận không khớp!");
            return;
        }

        setIsLoading(true);
        setErrorMsg("");

        try {
            const data = await authService.register(name, email, password);
            if (data) setStep(2);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại!");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOTPSubmit = async (event) => {
        event.preventDefault();
        if (isLoading) return;

        if (!otpCode || otpCode.length !== 6) {
            setErrorMsg("Vui lòng nhập chính xác mã OTP gồm 6 chữ số!");
            return;
        }

        setIsLoading(true);
        setErrorMsg("");

        try {
            const data = await authService.verifyOTP({ email, otpCode });

            if (data) {
                setAuth(data.user, data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);
                setIsSuccess(true);
                setTimeout(() => {
                    window.location.href = data.redirectUrl || "/";
                }, 2200);
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Mã OTP không chính xác hoặc đã hết hạn!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-background">
            <main className="app-shell grid min-h-[100dvh] items-center gap-10 py-10 lg:grid-cols-[1fr_0.95fr]">
                <section className="mx-auto w-full max-w-[500px]">
                    <div className="surface-panel p-6 md:p-8">
                        {!isSuccess ? (
                            <>
                                <div className="mb-7">
                                    <Link to="/login" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                        Đã có tài khoản
                                    </Link>
                                    <h1 className="text-3xl font-black tracking-tight text-on-surface">
                                        {step === 1 ? "Tạo tài khoản" : "Xác thực email"}
                                    </h1>
                                    <p className="muted-copy mt-2">
                                        {step === 1
                                            ? "Lưu lịch chơi, sân yêu thích và nhận điểm thưởng sau mỗi đánh giá."
                                            : `Mã xác minh đã được gửi đến ${email}.`
                                        }
                                    </p>
                                </div>

                                {errorMsg && (
                                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-error">
                                        <span className="material-symbols-outlined text-[18px]">error</span>
                                        {errorMsg}
                                    </div>
                                )}

                                {step === 1 ? (
                                    <form onSubmit={handleRegisterSubmit} className="space-y-5">
                                        <FormInput label="Họ và tên" type="text" icon="person" placeholder="Nguyễn Văn A" value={name} onChange={(event) => setName(event.target.value)} />
                                        <FormInput label="Email" type="email" icon="mail" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                                        <FormInput label="Mật khẩu" type="password" icon="lock" placeholder="Tối thiểu 6 ký tự" value={password} onChange={(event) => setPassword(event.target.value)} />
                                        <FormInput label="Xác nhận mật khẩu" type="password" icon="lock_reset" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />

                                        <button type="submit" disabled={isLoading} className="btn-primary w-full">
                                            {isLoading ? "Đang xử lý..." : "Đăng ký"}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleOTPSubmit} className="space-y-6">
                                        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-center text-sm leading-6 text-on-surface-variant">
                                            Nhập mã OTP gồm 6 chữ số để kích hoạt tài khoản.
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-center text-sm font-bold text-on-surface">
                                                Mã OTP
                                            </label>
                                            <input
                                                type="text"
                                                maxLength="6"
                                                placeholder="000000"
                                                value={otpCode}
                                                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                                                className="field-control h-14 text-center text-2xl font-black tracking-[12px]"
                                            />
                                        </div>

                                        <button type="submit" disabled={isLoading} className="btn-primary w-full">
                                            {isLoading ? "Đang xác minh..." : "Xác nhận"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStep(1);
                                                setErrorMsg("");
                                            }}
                                            className="mx-auto block text-sm font-bold text-on-surface-variant hover:text-primary"
                                        >
                                            Sửa email đăng ký
                                        </button>
                                    </form>
                                )}
                            </>
                        ) : (
                            <div className="py-6 text-center">
                                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-container text-primary">
                                    <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        check_circle
                                    </span>
                                </div>
                                <h3 className="mt-5 text-2xl font-black text-on-surface">Tài khoản đã sẵn sàng</h3>
                                <p className="muted-copy mx-auto mt-2 max-w-sm">
                                    Hệ thống đang đưa bạn vào PickleballPro để bắt đầu đặt sân.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="hidden lg:block">
                    <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-soft">
                        <img
                            src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200"
                            alt="Vợt và bóng pickleball"
                            className="h-[620px] w-full rounded-2xl object-cover"
                        />
                        <div className="absolute bottom-12 left-12 right-12 rounded-2xl border border-white/20 bg-ink/70 p-6 text-white backdrop-blur-md">
                            <h2 className="text-2xl font-black">Tham gia cộng đồng sân chuẩn.</h2>
                            <p className="mt-2 text-sm leading-6 text-white/72">Theo dõi lịch đặt, nhận thông báo realtime và dùng điểm tích lũy ngay tại checkout.</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
