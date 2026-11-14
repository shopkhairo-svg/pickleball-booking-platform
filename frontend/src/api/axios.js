import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { createApiClient } from "./createApiClient";

const axiosClient = createApiClient({
    axios,
    authStore: useAuthStore,
    storage: localStorage,
    baseURL: (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, ""),
    onUnauthorized: () => { window.location.href = "/login"; }
});

export default axiosClient;
