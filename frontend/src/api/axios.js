import axios from "axios";
import { useAuthStore } from "../store/authStore";

const baseURL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const axiosClient = axios.create({ baseURL });
let refreshPromise = null;

axiosClient.interceptors.request.use(config => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = 'Bearer ' + token;
    return config;
});

axiosClient.interceptors.response.use(response => response.data, async error => {
    const request = error.config;
    const publicAuth = /\/auth\/(?!logout(?:$|\?))/.test(request?.url || "");
    const refreshToken = localStorage.getItem("refreshToken");
    if (error.response?.status !== 401 || !request || request._retry || publicAuth ||
        !refreshToken || refreshToken === "undefined" || refreshToken === "null") {
        return Promise.reject(error);
    }
    request._retry = true;
    try {
        if (!refreshPromise) {
            refreshPromise = axios.post(baseURL + '/auth/refresh-token', { refreshToken })
                .then(({ data }) => {
                    if (!data.accessToken) throw new Error("Missing access token");
                    useAuthStore.getState().setAuth(useAuthStore.getState().user, data.accessToken);
                    return data.accessToken;
                }).finally(() => { refreshPromise = null; });
        }
        const token = await refreshPromise;
        request.headers.Authorization = 'Bearer ' + token;
        return axiosClient(request);
    } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
    }
});

export default axiosClient;
