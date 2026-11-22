import { publicPaths, publicSchemas, publicTags } from "./public.paths.js";
import { managementPaths, managementSchemas, managementTags } from "./management.paths.js";

// Contracts are explicit and tested against the mounted Express routes. They do
// not import controllers or connect to MongoDB/Redis when building documentation.
const paths = {};
for (const source of [publicPaths, managementPaths]) {
    for (const [path, methods] of Object.entries(source)) {
        paths[path] ??= {};
        for (const [method, operation] of Object.entries(methods)) {
            if (paths[path][method]) throw new Error(`Duplicate API documentation: ${method} ${path}`);
            paths[path][method] = {
                operationId: `${method}_${path.replace(/[{}]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
                ...operation,
            };
        }
    }
}
const playerTags = publicTags.filter(tag => !tag.name.startsWith("Quản trị"));
const adminTags = [...managementTags.filter(tag => tag.name.startsWith("Quản trị")), ...publicTags.filter(tag => tag.name.startsWith("Quản trị"))];
const vendorTags = managementTags.filter(tag => !tag.name.startsWith("Quản trị"));
const tags = [...playerTags, ...adminTags, ...vendorTags];
const operationCount = Object.values(paths).reduce((count, methods) => count + Object.keys(methods).length, 0);

export const openapiSpec = {
    openapi: "3.0.3",
    info: {
        title: "PickleballPro API",
        version: "1.0.0",
        description: `**${operationCount} thao tác · ${tags.length} nhóm chức năng** — Tìm sân, đặt lịch và quản lý hoạt động sân.\n\n`
            + "Mở một nhóm để xem API. Với API có biểu tượng khóa, gọi **POST /auth/login**, sao chép **accessToken** rồi dán vào **Authorize** (không thêm chữ Bearer).\n\n"
            + "[Tải OpenAPI JSON](/api-docs/openapi.json) · Ngày giờ: **Việt Nam (UTC+07:00)** · Giá tiền: **VND**\n\n"
            + "<details><summary>Luồng đặt sân và các tính năng đang phát triển</summary>\n\n"
            + "**Đặt sân:** lấy ô giờ tại `GET /courts/{id}?date=YYYY-MM-DD` → gửi `POST /bookings` → ADMIN xác nhận tại `PUT /admin/bookings/{id}/confirm` → ghi nhận thu tiền tại sân → hoàn tất sau giờ chơi. Ô giờ đã được giữ sẽ từ chối lượt đặt trùng với mã **409**.\n\n"
            + "**Tạm ngừng (HTTP 501):** giao hàng, bảo trì, dụng cụ/nhập hàng và thanh toán trực tuyến. Các luồng này không được liệt kê như API đang hoạt động. Dùng điểm để thanh toán cũng chưa được hỗ trợ.\n\n</details>",
    },
    // Relative to the API host, so both the public domain and localhost work.
    servers: [{ url: "/api", description: "Backend API trên tên miền đang mở" }],
    tags,
    security: [],
    paths,
    components: {
        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Dán accessToken nhận từ đăng nhập; Swagger tự thêm tiền tố Bearer. Quyền truy cập phụ thuộc tài khoản USER, ADMIN hoặc VENDOR.",
            },
        },
        schemas: {
            ObjectId: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439011" },
            Success: { type: "object", properties: { success: { type: "boolean", example: true }, message: { type: "string" } }, additionalProperties: true },
            Error: {
                type: "object",
                properties: { success: { type: "boolean", example: false }, message: { type: "string" }, code: { type: "string" }, errors: { type: "array", items: { type: "object", additionalProperties: true } } },
                additionalProperties: true,
            },
            ...publicSchemas,
            ...managementSchemas,
        },
    },
};
