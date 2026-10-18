import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

export default mongoose.model("SystemSetting", systemSettingSchema);
