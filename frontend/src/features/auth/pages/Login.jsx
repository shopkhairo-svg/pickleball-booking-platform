import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import FormInput from "@/components/FormInput";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMsg("");
        try {
            const data = await authService.login(email, password);
            setAuth(data.user, data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);
            navigate(data.redirectUrl);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Thông tin đăng nhập không hợp lệ.");
        }
    };

    return (
        <div className="min-h-[100dvh] bg-background">
            <main className="app-shell grid min-h-[100dvh] items-center gap-10 py-10 lg:grid-cols-[0.95fr_1.05fr]">
                <section className="hidden lg:block">
                    <div className="relative overflow-hidden rounded-2xl bg-ink p-10 text-white shadow-soft">
                        <img
                            src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1400"
                            alt="Người chơi pickleball trên sân"
                            className="absolute inset-0 h-full w-full object-cover opacity-45"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/80 to-ink/20" />
                        <div className="relative min-h-[620px] max-w-md">
                            <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-white/85 hover:text-white">
                                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                Về trang chủ
                            </Link>
                            <div className="mt-24">
                                <p className="stat-pill border-white/15 bg-white/10 text-white/80">Player workspace</p>
                            <h1 className="mt-5 text-5xl font-bold leading-[1.18]">
                                    Lịch sân, thanh toán, điểm thưởng trong một tài khoản.
                                </h1>
                                <p className="mt-5 text-sm leading-7 text-white/70">
                                    Đăng nhập để đặt sân nhanh hơn, lưu sân yêu thích và nhận thông báo realtime cho từng booking.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-[460px]">
                    <div className="surface-panel p-6 md:p-8">
                        <div className="mb-7">
                            <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white">
                                <span className="material-symbols-outlined">sports_tennis</span>
                            </div>
                            <h1 className="text-3xl font-bold leading-tight text-on-surface">Đăng nhập</h1>
                            <p className="muted-copy mt-2">Tiếp tục vào PickleballPro để quản lý lịch chơi của bạn.</p>
                        </div>

                        <div className="mb-7 grid grid-cols-2 gap-2 rounded-2xl bg-surface-container-low p-1">
                            <button type="button" className="rounded-xl bg-white py-2.5 text-sm font-bold text-primary shadow-sm">
                                Đăng nhập
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/register")}
                                className="rounded-xl py-2.5 text-sm font-bold text-on-surface-variant hover:text-primary"
                            >
                                Đăng ký
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <FormInput label="Email" icon="mail" type="email" placeholder="name@club.com" value={email} onChange={(event) => setEmail(event.target.value)} />

                            <div className="space-y-1">
                                <FormInput label="Mật khẩu" icon="lock" type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu" value={password} onChange={(event) => setPassword(event.target.value)}>
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface">
                                        <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility_off" : "visibility"}</span>
                                    </button>
                                </FormInput>
                                <div className="flex justify-end px-1">
                                    <Link to="/forgot-password" className="text-xs font-bold text-primary hover:underline">
                                        Quên mật khẩu?
                                    </Link>
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-error">
                                    <span className="material-symbols-outlined text-[18px]">error</span>
                                    {errorMsg}
                                </div>
                            )}

                            <button type="submit" className="btn-primary w-full">
                                Đăng nhập
                            </button>
                        </form>

                        <div className="my-6 flex items-center gap-3">
                            <div className="h-px flex-1 bg-outline-variant" />
                            <span className="text-xs font-bold text-outline">Hoặc</span>
                            <div className="h-px flex-1 bg-outline-variant" />
                        </div>

                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={async (credentialResponse) => {
                                    setErrorMsg("");
                                    try {
                                        const data = await authService.googleLogin(credentialResponse.credential);
                                        setAuth(data.user, data.accessToken);
                                        localStorage.setItem("refreshToken", data.refreshToken);
                                        navigate(data.redirectUrl);
                                    } catch (err) {
                                        setErrorMsg(err.response?.data?.message || "Google authentication failed.");
                                    }
                                }}
                                onError={() => setErrorMsg("Google Sign-In was unsuccessful.")}
                                text="signin_with"
                                theme="outline"
                                size="large"
                                width="100%"
                            />
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
