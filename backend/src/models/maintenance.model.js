import mongoose from "mongoose";

const maintenanceSchema =
    new mongoose.Schema({

        targetType: {
            type: String,
            enum: [
                "COURT",
                "EQUIPMENT"
            ],
            required: true
        },

        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        // Chỉ có giá trị khi targetType = "COURT"
        // Chứa danh sách SubCourt bị block, không block cả cụm sân
        // Nếu rỗng → block toàn bộ SubCourt của Court đó (backward compat)
        affectedSubCourtIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubCourt"
        }],

        // Số lượng thiết bị đưa vào bảo trì (chỉ áp dụng khi targetType = "EQUIPMENT")
        equipmentMaintenanceQty: {
            type: Number,
            default: 1
        },

        title: {
            type: String,
            required: true
        },

        description: {
            type: String
        },

        images: [
            {
                imageUrl: { type: String, required: true },
                publicId: { type: String, default: null }
            }
        ],

        severity: {
            type: String,
            enum: [
                "LOW",
                "MEDIUM",
                "HIGH"
            ],
            default: "LOW"
        },

        status: {
            type: String,
            enum: [
                "REPORTED",
                "ASSIGNED",
                "IN_PROGRESS",
                "PENDING_CONFIRMATION",
                "COMPLETED"
            ],
            default: "REPORTED"
        },

        maintenanceDate: {
            type: Date
        },

        completedDate: {
            type: Date
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        assignedVendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        assignedStaffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        assignedAt: {
            type: Date,
            default: null
        },

        workLogs: [
            {
                status: {
                    type: String,
                    enum: ["ASSIGNED", "IN_PROGRESS", "PENDING_CONFIRMATION", "COMPLETED"],
                    required: true
                },
                note: {
                    type: String,
                    default: ""
                },
                images: [
                    {
                        imageUrl: { type: String, required: true },
                        publicId: { type: String, default: null }
                    }
                ],
                updatedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]

    }, {
        timestamps: true
    });


// INDEXES
maintenanceSchema.index({
    targetType: 1
});

maintenanceSchema.index({
    status: 1
});

maintenanceSchema.index({
    assignedStaffId: 1
});

export default mongoose.model(
    "Maintenance",
    maintenanceSchema
);
