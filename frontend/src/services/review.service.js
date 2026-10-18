import axiosClient from "../api/axios";

export const reviewService = {
    getCourtReviews: (courtId, params = {}) =>
        axiosClient.get(`/reviews/courts/${courtId}`, { params }),
    getEligibility: (courtId) =>
        axiosClient.get(`/reviews/courts/${courtId}/eligibility`),
    createReview: (payload) =>
        axiosClient.post(
            "/reviews",
            payload,
            typeof FormData !== "undefined" && payload instanceof FormData
                ? { headers: { "Content-Type": "multipart/form-data" } }
                : undefined
        ),
    getMyBookingReview: (bookingId) =>
        axiosClient.get(`/reviews/my-booking/${bookingId}`),
    getAdminReviews: (params = {}) => axiosClient.get("/reviews/admin", { params }),
    updateReviewStatus: (id, status) =>
        axiosClient.put(`/reviews/admin/${id}/status`, { status }),
};
