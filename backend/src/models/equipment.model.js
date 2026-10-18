import mongoose from "mongoose";

const equipmentSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    type: {
        type: String,
        enum: [
            "PADDLE",
            "BALL",
            "ACCESSORY"
        ],
        required: true
    },

    image: {
        type: String
    },

    description: {
        type: String
    },

    quantity: {
        type: Number,
        required: true,
        min: 0
    },

    availableQuantity: {
        type: Number,
        required: true,
        min: 0
    },

    rentalType: {
        type: String,
        enum: [
            "HOUR",
            "TURN"
        ],
        required: true
    },

    rentalPrice: {
        type: Number,
        required: true,
        min: 0
    },

    maintenanceQuantity: {
        type: Number,
        default: 0,
        min: 0
    },

    damagedCount: {
        type: Number,
        default: 0
    },

    lostCount: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        enum: [
            "AVAILABLE",
            "IN_USE",
            "DAMAGED",
            "LOST"
        ],
        default: "AVAILABLE"
    },

    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    courtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Court",
        default: null
    }

}, {
    timestamps: true
});


// INDEXES
equipmentSchema.index({ type: 1 });
equipmentSchema.index({ status: 1 });

export default mongoose.model(
    "Equipment",
    equipmentSchema
);