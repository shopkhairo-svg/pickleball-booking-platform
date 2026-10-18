import mongoose from "mongoose";

const notificationSchema =
    new mongoose.Schema({

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        title: {
            type: String,
            required: true
        },

        content: {
            type: String,
            default: ""
        },

        message: {
            type: String,
            default: ""
        },

        type: {
            type: String,
            enum: [
                "BOOKING",
                "REMINDER",
                "MAINTENANCE",
                "PAYMENT",
                "REVIEW",
                "COUPON",
                "POINT",
                "SYSTEM",
                "IMPORT_ORDER"
            ],
            default: "BOOKING"
        },

        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        referenceType: {
            type: String,
            default: null
        },

        recipientRole: {
            type: String,
            enum: [
                "USER",
                "ADMIN"
            ],
            default: "USER"
        },

        isRead: {
            type: Boolean,
            default: false
        }

    }, {
        timestamps: true
    });


// INDEXES
notificationSchema.index({
    userId: 1
});

notificationSchema.index({
    isRead: 1
});

notificationSchema.index({
    recipientRole: 1,
    createdAt: -1
});

export default mongoose.model(
    "Notification",
    notificationSchema
);
