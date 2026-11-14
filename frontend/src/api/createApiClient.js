// Dependencies are explicit so session races can be checked without a browser.
export function createApiClient({ axios, authStore, storage, baseURL, onUnauthorized }) {
    const client = axios.create({ baseURL });
    let refresh = null;
    const userId = user => user?.id || user?._id;
    const sameSession = session => {
        const state = authStore.getState();
        return state.isAuthenticated && !!state.user && userId(state.user) === session.userId &&
            storage.getItem("refreshToken") === session.refreshToken;
    };

    client.interceptors.request.use(config => {
        const state = authStore.getState();
        if (!config._retry) config._authSession = {
            userId: userId(state.user), refreshToken: storage.getItem("refreshToken")
        };
        if (state.accessToken) config.headers.Authorization = `Bearer ${state.accessToken}`;
        else delete config.headers.Authorization;
        return config;
    });

    client.interceptors.response.use(response => response.data, async error => {
        const request = error.config;
        const publicAuth = /\/auth\/(?!logout(?:$|\?))/.test(request?.url || "");
        const session = request?._authSession;
        if (error.response?.status !== 401 || !request || request._retry || publicAuth ||
            !session?.refreshToken || ["undefined", "null"].includes(session.refreshToken) || !sameSession(session)) {
            return Promise.reject(error);
        }
        request._retry = true;
        try {
            // A slow response may belong to the token that was already refreshed.
            const latestToken = authStore.getState().accessToken;
            if (latestToken && request.headers.Authorization !== `Bearer ${latestToken}`) {
                return client(request);
            }
            if (!refresh || refresh.refreshToken !== session.refreshToken || refresh.userId !== session.userId) {
                const pending = { ...session };
                pending.promise = axios.post(`${baseURL}/auth/refresh-token`, { refreshToken: session.refreshToken })
                    .then(({ data }) => {
                        if (!sameSession(session)) throw new Error("Session changed during token refresh");
                        if (!data.accessToken) throw new Error("Missing access token");
                        authStore.getState().setAuth(authStore.getState().user, data.accessToken);
                        return data.accessToken;
                    }).finally(() => { if (refresh === pending) refresh = null; });
                refresh = pending;
            }
            await refresh.promise;
            if (!sameSession(session)) throw new Error("Session changed during token refresh");
            return client(request);
        } catch (refreshError) {
            // Network/5xx failures are recoverable and must not discard a valid session.
            if ([401, 403].includes(refreshError.response?.status) && sameSession(session)) {
                authStore.getState().clearAuth();
                storage.removeItem("refreshToken");
                onUnauthorized();
            }
            return Promise.reject(refreshError);
        }
    });
    return client;
}
