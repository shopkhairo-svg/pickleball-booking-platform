// src/store/adminStore.js
import { create } from "zustand";

export const useAdminStore = create((set) => ({
    // Loading & Error state dùng chung
    loading: false,
    error: null,
    successMessage: null,

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),
    setSuccess: (successMessage) => set({ successMessage, loading: false }),
    clearMessages: () => set({ error: null, successMessage: null }),
}));
