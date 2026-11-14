import { useEffect, useId, useRef, useState } from "react";
import { courtService } from "@/services/court.service";
import { scheduleLocationSuggestions } from "../utils/locationSuggestions";

export default function LocationAutocomplete({ id, value, onChange, onSelect }) {
    const generatedId = useId();
    const inputId = id || `location-${generatedId}`;
    const listId = `${inputId}-suggestions`;
    const statusId = `${inputId}-status`;
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [retry, setRetry] = useState(0);
    const [result, setResult] = useState({ query: null, status: "idle", suggestions: [] });
    const query = value.trim();
    const matchesQuery = result.query === query;
    const status = matchesQuery ? result.status : "loading";
    const suggestions = matchesQuery && status === "ready" ? result.suggestions : [];
    const activeSuggestion = suggestions[activeIndex];

    useEffect(() => {
        if (!open) return;
        return scheduleLocationSuggestions(query, {
            fetchSuggestions: courtService.getLocationSuggestions,
            onResult: setResult,
        });
    }, [open, query, retry]);

    useEffect(() => {
        if (open && activeSuggestion) listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }, [open, activeIndex, activeSuggestion]);

    const close = () => { setOpen(false); setActiveIndex(-1); };
    const select = suggestion => {
        onChange(suggestion.value);
        onSelect(suggestion);
        close();
    };
    const handleKeyDown = event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            if (!suggestions.length) { setActiveIndex(-1); return; }
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex(previous => previous < 0
                ? (direction > 0 ? 0 : suggestions.length - 1)
                : (previous + direction + suggestions.length) % suggestions.length);
        } else if (event.key === "Enter") {
            if (open && activeSuggestion) {
                event.preventDefault();
                select(activeSuggestion);
            } else {
                // No highlighted suggestion: let the form submit the free text.
                close();
            }
        } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    };

    let statusText = "";
    if (open) {
        if (status === "loading" || status === "idle") statusText = "Đang tìm gợi ý khu vực…";
        else if (status === "error") statusText = "Chưa tải được gợi ý. Bạn vẫn có thể nhập khu vực và áp dụng bộ lọc.";
        else if (!suggestions.length) statusText = "Không có gợi ý phù hợp. Bạn vẫn có thể dùng nội dung đã nhập.";
        else statusText = `${suggestions.length} gợi ý. Dùng phím lên, xuống rồi Enter để chọn.`;
    }

    return (
        <div className="relative" onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) close();
        }}>
            <input
                ref={inputRef}
                id={inputId}
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={open && activeSuggestion ? `${listId}-${activeIndex}` : undefined}
                aria-describedby={statusId}
                autoComplete="off"
                placeholder="Tỉnh/thành, phường/xã, quận/huyện…"
                maxLength={120}
                value={value}
                onChange={event => { onChange(event.target.value); setActiveIndex(-1); setOpen(true); }}
                onFocus={() => { setOpen(true); setActiveIndex(-1); }}
                onKeyDown={handleKeyDown}
                className="field-control"
            />
            <p id={statusId} role="status" aria-live="polite" className="sr-only">{statusText}</p>
            {open && <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                <p className="border-b border-zinc-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">{query ? "Khu vực phù hợp" : "Gợi ý khu vực"}</p>
                <ul ref={listRef} id={listId} role="listbox" aria-label="Gợi ý khu vực" aria-busy={status === "loading" || status === "idle"} className="max-h-64 overflow-y-auto overscroll-contain">
                    {suggestions.map((suggestion, index) => <li
                        key={suggestion.id}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        onPointerDown={event => event.preventDefault()}
                        onPointerMove={() => setActiveIndex(index)}
                        onClick={() => select(suggestion)}
                        className={`cursor-pointer px-3 py-2.5 text-sm ${index === activeIndex ? "bg-primary/10 text-primary" : "text-zinc-800 hover:bg-zinc-50"}`}
                    >
                        <span className="block font-semibold">{suggestion.label}</span>
                        {suggestion.description && <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{suggestion.description}</span>}
                    </li>)}
                </ul>
                {(status !== "ready" || !suggestions.length) && <div className="px-3 py-3 text-xs leading-relaxed text-zinc-500">
                    {statusText}
                    {status === "error" && <button type="button" className="mt-2 block font-semibold text-primary hover:underline"
                        onClick={() => { setRetry(previous => previous + 1); inputRef.current?.focus(); }}>Thử lại</button>}
                </div>}
            </div>}
        </div>
    );
}
