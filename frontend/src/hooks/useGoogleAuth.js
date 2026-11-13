import { authService } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";

// Pass to GoogleLogin.onSuccess. useGoogleLogin returns an OAuth access token,
// not the credential (ID token) required by this backend.
export function useGoogleAuth(setError) {
    const setAuth = useAuthStore(state => state.setAuth);
    return async response => {
        try {
            if (!response.credential) throw new Error("Google không trả về ID token.");
            const data = await authService.googleLogin(response.credential);
            localStorage.setItem("refreshToken", data.refreshToken);
            setAuth(data.user, data.accessToken);
            window.location.href = data.redirectUrl;
        } catch (error) {
            setError(error.response?.data?.message || error.message || "Đăng nhập Google thất bại.");
        }
    };
}
