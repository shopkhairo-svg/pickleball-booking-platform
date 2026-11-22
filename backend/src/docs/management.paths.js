// Contracts mirror the active admin/vendor routers; disabled auxiliary modules
// deliberately do not appear as callable operations in this catalog.
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const object = properties => ({ type: "object", properties });
const array = items => ({ type: "array", items });
const str = { type: "string" };
const number = { type: "number" };
const integer = { type: "integer" };
const date = { type: "string", format: "date" };
const time = { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", example: "18:00" };
const id = ref("ObjectId");
const courtStatus = { type: "string", enum: ["AVAILABLE", "MAINTENANCE", "HIDDEN"] };
const bookingStatus = { type: "string", enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] };
const money = { type: "integer", minimum: 0, maximum: 1000000000, description: "VNĐ", example: 120000 };
const response = (schema, description = "Thành công") => ({ description, content: { "application/json": { schema } } });
const envelope = properties => object({ success: { type: "boolean", example: true }, ...properties });
const result = (properties, description) => response(envelope(properties), description);
const failure = description => response(ref("Error"), description);
const pathId = (name = "id", description = "MongoDB ObjectId của bản ghi") => ({ name, in: "path", required: true, description, schema: id });
const query = (name, schema, description, required = false) => ({ name, in: "query", required, description, schema });
const body = schema => ({ required: true, content: { "application/json": { schema } } });
const adminAccess = "Yêu cầu tài khoản ADMIN đang hoạt động.";
const vendorAccess = "Yêu cầu VENDOR có vendorType=COURT hoặc ADMIN. Dữ liệu luôn giới hạn theo vendorId của tài khoản đang đăng nhập; ADMIN không tự động xem được sân của chủ sân khác ở nhóm này.";
const op = (tag, summary, description, options = {}) => {
    const { responses = {}, ...rest } = options;
    return {
        tags: [tag], summary,
        description: `${tag.startsWith("Quản trị") ? adminAccess : vendorAccess}\n\n${description}`,
        security: [{ BearerAuth: [] }],
        ...rest,
        responses: {
            200: response(ref("Success")),
            400: failure("Dữ liệu hoặc thao tác không hợp lệ"),
            401: failure("Thiếu token hoặc phiên đăng nhập hết hạn"),
            403: failure("Tài khoản bị khóa hoặc không đủ quyền"),
            429: failure("Vượt giới hạn yêu cầu"),
            ...(tag.startsWith("Chủ sân") ? { 501: failure("Tài khoản VENDOR chưa có vendorType=COURT; chức năng nhà cung cấp dụng cụ đang phát triển") } : {}),
            503: failure("Tạm thời không thể xác thực phiên đăng nhập"),
            ...responses
        }
    };
};
const created = operation => {
    delete operation.responses[200];
    return operation;
};

const groups = {
    courts: "Quản trị · Sân", bookings: "Quản trị · Đặt sân", reports: "Quản trị · Báo cáo",
    users: "Quản trị · Tài khoản", settings: "Quản trị · Cài đặt",
    vendorCourts: "Chủ sân · Sân & lịch", vendorActivity: "Chủ sân · Hoạt động"
};
export const managementTags = [
    { name: groups.courts, description: "Quản lý cụm sân, sân nhỏ, hình ảnh và trạng thái hoạt động. Chỉ ADMIN." },
    { name: groups.bookings, description: "Duyệt đơn → thu tiền tại sân → hoàn tất lượt chơi; hủy lịch và xác nhận hoàn tiền. Chỉ ADMIN." },
    { name: groups.reports, description: "Tổng quan vận hành, doanh thu và giờ cao điểm. Chỉ ADMIN." },
    { name: groups.users, description: "Tra cứu khách hàng, phân quyền và khóa/mở tài khoản. Chỉ ADMIN." },
    { name: groups.settings, description: "Thông tin website và số ngày mở lịch đặt sân. Chỉ ADMIN." },
    { name: groups.vendorCourts, description: "Cụm sân, sân nhỏ, giá và trạng thái từng khung giờ của chủ sân đang đăng nhập." },
    { name: groups.vendorActivity, description: "Thống kê, lịch đặt và đánh giá thuộc sân do tài khoản hiện tại quản lý." }
];

