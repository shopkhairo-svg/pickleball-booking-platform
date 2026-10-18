import axiosClient from "../api/axios";

const getGuestId = () => {
    let guestId = localStorage.getItem("pickleball-guest-id");
    if (!guestId) {
        guestId = crypto.randomUUID();
        localStorage.setItem("pickleball-guest-id", guestId);
    }
    return guestId;
};

export const engagementService = {
    getGuestId,
    recordView: (courtId) =>
        axiosClient.post(`/courts/${courtId}/view`, { guestId: getGuestId() }),
    getRecentlyViewed: () =>
        axiosClient.get("/courts/me/recently-viewed", { params: { guestId: getGuestId() } }),
    getSimilarCourts: (courtId) => axiosClient.get(`/courts/${courtId}/similar`),
    getFavorites: () => axiosClient.get("/courts/me/favorites"),
    getFavoriteStatus: (courtId) => axiosClient.get(`/courts/${courtId}/favorite`),
    toggleFavorite: (courtId) => axiosClient.post(`/courts/${courtId}/favorite`),
};
