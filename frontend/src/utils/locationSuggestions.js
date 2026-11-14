// Cancellation guards are required even when an HTTP adapter ignores AbortSignal.
export function scheduleLocationSuggestions(query, { fetchSuggestions, onResult, delay = 250, schedule = setTimeout, cancel = clearTimeout }) {
    let active = true;
    const controller = new AbortController();
    const timer = schedule(async () => {
        if (!active) return;
        onResult({ query, status: "loading", suggestions: [] });
        try {
            const response = await fetchSuggestions(query, { signal: controller.signal });
            if (!active) return;
            if (!response?.success || !Array.isArray(response.suggestions)) throw new Error("Invalid location suggestions response");
            onResult({ query, status: "ready", suggestions: response.suggestions });
        } catch (error) {
            if (!active || controller.signal.aborted || error.code === "ERR_CANCELED" || error.name === "AbortError") return;
            onResult({ query, status: "error", suggestions: [] });
        }
    }, delay);
    return () => {
        active = false;
        controller.abort();
        cancel(timer);
    };
}

export function applyLocationSelection(current, suggestion) {
    const params = new URLSearchParams(current);
    params.set("location", suggestion.value.trim());
    if (suggestion.locationId) params.set("locationId", suggestion.locationId);
    else params.delete("locationId");
    params.set("page", "1");
    return params;
}

export function applyLocationDraft(current, value) {
    const params = new URLSearchParams(current);
    const location = value.trim();
    if (location !== (params.get("location") || "") || !location) params.delete("locationId");
    if (location) params.set("location", location);
    else params.delete("location");
    params.set("page", "1");
    return params;
}
