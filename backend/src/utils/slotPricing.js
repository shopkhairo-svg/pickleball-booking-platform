export function resolveSlotHourlyPrice(slot, court) {
    const slotPrice = slot?.pricePerHour;
    return Number.isFinite(slotPrice) && slotPrice >= 0 ? slotPrice : court?.pricePerHour;
}
