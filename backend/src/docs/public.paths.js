// OpenAPI contracts for the active player routes. Keep these aligned with the
// route, controller and service contracts; disabled workflows are documented separately.
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const object = (properties, required = []) => ({ type: "object", properties, ...(required.length ? { required } : {}) });
const array = items => ({ type: "array", items });
const string = (extra = {}) => ({ type: "string", ...extra });
const integer = (extra = {}) => ({ type: "integer", ...extra });
const money = { type: "number", minimum: 0, description: "Số tiền bằng VND." };
const bool = { type: "boolean" };
const id = ref("ObjectId");
const date = string({ format: "date", description: "Ngày theo múi giờ Việt Nam (UTC+07:00), YYYY-MM-DD." });
const time = string({ pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$", example: "18:00" });
const email = string({ format: "email", example: "player@example.com" });
const password = string({ format: "password", minLength: 6, writeOnly: true });
const otp = string({ pattern: "^[0-9]{6}$", example: "123456" });
const query = (name, schema, description, required = false) => ({ in: "query", name, schema, ...(description ? { description } : {}), ...(required ? { required } : {}) });
const pathId = (name = "id", description = "Mã định danh MongoDB của bản ghi.") => ({ in: "path", name, required: true, schema: id, description });
const json = schema => ({ required: true, content: { "application/json": { schema } } });
const response = (description, schema = ref("Success")) => ({ description, content: { "application/json": { schema } } });
const error = description => response(description, ref("Error"));
const envelope = properties => object({ success: bool, ...properties });
const bearer = [{ BearerAuth: [] }];
const secured = { security: bearer };
const optional = { security: [{}, { BearerAuth: [] }] };
const authErrors = { 401: error("Thiếu token, token hết hạn hoặc phiên đăng nhập đã kết thúc."), 403: error("Tài khoản bị khóa hoặc không có quyền thực hiện."), 503: error("Tạm thời không thể kiểm tra phiên đăng nhập.") };
const limited = { 429: error("Vượt giới hạn số yêu cầu. Vui lòng thử lại sau.") };
function operation(tag, summary, options = {}) {
    const { ok = "Thành công.", status = 200, schema, errors = {}, ...rest } = options;
    return { tags: [tag], summary, ...rest, responses: { [status]: response(ok, schema), 400: error("Dữ liệu đầu vào hoặc điều kiện nghiệp vụ không hợp lệ."), ...(rest.security?.some(item => item.BearerAuth) && !rest.security.some(item => Object.keys(item).length === 0) ? authErrors : {}), ...errors } };
}
const paged = (fallback, maximum) => [query("page", integer({ minimum: 1, default: 1 }), "Trang kết quả."), query("limit", integer({ minimum: 1, maximum, default: fallback }), "Số bản ghi mỗi trang.")];
const courtFilters = [
    query("search", string(), "Tìm theo tên sân, địa chỉ và khu vực; hỗ trợ tìm không dấu."),
    query("location", string(), "Khu vực nhập tự do, ví dụ Thủ Đức."),
    query("locationId", string(), "Mã khu vực trả về từ /courts/locations; được ưu tiên hơn location."),
    query("type", string({ enum: ["INDOOR", "OUTDOOR"] }), "Sân trong nhà hoặc ngoài trời."),
    query("minPrice", money, "Giá cơ bản theo giờ tối thiểu."), query("maxPrice", money, "Giá cơ bản theo giờ tối đa."),
    query("date", date, "Chỉ lấy sân còn ô giờ trống trong tương lai vào ngày này."), ...paged(6, 50)
];
const couponFields = {
    code: string({ example: "KHACHTHAN10" }), name: string({ example: "Ưu đãi khách hàng thân thiết" }), description: string(),
    discountType: string({ enum: ["PERCENT", "FIXED"] }), discountValue: { ...money, description: "Phần trăm (0–100) nếu PERCENT; số tiền VND nếu FIXED." },
    minOrderValue: { ...money, default: 0 }, maxDiscountValue: { ...money, nullable: true }, usageLimit: { type: "number", nullable: true },
    perUserLimit: { type: "number", minimum: 1, default: 1 },
    startDate: string({ example: "2027-01-01", description: "YYYY-MM-DD hoặc thời điểm ISO 8601; ngày không có giờ được tính từ 00:00 tại Việt Nam." }),
    endDate: string({ example: "2027-12-31", description: "YYYY-MM-DD hoặc thời điểm ISO 8601; ngày không có giờ được tính đến 23:59:59 tại Việt Nam." }),
    status: string({ enum: ["ACTIVE", "INACTIVE", "EXPIRED"], default: "ACTIVE" }),
    applicableCourtIds: { ...array(id), description: "Để trống để áp dụng cho mọi sân." },
    targetUserIds: { ...array(id), description: "Để trống để áp dụng cho mọi tài khoản." }
};

export const publicTags = [
    { name: "Xác thực", description: "Đăng nhập, đăng ký bằng OTP, Google ID token và quản lý phiên." },
    { name: "Sân & tìm kiếm", description: "Danh sách sân, gợi ý khu vực, tìm quanh vị trí và lịch ô giờ." },
    { name: "Tương tác sân", description: "Sân yêu thích, lịch sử xem và sân tương tự." },
    { name: "Đặt sân", description: "Giữ ô giờ, theo dõi lịch sử và hủy lượt đặt. Hiện thanh toán tại sân." },
    { name: "Tài khoản", description: "Hồ sơ cá nhân và ảnh đại diện của tài khoản đang đăng nhập." },
    { name: "Đánh giá", description: "Đọc đánh giá đã duyệt; gửi đánh giá sau lượt chơi đã hoàn tất và thanh toán." },
    { name: "Ưu đãi", description: "Mã giảm giá công khai hoặc được cấp riêng cho tài khoản, gồm ưu đãi khách quen." },
    { name: "Điểm thưởng", description: "Xem ví và lịch sử điểm. Sử dụng điểm khi đặt sân hiện chưa hoạt động." },
    { name: "Thông báo", description: "Thông báo cá nhân và luồng cập nhật trực tiếp SSE." },
    { name: "Quản trị · Đánh giá", description: "ADMIN: xem và kiểm duyệt đánh giá sân." },
    { name: "Quản trị · Ưu đãi", description: "ADMIN: quản lý mã giảm giá và đối tượng được nhận ưu đãi." }
];

export const publicSchemas = {
    PublicPagination: object({ totalItems: integer(), currentPage: integer(), totalPages: integer(), limit: integer() }),
    PublicImage: object({ imageUrl: string({ description: "URL ảnh hoặc đường dẫn tương đối /uploads/..." }), publicId: string() }),
    PublicUser: object({ id, _id: id, fullName: string(), email, role: string(), phone: string({ nullable: true }), avatar: string({ nullable: true }), status: string(), vendorType: string({ nullable: true }) }),
    PublicLoginResponse: envelope({ message: string(), accessToken: string(), refreshToken: string(), redirectUrl: string(), user: ref("PublicUser") }),
    PublicCourt: object({
        _id: id, name: string(), location: string(), address: string(), latitude: { type: "number" }, longitude: { type: "number" },
        type: string({ enum: ["INDOOR", "OUTDOOR"] }), images: array(ref("PublicImage")), description: string(), pricePerHour: money,
        openTime: time, closeTime: time, slotDuration: integer({ description: "Độ dài ô giờ, tính bằng phút." }), amenities: array(string()),
        status: string({ enum: ["AVAILABLE", "MAINTENANCE", "HIDDEN"] }), averageRating: { type: "number" }, reviewCount: integer(),
        favoriteCount: integer(), viewCount: integer(), bookingCount: integer(), distanceKm: { type: "number", description: "Chỉ có ở kết quả tìm sân gần đây." }
    }),
    PublicCourtList: envelope({ courts: array(ref("PublicCourt")), targetDate: date, radius: { type: "number" }, pagination: ref("PublicPagination") }),
    PublicCourtSlot: object({
        _id: id, courtId: id, subCourtId: id, date, startTime: time, endTime: time, pricePerHour: money,
        isBooked: bool, isBlocked: bool, isUnavailable: bool, isPast: bool, isMaintenance: bool, isPriceOverride: bool
    }),
    PublicCourtDetailResponse: envelope({ court: object({ court: ref("PublicCourt"), targetDate: date, subCourtsTimeline: array(object({ _id: id, name: string(), status: string(), slots: array(ref("PublicCourtSlot")) })) }) }),
    PublicBookingCreate: object({
        slotId: id, couponCode: string({ maxLength: 64 }), paymentMethod: string({ enum: ["CASH"], default: "CASH" }),
        note: string({ maxLength: 1000 }), requestKey: string({ pattern: "^[a-zA-Z0-9_-]{16,100}$", description: "Mã chống gửi lặp do client tạo. Giữ cùng mã khi thử lại cùng lượt đặt; tạo mã mới cho lượt đặt mới." }),
        equipments: { type: "array", items: { type: "object" }, maxItems: 0, description: "Hiện chỉ nhận mảng rỗng; thuê thiết bị đang phát triển." },
        pointsToUse: integer({ enum: [0], default: 0, description: "Sử dụng điểm khi đặt sân đang phát triển." })
    }, ["slotId"]),
    PublicBookingCreated: envelope({ message: string(), bookingId: id, bookingCode: string(), totalPrice: money, courtPrice: money, equipmentPrice: money, discount: money, couponCode: string({ nullable: true }), pointsUsed: integer() }),
    PublicCouponCreate: object({
        ...couponFields,
        targetEmails: { oneOf: [string({ example: "player@example.com,friend@example.com" }), array(email)], description: "Chỉ dùng khi tạo mã. Tìm tài khoản USER đang ACTIVE; nếu có email thì ghi đè targetUserIds." }
    }, ["code", "name", "discountType", "discountValue", "startDate", "endDate"]),
    PublicCouponUpdate: object(couponFields),
    PublicCoupon: object({ _id: id, ...couponFields, usedCount: integer(), loyaltyReward: bool, estimatedDiscount: money }),
    PublicNotification: object({ _id: id, title: string(), content: string(), message: string(), type: string(), isRead: bool, referenceId: string({ nullable: true }), referenceType: string({ nullable: true }), createdAt: string({ format: "date-time" }) })
};

export const publicPaths = {
    "/auth/login": { post: operation("Xác thực", "Đăng nhập bằng email và mật khẩu", {
        description: "Trả accessToken và refreshToken ở cấp ngoài cùng của JSON. Sao chép accessToken vào nút Authorize để gọi API có biểu tượng khóa.",
        requestBody: json(object({ email, password }, ["email", "password"])), schema: ref("PublicLoginResponse"), errors: limited
    }) },
    "/auth/google-login": { post: operation("Xác thực", "Đăng nhập bằng Google ID token", {
        description: "Gửi ID token do Google Identity Services cấp cho Google Client ID đã cấu hình. Đây không phải OAuth authorization code hay access token của Google.",
        requestBody: json(object({ idToken: string({ minLength: 1, description: "Google ID token nhận từ callback credential." }) }, ["idToken"])), schema: ref("PublicLoginResponse"), errors: limited
    }) },
    "/auth/register": { post: operation("Xác thực", "Đăng ký bước 1 · gửi OTP qua email", {
        description: "Lưu yêu cầu đăng ký trong Redis trong 5 phút và gửi OTP gồm 6 chữ số. Tài khoản chỉ được tạo sau bước verify-otp.",
        requestBody: json(object({ fullName: string({ minLength: 2, maxLength: 100, example: "Nguyễn Minh Anh" }), email, password }, ["fullName", "email", "password"])),
        ok: "Đã gửi mã OTP; chưa đăng nhập và chưa cấp token.", errors: { ...limited, 503: error("Dịch vụ email chưa được cấu hình hoặc không gửi được OTP.") }
    }) },
    "/auth/verify-otp": { post: operation("Xác thực", "Đăng ký bước 2 · xác nhận OTP", {
        requestBody: json(object({ email, otpCode: otp }, ["email", "otpCode"])), status: 201,
        ok: "Tài khoản đã được tạo. Tiếp tục gọi /auth/login để nhận token.", errors: limited
    }) },
    "/auth/forgot-password": { post: operation("Xác thực", "Gửi OTP khôi phục mật khẩu", {
        description: "OTP có hiệu lực 5 phút. Giới hạn gửi OTP theo tài khoản là 3 lần trong 15 phút, ngoài giới hạn IP.",
        requestBody: json(object({ email }, ["email"])), errors: { ...limited, 503: error("Dịch vụ email chưa được cấu hình hoặc không gửi được OTP.") }
    }) },
    "/auth/reset-password": { put: operation("Xác thực", "Đặt mật khẩu mới bằng OTP", {
        description: "Đổi mật khẩu, xóa OTP đã dùng và thu hồi refresh token hiện tại. Đăng nhập lại để nhận phiên mới.",
        requestBody: json(object({ email, otpCode: otp, newPassword: password }, ["email", "otpCode", "newPassword"])), errors: limited
    }) },
    "/auth/refresh-token": { post: operation("Xác thực", "Cấp access token mới", {
        description: "Gửi refreshToken trong JSON, không dùng Bearer access token cho yêu cầu này. Phản hồi chỉ cấp accessToken mới.",
        requestBody: json(object({ refreshToken: string({ minLength: 1 }) }, ["refreshToken"])), schema: envelope({ accessToken: string() }),
        errors: { ...limited, 401: error("Refresh token không hợp lệ, hết hạn hoặc đã bị thu hồi.") }
    }) },
    "/auth/logout": { post: operation("Xác thực", "Đăng xuất và thu hồi phiên", {
        ...secured, description: "Đưa access token hiện tại vào danh sách thu hồi và xóa refresh token của tài khoản trong Redis.",
        errors: { 500: error("Lỗi hệ thống khi đăng xuất.") }
    }) },
    "/courts": { get: operation("Sân & tìm kiếm", "Tìm và lọc danh sách sân", {
        parameters: courtFilters, schema: ref("PublicCourtList"), description: "Lọc theo khu vực, tên sân, giá và loại sân. Khi có date, chỉ trả các sân còn ô giờ tương lai chưa được đặt và chưa bị khóa.", errors: limited
    }) },
    "/courts/locations": { get: operation("Sân & tìm kiếm", "Gợi ý khu vực và địa chỉ sân", {
        description: "Gợi ý từ danh mục hành chính nội bộ và địa chỉ sân công khai; hỗ trợ tên khu vực cũ và tìm không dấu. Không gọi Google Places. Gợi ý địa điểm không đồng nghĩa sân còn chỗ.",
        parameters: [query("q", string({ maxLength: 120 }), "Từ khóa; bỏ trống để lấy gợi ý ban đầu."), query("limit", integer({ minimum: 1, maximum: 15, default: 8 }))],
        ok: "Danh sách gợi ý gồm id, label, value, description, source và có thể có locationId/courtCount.",
        errors: { ...limited, 503: error("Chưa tải được địa chỉ sân để gợi ý.") }
    }) },
    "/courts/nearby": { get: operation("Sân & tìm kiếm", "Tìm sân còn chỗ trong bán kính", {
        parameters: [query("lat", { type: "number", minimum: -90, maximum: 90, example: 10.85 }, "Vĩ độ điểm tìm kiếm.", true), query("lng", { type: "number", minimum: -180, maximum: 180, example: 106.76 }, "Kinh độ điểm tìm kiếm.", true), query("radius", { type: "number", minimum: 0, exclusiveMinimum: true, maximum: 100, default: 5 }, "Bán kính theo km."), ...courtFilters],
        description: "Sắp theo khoảng cách; chỉ trả sân có tọa độ và còn ô giờ tương lai trong ngày chọn. Nếu bỏ date, dùng ngày hiện tại tại Việt Nam.", schema: ref("PublicCourtList"), errors: limited
    }) },
    "/courts/{id}": { get: operation("Sân & tìm kiếm", "Chi tiết sân và lịch các sân con", {
        parameters: [pathId(), query("date", date, "Bỏ trống để xem ngày hiện tại tại Việt Nam.")], schema: ref("PublicCourtDetailResponse"),
        description: "Đọc court.subCourtsTimeline[].slots[] để chọn _id gửi làm slotId khi đặt sân. Các cờ isBooked, isUnavailable, isPast và isMaintenance mô tả trạng thái ô giờ; giá hiện tại ở pricePerHour.", errors: limited
    }) },
    "/courts/me/favorites": { get: operation("Tương tác sân", "Danh sách sân yêu thích của tôi", {
        ...secured, schema: envelope({ courts: array(ref("PublicCourt")) }), errors: limited
    }) },
    "/courts/me/recently-viewed": { get: operation("Tương tác sân", "Danh sách sân đã xem gần đây", {
        ...optional, parameters: [query("guestId", string({ pattern: "^[A-Za-z0-9_-]{8,100}$" }), "Dùng cho khách chưa đăng nhập; lấy từ phản hồi ghi lượt xem."), query("limit", integer({ minimum: 1, maximum: 20, default: 8 }))],
        description: "Ưu tiên lịch sử tài khoản khi có token hợp lệ. Với khách, dùng guestId. Không có cả hai thì trả danh sách rỗng.", schema: envelope({ courts: array(ref("PublicCourt")) }), errors: limited
    }) },
    "/courts/{courtId}/similar": { get: operation("Tương tác sân", "Gợi ý sân tương tự", {
        parameters: [pathId("courtId"), query("limit", integer({ minimum: 1, maximum: 12, default: 4 }))], schema: envelope({ courts: array(ref("PublicCourt")) }),
        description: "Tìm sân đang hoạt động có cùng loại, khu vực hoặc khoảng giá gần với sân hiện tại.", errors: limited
    }) },
    "/courts/{courtId}/view": { post: operation("Tương tác sân", "Ghi nhận một lượt xem sân", {
        ...optional, parameters: [pathId("courtId")], requestBody: json(object({ guestId: string({ pattern: "^[A-Za-z0-9_-]{8,128}$", description: "Bỏ trống để hệ thống cấp guestId; khi đã đăng nhập sử dụng lịch sử tài khoản." }) })),
        schema: envelope({ guestId: string() }), errors: limited
    }) },
    "/courts/{courtId}/favorite": {
        get: operation("Tương tác sân", "Kiểm tra sân có trong danh sách yêu thích", { ...secured, parameters: [pathId("courtId")], schema: envelope({ isFavorite: bool }), errors: limited }),
        post: operation("Tương tác sân", "Thêm hoặc bỏ sân yêu thích", { ...secured, parameters: [pathId("courtId")], description: "Đảo trạng thái hiện tại. Gọi lại sẽ đảo trạng thái lần nữa.", schema: envelope({ message: string(), isFavorite: bool }), errors: limited })
    },
    "/bookings": { post: operation("Đặt sân", "Đặt một ô giờ và chờ xác nhận", {
        ...secured, requestBody: json(ref("PublicBookingCreate")), status: 201, schema: ref("PublicBookingCreated"),
        description: "Lấy slotId từ chi tiết sân. Hệ thống giữ độc quyền ô giờ ngay khi tạo đơn PENDING, thanh toán CASH/UNPAID; quản trị viên xác nhận sau. Giá được tính trên server, gồm phí hệ thống 5% giá sân. requestKey giúp thử lại yêu cầu mà không tạo đơn trùng.",
        errors: { ...limited, 409: error("Ô giờ đã được đặt (SLOT_ALREADY_BOOKED), không còn khả dụng (SLOT_UNAVAILABLE), hoặc yêu cầu giữ chỗ trùng/thất bại (có thể có RESERVATION_FAILED)."), 501: error("Thuê thiết bị, dùng điểm hoặc thanh toán online chưa hoạt động.") }
    }) },
    "/bookings/my-bookings": { get: operation("Đặt sân", "Lịch sử đặt sân của tôi", {
        ...secured, ok: "success, count và bookings: các đơn của tài khoản hiện tại cùng thông tin sân.", errors: limited
    }) },
    "/bookings/{id}/cancel": { put: operation("Đặt sân", "Hủy lượt đặt sân của tôi", {
        ...secured, parameters: [pathId()], requestBody: json(object({ cancelReason: string({ maxLength: 1000 }) })),
        description: "Người đặt được tự hủy trước giờ chơi ít nhất 36 tiếng. Đơn đã hoàn tất hoặc đang giữ chỗ không thể hủy. Đơn đã thanh toán chuyển sang chờ hoàn tiền; API không tự chuyển tiền.",
        ok: "Trả message, booking, bookingCode, status, refundPending và refunded.",
        errors: { ...limited, 404: error("Không tìm thấy đơn."), 409: error("Trạng thái đơn không cho phép hủy hoặc vừa thay đổi.") }
    }) },
    "/users/profile": {
        get: operation("Tài khoản", "Xem hồ sơ cá nhân", { ...secured, schema: envelope({ user: ref("PublicUser") }), errors: limited }),
        put: operation("Tài khoản", "Cập nhật tên, điện thoại và ảnh đại diện", {
            ...secured, description: "Chỉ cập nhật fullName, phone và avatar. Ảnh đại diện được tải lên Cloudinary; không đổi email, mật khẩu hoặc quyền qua API này.",
            requestBody: { required: true, content: {
                "multipart/form-data": { schema: object({ fullName: string({ minLength: 2, maxLength: 100 }), phone: string({ description: "Số điện thoại 7–20 ký tự; gửi chuỗi rỗng để xóa." }), avatar: string({ format: "binary", description: "Một ảnh JPG, PNG hoặc WebP." }) }) },
                "application/json": { schema: object({ fullName: string({ minLength: 2, maxLength: 100 }), phone: string({ nullable: true }) }) }
            } }, schema: envelope({ message: string(), user: ref("PublicUser") }), errors: { ...limited, 500: { description: "Không thể tải ảnh lên Cloudinary hoặc lỗi middleware upload." } }
        })
    },
    "/reviews": {
        get: operation("Đánh giá", "Đọc bảng tin đánh giá đã duyệt", {
            parameters: [...paged(12, 30), query("courtId", id), query("rating", integer({ minimum: 1, maximum: 5 })), query("withPhotos", bool), query("sort", string({ enum: ["newest", "top"], default: "newest" }))],
            ok: "Danh sách reviews có thông tin người đánh giá, sân và pagination.", errors: limited
        }),
        post: operation("Đánh giá", "Gửi đánh giá sau khi hoàn tất lượt chơi", {
            ...secured, status: 201, description: "Yêu cầu booking của chính tài khoản, cùng courtId, trạng thái COMPLETED và PAID. Mỗi booking chỉ có một đánh giá. Đánh giá mới ở trạng thái PENDING, chỉ công khai sau khi ADMIN duyệt. Tối đa 5 ảnh qua trường images.",
            requestBody: { required: true, content: {
                "multipart/form-data": { schema: object({ courtId: id, bookingId: id, rating: integer({ minimum: 1, maximum: 5 }), comment: string({ maxLength: 1500 }), images: { ...array(string({ format: "binary" })), maxItems: 5 } }, ["courtId", "bookingId", "rating"]) },
                "application/json": { schema: object({ courtId: id, bookingId: id, rating: integer({ minimum: 1, maximum: 5 }), comment: string({ maxLength: 1500 }) }, ["courtId", "bookingId", "rating"]) }
            } }, ok: "Trả message và review đang chờ duyệt.", errors: { ...limited, 409: error("Đã gửi đánh giá cho lượt đặt này."), 500: { description: "Không thể tải ảnh lên Cloudinary hoặc lỗi middleware upload." } }
        })
    },
    "/reviews/courts/{courtId}": { get: operation("Đánh giá", "Đọc đánh giá đã duyệt của một sân", {
        parameters: [pathId("courtId"), ...paged(10, 50)], ok: "Danh sách reviews và pagination.", errors: limited
    }) },
    "/reviews/courts/{courtId}/eligibility": { get: operation("Đánh giá", "Kiểm tra lượt chơi đủ điều kiện đánh giá", {
        ...secured, parameters: [pathId("courtId")], ok: "canReview và eligibleBookings: các lượt đã hoàn tất, thanh toán, chưa được đánh giá.", errors: limited
    }) },
    "/reviews/my-booking/{bookingId}": { get: operation("Đánh giá", "Xem đánh giá đã gửi cho một lượt đặt", {
        ...secured, parameters: [pathId("bookingId")], ok: "hasReview và review (null nếu chưa có). Chỉ trả đánh giá thuộc tài khoản đang đăng nhập.", errors: limited
    }) },
    "/reviews/admin": { get: operation("Quản trị · Đánh giá", "Danh sách đánh giá cần quản lý", {
        ...secured, description: "Yêu cầu role ADMIN. Trả tối đa 100 đánh giá mới nhất, gồm thông tin người đánh giá, sân và booking.",
        parameters: [query("status", string({ enum: ["PENDING", "APPROVED", "HIDDEN", "DELETED"] })), query("courtId", id)], ok: "Danh sách reviews.", errors: limited
    }) },
    "/reviews/admin/{id}/status": { put: operation("Quản trị · Đánh giá", "Duyệt, ẩn hoặc đánh dấu xóa đánh giá", {
        ...secured, parameters: [pathId()], description: "Yêu cầu role ADMIN. DELETED là trạng thái lưu trong dữ liệu, không xóa vật lý. Cập nhật lại số lượt và điểm đánh giá của sân từ các review APPROVED.",
        requestBody: json(object({ status: string({ enum: ["PENDING", "APPROVED", "HIDDEN", "DELETED"] }) }, ["status"])), ok: "Trả message và review đã cập nhật.", errors: { ...limited, 404: error("Không tìm thấy đánh giá.") }
    }) },
    "/coupons/available": { get: operation("Ưu đãi", "Mã giảm giá còn dùng được của tôi", {
        ...secured, parameters: [query("orderValue", money, "Giá trị đơn dự kiến để tính estimatedDiscount.")], schema: envelope({ coupons: array(ref("PublicCoupon")) }),
        description: "Lấy mã đang ACTIVE và trong hạn, còn lượt dùng chung và lượt dùng của tài khoản. Bao gồm mã công khai và mã được cấp riêng. Kiểm tra sân áp dụng ở bước /coupons/validate hoặc khi đặt sân."
    }) },
    "/coupons/validate": { post: operation("Ưu đãi", "Kiểm tra mã giảm giá trước khi đặt sân", {
        ...secured, requestBody: json(object({ code: string(), orderValue: money, courtId: id }, ["code", "orderValue"])),
        description: "Gửi courtId để kiểm tra mã có áp dụng cho sân đã chọn hay không. Đây là bước kiểm tra dự kiến; khi tạo booking server kiểm tra lại mã và giá thực tế.", schema: envelope({ coupon: ref("PublicCoupon"), discountAmount: money })
    }) },
    "/coupons/admin": {
        get: operation("Quản trị · Ưu đãi", "Danh sách mã giảm giá", { ...secured, description: "Yêu cầu role ADMIN.", parameters: [query("status", string({ enum: ["ACTIVE", "INACTIVE", "EXPIRED"] }))], schema: envelope({ coupons: array(ref("PublicCoupon")) }) }),
        post: operation("Quản trị · Ưu đãi", "Tạo mã giảm giá hoặc ưu đãi riêng", { ...secured, description: "Yêu cầu role ADMIN. Chọn targetEmails hoặc targetUserIds để cấp riêng; bỏ trống để dùng chung. Có thể giới hạn applicableCourtIds.", requestBody: json(ref("PublicCouponCreate")), status: 201, schema: envelope({ message: string(), coupon: ref("PublicCoupon") }) })
    },
    "/coupons/admin/{id}": {
        put: operation("Quản trị · Ưu đãi", "Cập nhật mã giảm giá", { ...secured, description: "Yêu cầu role ADMIN. Chỉ gửi các trường cần đổi. Để đổi người nhận, dùng targetUserIds; targetEmails chỉ được xử lý khi tạo mã.", parameters: [pathId()], requestBody: json(ref("PublicCouponUpdate")), schema: envelope({ message: string(), coupon: ref("PublicCoupon") }) }),
        delete: operation("Quản trị · Ưu đãi", "Xóa mã giảm giá", { ...secured, description: "Yêu cầu role ADMIN. Xóa bản ghi mã giảm giá; có thể dùng cập nhật status=INACTIVE nếu chỉ muốn ngừng áp dụng.", parameters: [pathId()] })
    },
    "/points/wallet": { get: operation("Điểm thưởng", "Xem ví điểm và lịch sử giao dịch", {
        ...secured, parameters: [query("limit", integer({ default: 20 }), "Số giao dịch gần nhất cần lấy.")],
        description: "Trả wallet, pointToVnd và transactions. Có thể tạo ví số dư 0 khi tài khoản chưa có ví. API đặt sân hiện không cho sử dụng điểm.",
        ok: "Thông tin ví, tỷ lệ đổi điểm sang VND theo cấu hình và danh sách giao dịch."
    }) },
    "/notifications": { get: operation("Thông báo", "Danh sách thông báo cá nhân", {
        ...secured, parameters: [query("limit", integer({ minimum: 1, maximum: 100, default: 20 })), query("isRead", bool, "Lọc thông báo đã đọc hoặc chưa đọc.")],
        schema: envelope({ notifications: array(ref("PublicNotification")), unreadCount: integer() }), errors: limited
    }) },
    "/notifications/stream": { get: {
        tags: ["Thông báo"], summary: "Nhận thông báo trực tiếp qua SSE", security: [],
        description: "Kết nối EventSource dùng access token qua query token (không dùng header Authorize). Server gửi event ready rồi các event notification; kết nối đóng khi token hết hạn. Luồng là kết nối dài; Swagger có thể tiếp tục chờ, nên dùng EventSource trong ứng dụng để theo dõi. Không chia sẻ URL có token.",
        parameters: [query("token", string(), "Access token của tài khoản.", true)],
        responses: { 200: { description: "Luồng sự kiện ready/notification và heartbeat.", content: { "text/event-stream": { schema: string(), example: "event: ready\ndata: {\"ok\":true}\n\n" } } }, ...authErrors }
    } },
    "/notifications/read-all": { put: operation("Thông báo", "Đánh dấu tất cả thông báo đã đọc", { ...secured, errors: limited }) },
    "/notifications/{id}/read": { put: operation("Thông báo", "Đánh dấu một thông báo đã đọc", {
        ...secured, parameters: [pathId()], schema: envelope({ notification: ref("PublicNotification") }), errors: { ...limited, 404: error("Không tìm thấy thông báo thuộc tài khoản.") }
    }) },
    "/notifications/{id}": { delete: operation("Thông báo", "Xóa một thông báo của tôi", {
        ...secured, parameters: [pathId()], errors: { ...limited, 404: error("Không tìm thấy thông báo thuộc tài khoản.") }
    }) }
};