const courtProperties = {
    name: { type: "string", minLength: 1, maxLength: 300, example: "Cụm sân Thủ Đức" },
    location: { type: "string", minLength: 1, maxLength: 300, example: "Thủ Đức, TP.HCM" },
    address: { type: "string", maxLength: 300, example: "123 Võ Văn Ngân, Thủ Đức, TP.HCM" },
    latitude: { type: "number", minimum: -90, maximum: 90, nullable: true, description: "Nhập cùng longitude; có thể xóa cả hai tọa độ bằng null." },
    longitude: { type: "number", minimum: -180, maximum: 180, nullable: true },
    type: { type: "string", enum: ["INDOOR", "OUTDOOR"] },
    description: { type: "string", maxLength: 5000 }, pricePerHour: money,
    openTime: { ...time, example: "06:00", description: "Mặc định khi tạo: 06:00; giờ Việt Nam." },
    closeTime: { ...time, example: "22:00", description: "Phải sau openTime trong cùng ngày. Mặc định khi tạo: 22:00." },
    slotDuration: { type: "integer", minimum: 15, maximum: 720, example: 60, description: "Số phút mỗi khung giờ; không dài hơn khoảng mở cửa. Mặc định khi tạo: 60." },
    amenities: array({ type: "string", maxLength: 100 }), status: courtStatus
};
const multipart = create => ({
    required: true,
    description: "Gửi các ảnh bằng nhiều phần cùng tên images (không phải images[]). Tối đa 10 ảnh JPG/PNG/WebP, mỗi ảnh tối đa 10 MB. amenities là chuỗi phân cách bằng dấu phẩy. Khi cập nhật, ảnh mới được thêm vào danh sách hiện có.",
    content: {
        "multipart/form-data": { schema: {
            type: "object", ...(create ? { required: ["name", "location", "type", "pricePerHour"] } : {}),
            properties: {
                ...courtProperties,
                ...(create ? { status: { ...courtStatus, description: "Khi tạo mới, server luôn đặt AVAILABLE." } } : {}),
                amenities: { type: "string", example: "Bãi giữ xe,Phòng thay đồ,Nước uống" },
                images: { type: "array", maxItems: 10, items: { type: "string", format: "binary" } }
            }
        } },
        "application/json": { schema: {
            type: "object", ...(create ? { required: ["name", "location", "type", "pricePerHour"] } : {}),
            properties: courtProperties,
            description: "Dùng khi không tải ảnh; images dạng URL trong JSON không được API này nhập vào sân."
        } }
    }
});
const pagination = (max = 100) => [
    query("page", { type: "integer", minimum: 1, maximum: 10000, default: 1 }, "Trang kết quả"),
    query("limit", { type: "integer", minimum: 1, maximum: max, default: 10 }, "Số bản ghi mỗi trang")
];
const courtResult = result({ message: str, court: ref("ManagementCourt"), slotsPending: { type: "boolean" } });
const subCourtResult = result({ message: str, subCourt: ref("ManagementSubCourt") });
const bookingResult = result({ message: str, booking: ref("ManagementBooking") });
const uploadFailures = { 500: failure("Không thể lưu ảnh cục bộ"), 502: failure("Dịch vụ lưu ảnh từ chối upload"), 503: failure("Dịch vụ xác thực hoặc lưu ảnh chưa sẵn sàng") };
const closeConstraint = "Không thể ẩn/bảo trì sân còn lịch đặt đang diễn ra hoặc sắp tới. Việc đổi giờ mở cửa không được loại bỏ lịch đã đặt.";
const subCreateBody = body({ type: "object", required: ["name"], properties: { name: { type: "string", minLength: 1, maxLength: 300, example: "Sân số 3" } } });
const subUpdateBody = body(object({ name: { type: "string", minLength: 1, maxLength: 300 }, status: courtStatus }));

