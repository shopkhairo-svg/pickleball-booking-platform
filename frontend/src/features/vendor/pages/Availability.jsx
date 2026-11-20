import { useCallback, useEffect, useState } from "react";
import { vendorService } from "@/services/vendor.service";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const money = value => new Intl.NumberFormat("vi-VN").format(value || 0);

export default function Availability() {
    const [courts, setCourts] = useState([]);
    const [courtId, setCourtId] = useState("");
    const [date, setDate] = useState(today());
    const [slots, setSlots] = useState([]);
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState("");

    useEffect(() => { vendorService.getCourts().then(({ data }) => {
        const list = data.courts || []; setCourts(list); setCourtId(list[0]?._id || "");
    }).catch(e => setError(e?.response?.data?.message || "Không tải được danh sách sân.")); }, []);

    const load = useCallback(async () => {
        if (!courtId) { setSlots([]); setLoading(false); return; }
        setLoading(true); setError("");
        try { const { data } = await vendorService.getCourtSlots(courtId, date); const list = data.slots || []; setSlots(list); setPrices(Object.fromEntries(list.map(s => [s._id, s.pricePerHour]))); }
        catch (e) { setError(e?.response?.data?.message || "Không tải được lịch sân."); }
        finally { setLoading(false); }
    }, [courtId, date]);
    useEffect(() => { const timer = setTimeout(() => load(), 0); return () => clearTimeout(timer); }, [load]);

    const save = async (slot, changes) => {
        setSaving(slot._id); setError("");
        try { await vendorService.updateSlot(slot._id, changes); await load(); }
        catch (e) { setError(e?.response?.data?.message || "Không cập nhật được khung giờ."); }
        finally { setSaving(""); }
    };

    return <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-primary">Quản lý sân</p><h1 className="text-2xl font-bold text-zinc-900 mt-1">Lịch trống & giá theo giờ</h1><p className="text-sm text-zinc-500 mt-2">Lịch được tạo tự động để chạy thử. Đánh dấu giờ bận hoặc chỉnh giá riêng; giờ đã đặt không thể sửa.</p></div>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <select value={courtId} onChange={e => setCourtId(e.target.value)} className="rounded-xl border border-zinc-200 px-4 py-3 bg-white flex-1"><option value="">Chọn cụm sân</option>{courts.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
            <input type="date" min={today()} value={date} onChange={e => setDate(e.target.value)} className="rounded-xl border border-zinc-200 px-4 py-3 bg-white" />
        </div>
        {error && <div role="alert" className="mb-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
        {loading ? <p className="py-12 text-center text-zinc-500">Đang tải lịch…</p> : !slots.length ? <div className="rounded-2xl border border-dashed p-10 text-center text-zinc-500">Không có khung giờ vào ngày này.</div> : <div className="space-y-3">{slots.map(slot => <div key={slot._id} className="rounded-2xl bg-white border border-zinc-200 p-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="md:w-44"><div className="font-bold text-zinc-900">{slot.startTime} – {slot.endTime}</div><div className="text-xs text-zinc-500 mt-1">{slot.subCourtId?.name || "Sân con"}</div></div>
            <label className="flex-1"><span className="text-xs text-zinc-500 block mb-1">Giá / giờ (₫)</span><input type="number" min="0" step="1000" disabled={slot.isBooked || saving === slot._id} value={prices[slot._id] ?? ""} onChange={e => setPrices(p => ({ ...p, [slot._id]: e.target.value }))} onBlur={() => Number(prices[slot._id]) !== slot.pricePerHour && save(slot, { pricePerHour: Number(prices[slot._id]) })} className="w-full md:max-w-xs rounded-lg border border-zinc-200 px-3 py-2 disabled:bg-zinc-100" /></label>
            <div className="text-xs text-zinc-500 md:w-28">{slot.isBooked ? "Đã có khách" : slot.isBlocked ? "Đang khóa" : "Đang mở"}</div>
            <button disabled={slot.isBooked || saving === slot._id} onClick={() => save(slot, { isBlocked: !slot.isBlocked })} className="rounded-lg px-4 py-2 text-sm font-semibold bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50">{slot.isBooked ? "Đã đặt" : slot.isBlocked ? "Mở khung giờ" : "Đánh dấu bận"}</button>
            <span className="text-xs text-zinc-400 md:w-28 text-right">{money(slot.pricePerHour)} ₫/h</span>
        </div>)}</div>}
    </div>;
}
