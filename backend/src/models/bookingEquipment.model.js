import mongoose from "mongoose";

const bookingEquipmentSchema =
    new mongoose.Schema({

        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true
        },

        equipmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Equipment",
            required: true
        },

        quantity: {
            type: Number,
            required: true
        },

        rentalPrice: {
            type: Number,
            required: true
        },

        subtotal: {
            type: Number,
            required: true
        },

        returnStatus: {
            type: String,
            enum: [
                "RENTING",
                "RETURNED",
                "DAMAGED",
                "LOST"
            ],
            default: "RENTING"
        }

    }, {
        timestamps: true
    });


// INDEXES
bookingEquipmentSchema.index({
    bookingId: 1
});

bookingEquipmentSchema.index({
    equipmentId: 1
});

export default mongoose.model(
    "BookingEquipment",
    bookingEquipmentSchema
);