export const managementSchemas = {
    ManagementPagination: object({ totalItems: integer, currentPage: integer, totalPages: integer, limit: integer }),
    ManagementUser: object({ _id: id, fullName: str, email: { type: "string", format: "email" }, phone: { ...str, nullable: true }, avatar: { ...str, nullable: true }, role: str, vendorType: { ...str, nullable: true }, status: { type: "string", enum: ["ACTIVE", "BLOCKED"] }, createdAt: { type: "string", format: "date-time" } }),
    ManagementCourt: object({
        _id: id, ...courtProperties,
        images: array(object({ imageUrl: str, publicId: str })),
        vendorId: { nullable: true, oneOf: [id, ref("ManagementUser")] },
        subCourtsCount: integer, averageRating: number, reviewCount: integer, slotsPending: { type: "boolean" }
    }),
    ManagementSubCourt: object({ _id: id, courtId: id, name: str, status: courtStatus }),
    ManagementSlot: object({
        _id: id, courtId: id, subCourtId: { oneOf: [id, ref("ManagementSubCourt")] }, date, startTime: time, endTime: time,
        pricePerHour: money, isPriceOverride: { type: "boolean" }, isBooked: { type: "boolean" }, isBlocked: { type: "boolean" }, bookingId: { type: "string", nullable: true }
    }),
    ManagementBooking: object({
        _id: id, bookingCode: str, userId: { oneOf: [id, ref("ManagementUser")] }, courtId: { oneOf: [id, ref("ManagementCourt")] },
        slotId: id, bookingDate: date, startTime: time, endTime: time, durationHours: number,
        courtPrice: number, equipmentPrice: number, systemFee: number, discount: number, totalPrice: number,
        status: bookingStatus, paymentStatus: { type: "string", enum: ["UNPAID", "PAID", "REFUND_PENDING", "REFUNDED"] },
        paymentMethod: { type: "string", enum: ["CASH", "BANKING", "MOMO"] }, cancelReason: str, note: str,
        rentedEquipments: array({ type: "object", additionalProperties: true }), equipmentItems: array({ type: "object", additionalProperties: true })
    }),
    ManagementReview: object({
        _id: id, userId: { oneOf: [id, ref("ManagementUser")] }, courtId: { oneOf: [id, ref("ManagementCourt")] }, bookingId: id,
        rating: { type: "number", minimum: 1, maximum: 5 }, comment: str,
        images: array(object({ imageUrl: str, publicId: { ...str, nullable: true } })),
        status: { type: "string", enum: ["PENDING", "APPROVED", "HIDDEN", "DELETED"] }, createdAt: { type: "string", format: "date-time" }
    }),
    ManagementWebsiteInfo: {
        type: "object", required: ["title", "contactEmail", "contactPhone", "address"], additionalProperties: false,
        properties: Object.fromEntries(["title", "contactEmail", "contactPhone", "address"].map(key => [key, { type: "string", maxLength: 500 }]))
    },
    ManagementSettingsUpdate: {
        type: "object", additionalProperties: false,
        properties: { websiteInfo: ref("ManagementWebsiteInfo"), slotDaysAhead: { type: "integer", minimum: 1, maximum: 90, example: 30 } }
    },
    ManagementVendorStats: object({
        vendorType: str, totalCourts: integer, totalSubCourts: integer, totalBookings: integer, pendingBookings: integer,
        confirmedBookings: integer, completedBookings: integer, cancelledBookings: integer, totalRevenue: number,
        averageRating: number, totalReviews: integer, monthlyRevenue: array(object({ month: str, revenue: number, bookings: integer }))
    })
};

