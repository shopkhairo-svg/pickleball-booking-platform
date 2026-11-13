export const isPlaceholder = (value) => !value || /^(your_|placeholder|change_me)/i.test(value.trim());

export function getGoogleClientId(env = process.env) {
    const clientId = env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId || !/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
        throw Object.assign(new Error("Đăng nhập Google chưa được cấu hình trên máy chủ."), { status: 503 });
    }
    return clientId;
}

export function getSmtpOptions(env = process.env) {
    if ([env.MAIL_HOST, env.MAIL_USER, env.MAIL_PASSWORD].some(isPlaceholder)) {
        throw Object.assign(new Error("Dịch vụ email chưa được cấu hình. Vui lòng liên hệ quản trị viên."), { status: 503 });
    }
    const port = Number(env.MAIL_PORT || 465);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw Object.assign(new Error("Cổng SMTP không hợp lệ."), { status: 503 });
    }
    return {
        host: env.MAIL_HOST.trim(), port,
        secure: env.MAIL_SECURE ? env.MAIL_SECURE === "true" : port === 465,
        auth: { user: env.MAIL_USER.trim(), pass: env.MAIL_PASSWORD },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000
    };
}
