const accentGroups = ["aàáảãạăằắẳẵặâầấẩẫậ", "eèéẻẽẹêềếểễệ", "iìíỉĩị", "oòóỏõọôồốổỗộơờớởỡợ", "uùúủũụưừứửữự", "yỳýỷỹỵ", "dđ"];

export function searchPattern(value) {
    if (typeof value !== "string" || value.length > 120) throw Object.assign(new Error("Từ khóa phải là chuỗi tối đa 120 ký tự."), { status: 400 });
    return [...value.trim().normalize("NFC").toLowerCase()].map(char => {
        const group = accentGroups.find(group => group.includes(char));
        return group ? `[${group}]` : char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("").replace(/\s+/g, "\\s+");
}