export const managementPaths = {
    "/admin/courts": {
        get: op(groups.courts, "Danh sách tất cả cụm sân", "Bao gồm sân AVAILABLE, MAINTENANCE và HIDDEN; tìm kiếm tên/địa chỉ không phân biệt dấu.", {
            parameters: [
                ...pagination(50), query("status", courtStatus, "Trạng thái sân"), query("type", courtProperties.type, "Trong nhà / ngoài trời"),
                query("search", str, "Tìm theo tên, khu vực hoặc địa chỉ"), query("location", str, "Tên khu vực tự do"),
                query("locationId", str, "Mã khu vực lấy từ GET /courts/locations; ưu tiên hơn location"),
                query("minPrice", { type: "number", minimum: 0 }, "Giá tối thiểu mỗi giờ"), query("maxPrice", { type: "number", minimum: 0 }, "Giá tối đa mỗi giờ")
            ],
            responses: { 200: result({ courts: array(ref("ManagementCourt")), pagination: ref("ManagementPagination") }) }
        }),
        post: created(op(groups.courts, "Tạo cụm sân và tải ảnh", "Tạo sân AVAILABLE. Tiếp tục gọi POST /admin/courts/{courtId}/subcourts để tạo sân nhỏ và sinh lịch; endpoint này không tự tạo sân nhỏ hoặc gán vendorId.", { requestBody: multipart(true), responses: { 201: courtResult, ...uploadFailures } }))
    },
    "/admin/courts/{id}": {
        get: op(groups.courts, "Chi tiết cụm sân", "Trả về cụm sân và toàn bộ sân nhỏ thuộc cụm.", { parameters: [pathId()], responses: { 200: result({ court: ref("ManagementCourt"), subCourts: array(ref("ManagementSubCourt")) }) } }),
        put: op(groups.courts, "Cập nhật cụm sân và bổ sung ảnh", `${closeConstraint} Nếu đồng bộ lịch gặp lỗi, dữ liệu sân vẫn được lưu và slotsPending=true.`, { parameters: [pathId()], requestBody: multipart(false), responses: { 200: courtResult, ...uploadFailures } }),
        delete: op(groups.courts, "Ẩn cụm sân", `Chuyển status sang HIDDEN, không xóa lịch sử. ${closeConstraint}`, { parameters: [pathId()], responses: { 200: courtResult } })
    },
    "/admin/courts/{id}/block": {
        put: op(groups.courts, "Bật/tắt trạng thái bảo trì", `AVAILABLE → MAINTENANCE; trạng thái khác → AVAILABLE. Không cần request body. ${closeConstraint}`, { parameters: [pathId()], responses: { 200: courtResult } })
    },
    "/admin/courts/{id}/images/{publicId}": {
        delete: op(groups.courts, "Xóa một ảnh của cụm sân", "Dùng publicId trong court.images. Khi tự xây dựng URL, mã hóa toàn bộ publicId bằng encodeURIComponent để dấu / trở thành %2F; không thay bằng imageUrl. Swagger sẽ mã hóa giá trị path khi gửi, hãy nhập publicId nguyên bản.", {
            parameters: [pathId(), { name: "publicId", in: "path", required: true, schema: str, description: "Ví dụ local:courts/ten-anh.jpg hoặc PickleballPro_Media/courts/ma-anh" }], responses: { 200: courtResult }
        })
    },
    // Express uses :id for GET and :courtId for POST. OpenAPI uses one shared
    // parameter name because these routes have the same URL template.
    "/admin/courts/{courtId}/subcourts": {
        get: op(groups.courts, "Danh sách sân nhỏ trong cụm", "Bao gồm cả sân nhỏ đang ẩn; sắp xếp theo tên.", { parameters: [pathId("courtId")], responses: { 200: result({ subCourts: array(ref("ManagementSubCourt")) }) } }),
        post: created(op(groups.courts, "Thêm sân nhỏ và sinh lịch", "Tên không được trùng sân nhỏ đang hoạt động. Nếu tên khớp sân đã ẩn thì mở lại sân đó và sinh lịch.", { parameters: [pathId("courtId")], requestBody: subCreateBody, responses: { 201: subCourtResult } }))
    },
    "/admin/subcourts/{id}": {
        put: op(groups.courts, "Sửa tên hoặc trạng thái sân nhỏ", closeConstraint, { parameters: [pathId()], requestBody: subUpdateBody, responses: { 200: subCourtResult } }),
        delete: op(groups.courts, "Ẩn sân nhỏ", `Ẩn sân nhỏ và xóa các ô giờ chưa đặt từ hôm nay trở đi. ${closeConstraint}`, { parameters: [pathId()] })
    },
    "/admin/bookings": {
        get: op(groups.bookings, "Tra cứu toàn bộ đơn đặt sân", "Ẩn yêu cầu giữ chỗ chưa hoàn tất hoặc thất bại; sắp xếp mới nhất trước.", {
            parameters: [...pagination(), query("status", bookingStatus, "Trạng thái đơn"), query("courtId", id, "Lọc theo cụm sân"), query("search", str, "Tìm mã booking"), query("startDate", date, "Ngày chơi bắt đầu"), query("endDate", date, "Ngày chơi kết thúc, không trước startDate")],
            responses: { 200: result({ bookings: array(ref("ManagementBooking")), pagination: ref("ManagementPagination") }) }
        })
    },
    "/admin/bookings/{id}/confirm": {
        put: op(groups.bookings, "Duyệt đơn đặt sân", "PENDING → CONFIRMED. Giờ chơi chưa bắt đầu; ô giờ phải vẫn được giữ bởi đơn này và sân/cụm sân đang AVAILABLE. Gửi thông báo tới khách. Không cần request body.", { parameters: [pathId()], responses: { 200: bookingResult, 409: failure("Đơn không chờ duyệt, ô giờ không hợp lệ hoặc đơn vừa thay đổi") } })
    },
    "/admin/bookings/{id}/cash-payment": {
        put: op(groups.bookings, "Ghi nhận đã thu tiền mặt", "Chỉ đơn CONFIRMED, paymentMethod=CASH và paymentStatus=UNPAID. Đổi sang PAID và ghi nhận thời điểm/người thu tiền. Không cần request body.", { parameters: [pathId()], responses: { 200: bookingResult, 409: failure("Đơn không đủ điều kiện thu tiền mặt") } })
    },
    "/admin/bookings/{id}/complete": {
        put: op(groups.bookings, "Hoàn tất lượt chơi", "Chỉ CONFIRMED và PAID, sau giờ kết thúc lượt chơi (Asia/Ho_Chi_Minh). Chuyển COMPLETED, cho phép khách đánh giá và xét ưu đãi thân thiết. Không cần request body.", { parameters: [pathId()], responses: { 200: bookingResult, 409: failure("Đơn chưa xác nhận/thanh toán hoặc vừa thay đổi") } })
    },
    "/admin/bookings/{id}/cancel": {
        put: op(groups.bookings, "Hủy đơn và giải phóng giờ sân", "ADMIN không bị giới hạn tự hủy trước 36 tiếng như khách. Không được hủy COMPLETED hoặc yêu cầu giữ chỗ PREPARING. Nếu đã PAID thì chuyển REFUND_PENDING; thao tác này chưa xác nhận tiền đã hoàn trả.", {
            parameters: [pathId()], requestBody: body(object({ cancelReason: { type: "string", maxLength: 1000, example: "Khách yêu cầu đổi lịch." } })),
            responses: { 200: result({ message: str, booking: ref("ManagementBooking"), bookingCode: str, status: bookingStatus, refundPending: { type: "boolean" }, refunded: { type: "boolean" } }), 404: failure("Không tìm thấy đơn"), 409: failure("Không thể hủy ở trạng thái hiện tại") }
        })
    },
    "/admin/bookings/{id}/refund": {
        put: op(groups.bookings, "Xác nhận đã hoàn tiền", "Chỉ CANCELLED và REFUND_PENDING → REFUNDED. Đây là ghi nhận việc hoàn trả đã thực hiện bên ngoài hệ thống, không phải API chuyển tiền. Không cần request body.", { parameters: [pathId()], responses: { 200: result({ message: str, booking: ref("ManagementBooking"), refunded: { type: "boolean", example: true } }), 409: failure("Đơn chưa hủy hoặc không chờ hoàn tiền") } })
    },
    "/admin/analytics/dashboard": {
        get: op(groups.reports, "Tổng quan vận hành", "Số sân/tài khoản/đơn; doanh thu đơn PAID ở trạng thái CONFIRMED hoặc COMPLETED; tỷ lệ ô giờ đã đặt; đánh giá 30 ngày gần nhất và 10 sân nổi bật.", {
            responses: { 200: result({
                totalCourts: integer, totalBookings: integer, totalUsers: integer, totalVendors: integer, totalEquipments: integer,
                totalRevenue: number, courtRevenue: number, equipmentRevenue: number, totalSlots: integer, bookedSlots: integer, occupancyRate: number, newReviewCount: integer,
                bookingStatusBreakdown: array(object({ _id: bookingStatus, count: integer })), topCourtsByBooking: array(object({ _id: id, name: str, location: str, bookingCount: integer, totalRevenue: number }))
            }) }
        })
    },
    "/admin/analytics/revenue": {
        get: op(groups.reports, "Doanh thu theo khoảng ngày", "Mặc định 30 ngày gần nhất. data nhóm theo ngày chơi của đơn PAID, CONFIRMED/COMPLETED. cashFlow là tối đa 100 bản ghi sổ thu theo thời điểm tạo trong khoảng ngày UTC.", {
            parameters: [query("startDate", date, "Ngày bắt đầu"), query("endDate", date, "Ngày kết thúc")],
            responses: { 200: result({ period: object({ startDate: date, endDate: date }), data: array(object({ _id: date, totalRevenue: number, courtRevenue: number, equipmentRevenue: number, bookingCount: integer })), cashFlow: array({ type: "object", additionalProperties: true }) }) }
        })
    },
    "/admin/analytics/peak-hours": {
        get: op(groups.reports, "Giờ chơi được đặt nhiều nhất", "Đếm đơn CONFIRMED/COMPLETED theo startTime, giảm dần theo số đơn.", { responses: { 200: result({ peakHours: array(object({ _id: time, count: integer })) }) } })
    },
    "/admin/users": {
        get: op(groups.users, "Danh sách tài khoản", "Tìm tên/email; trả về thông tin tài khoản không chứa mật khẩu.", {
            parameters: [query("page", { type: "integer", minimum: 1, default: 1 }, "Trang kết quả"), query("limit", { type: "integer", minimum: 1, default: 10 }, "Số bản ghi mỗi trang"), query("role", { type: "string", enum: ["USER", "ADMIN", "VENDOR"] }, "Vai trò"), query("vendorType", { type: "string", enum: ["COURT"] }, "Loại chủ sân"), query("status", { type: "string", enum: ["ACTIVE", "BLOCKED"] }, "Trạng thái"), query("search", str, "Tên hoặc email")],
            responses: { 200: result({ users: array(ref("ManagementUser")), pagination: ref("ManagementPagination") }) }
        })
    },
    "/admin/users/{id}": {
        get: op(groups.users, "Hồ sơ khách và lịch sử đặt sân", "Trả tối đa 20 đơn gần nhất cùng dữ liệu thuê dụng cụ cũ nếu có.", { parameters: [pathId()], responses: { 200: result({ user: ref("ManagementUser"), bookingHistory: array(ref("ManagementBooking")), equipmentRentals: array({ type: "object", additionalProperties: true }) }) } })
    },
    "/admin/users/{id}/toggle-status": {
        put: op(groups.users, "Khóa/mở tài khoản", "ACTIVE ↔ BLOCKED. Không được khóa tài khoản ADMIN. Không cần request body.", { parameters: [pathId()], responses: { 200: result({ message: str, user: ref("ManagementUser") }) } })
    },
    "/admin/users/{id}/role": {
        put: op(groups.users, "Thay đổi vai trò tài khoản", "Khi role=VENDOR, phải gửi vendorType=COURT. Với USER hoặc ADMIN, vendorType được đặt null. Vai trò mới được kiểm tra ở các yêu cầu sau.", {
            parameters: [pathId()], requestBody: body({ type: "object", required: ["role"], properties: { role: { type: "string", enum: ["USER", "ADMIN", "VENDOR"] }, vendorType: { type: "string", enum: ["COURT"] } }, example: { role: "VENDOR", vendorType: "COURT" } }),
            responses: { 200: result({ message: str, user: ref("ManagementUser") }) }
        })
    },
    "/admin/settings": {
        get: op(groups.settings, "Đọc cấu hình hệ thống", "Trả về map key → value. Có thể chứa các khóa cũ chỉ để đọc; hiện chỉ websiteInfo và slotDaysAhead được sửa.", { responses: { 200: result({ settings: { type: "object", additionalProperties: true, properties: managementSchemas.ManagementSettingsUpdate.properties } }) } }),
        put: op(groups.settings, "Cập nhật thông tin website / thời hạn lịch", "Body là map khóa cấu hình, không bọc trong settings. Nếu cập nhật websiteInfo phải cung cấp đủ title, contactEmail, contactPhone, address. Khóa ngoài websiteInfo/slotDaysAhead bị từ chối 501.", {
            requestBody: body(ref("ManagementSettingsUpdate")), responses: { 200: result({ message: str, settings: { type: "object", additionalProperties: true } }), 501: failure("Khóa cấu hình chưa được hỗ trợ") }
        })
    },
    "/vendor/courts": {
        get: op(groups.vendorCourts, "Cụm sân của tôi", "Danh sách sân do tài khoản hiện tại sở hữu, kèm số sân nhỏ. Không phân trang.", { responses: { 200: result({ courts: array(ref("ManagementCourt")) }) } }),
        post: created(op(groups.vendorCourts, "Đăng cụm sân mới", "Riêng thao tác tạo sân yêu cầu tài khoản VENDOR, vendorType=COURT, status=ACTIVE (ADMIN không được tạo qua endpoint này). Gán vendorId từ token, tạo sẵn hai sân nhỏ và sinh lịch. Nếu sinh lịch gặp lỗi, court.slotsPending=true.", { requestBody: multipart(true), responses: { 201: result({ court: ref("ManagementCourt") }), ...uploadFailures } }))
    },
    "/vendor/courts/{id}": {
        put: op(groups.vendorCourts, "Sửa cụm sân của tôi", `${closeConstraint} Giá nền mới chỉ áp dụng các ô giờ tương lai chưa đặt, chưa khóa và chưa có giá ghi đè. Ảnh mới được nối thêm; court.slotsPending báo lịch cần đồng bộ lại.`, { parameters: [pathId()], requestBody: multipart(false), responses: { 200: result({ court: ref("ManagementCourt") }), ...uploadFailures } }),
        delete: op(groups.vendorCourts, "Ẩn cụm sân của tôi", `${closeConstraint} Đổi status=HIDDEN, giữ lịch sử.`, { parameters: [pathId()] })
    },
    "/vendor/courts/{courtId}/slots": {
        get: op(groups.vendorCourts, "Lịch và giá từng khung giờ", "Đồng bộ lịch rồi trả toàn bộ ô giờ của ngày, gồm cả đã đặt/đã khóa; có tên và trạng thái sân nhỏ. Giá trả về là giá hiệu lực của từng ô. Khi không tìm thấy sân thuộc tài khoản, controller hiện trả 400.", { parameters: [pathId("courtId"), query("date", date, "Ngày chơi theo Asia/Ho_Chi_Minh, dạng YYYY-MM-DD", true)], responses: { 200: result({ slots: array(ref("ManagementSlot")) }) } })
    },
    "/vendor/slots/{id}": {
        patch: op(groups.vendorCourts, "Đổi giá hoặc khóa/mở một khung giờ", "Chỉ ô chưa đặt và chưa bắt đầu. pricePerHour thiết lập giá riêng với isPriceOverride=true; isBlocked phải là boolean. Không hỗ trợ đổi ngày/giờ bằng API này. Controller hiện trả 400 khi ô không tồn tại, không thuộc tài khoản, đã đặt/đã bắt đầu hoặc vừa thay đổi; đọc message và tải lại lịch.", {
            parameters: [pathId()], requestBody: body({ type: "object", anyOf: [{ required: ["pricePerHour"] }, { required: ["isBlocked"] }], properties: { pricePerHour: money, isBlocked: { type: "boolean" } }, example: { pricePerHour: 150000, isBlocked: false } }),
            responses: { 200: result({ slot: ref("ManagementSlot") }) }
        })
    },
    "/vendor/courts/{courtId}/subcourts": {
        get: op(groups.vendorCourts, "Các sân nhỏ của cụm sân", "Bao gồm sân đang ẩn; chỉ cụm sân thuộc tài khoản hiện tại.", { parameters: [pathId("courtId")], responses: { 200: result({ subCourts: array(ref("ManagementSubCourt")) }) } }),
        post: created(op(groups.vendorCourts, "Thêm sân nhỏ vào cụm của tôi", "Tên không trùng sân nhỏ đang hoạt động. Tên trùng sân đã ẩn sẽ mở lại sân đó; tự sinh lịch đặt sân.", { parameters: [pathId("courtId")], requestBody: subCreateBody, responses: { 201: subCourtResult } }))
    },
    "/vendor/subcourts/{id}": {
        put: op(groups.vendorCourts, "Sửa tên hoặc trạng thái sân nhỏ", closeConstraint, { parameters: [pathId()], requestBody: subUpdateBody, responses: { 200: subCourtResult } }),
        delete: op(groups.vendorCourts, "Ẩn sân nhỏ của tôi", `${closeConstraint} Xóa ô giờ chưa đặt từ hôm nay trở đi, giữ lịch sử.`, { parameters: [pathId()] })
    },
    "/vendor/stats": {
        get: op(groups.vendorActivity, "Tổng quan hoạt động chủ sân", "Dùng tài khoản VENDOR/COURT để nhận thống kê sân, đơn, doanh thu đã hoàn tất và đánh giá đã duyệt. monthlyRevenue nhóm theo tháng tạo đơn trong năm hiện tại. ADMIN được middleware cho qua nhưng nếu không có vendorType=COURT, dịch vụ hiện trả cấu trúc thống kê nhà cung cấp cũ.", { responses: { 200: result({ stats: ref("ManagementVendorStats") }) } })
    },
    "/vendor/bookings": {
        get: op(groups.vendorActivity, "Đơn đặt tại sân của tôi", "Danh sách mới nhất trước, kèm khách hàng và thông tin sân. Không phân trang. Không cung cấp thao tác duyệt tại nhóm vendor; duyệt qua tài khoản ADMIN.", { parameters: [query("status", bookingStatus, "Lọc trạng thái đơn")], responses: { 200: result({ bookings: array(ref("ManagementBooking")) }) } })
    },
    "/vendor/reviews": {
        get: op(groups.vendorActivity, "Đánh giá tại sân của tôi", "Trả đánh giá của mọi trạng thái thuộc các sân của tài khoản hiện tại, mới nhất trước; có thông tin tác giả và sân.", { responses: { 200: result({ reviews: array(ref("ManagementReview")) }) } })
    }
};
