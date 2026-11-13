export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";
export const isGoogleConfigured = /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(googleClientId);
