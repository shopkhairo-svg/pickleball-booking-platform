import { useGoogleLogin } from "@react-oauth/google";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";

export function useGoogleAuth(setError) {
    const setAuth = useAuthStore((state) => state.setAuth);

    return useGoogleLogin({
        onSuccess: async (response) => {
            try {
                // Lưu ý: response.credential là token từ Google cấp
                const data = await authService.googleLogin(response.credential);
                setAuth(data.user, data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);
                window.location.href = data.redirectUrl;
            } catch (err) {
                setError(err.response?.data?.message || "Google Login failed");
            }
        },
        onError: () => setError("Google Sign-In failed"),
    });
}