export function slotTimes(court) {
    const minutes = value => {
        if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Giờ mở/đóng cửa không hợp lệ.");
        const [h, m] = value.split(":").map(Number);
        return h * 60 + m;
    };
    const start = minutes(court.openTime ?? "06:00");
    const end = minutes(court.closeTime ?? "22:00");
    const duration = Number(court.slotDuration ?? 60);
    if (!Number.isInteger(duration) || duration < 15 || duration > 720 || end <= start) throw new Error("Thời lượng slot hoặc giờ hoạt động không hợp lệ.");
    const format = value => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
    const slots = [];
    for (let at = start; at + duration <= end; at += duration) slots.push({ startTime: format(at), endTime: format(at + duration) });
    return slots;
}
