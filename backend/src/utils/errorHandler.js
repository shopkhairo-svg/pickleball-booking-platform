export function handleError(res, error) {
    console.error("API Error Stack Trace:\n", error.stack || error);

    let statusCode = 400;
    let message = error.message;

    // Handle Mongoose duplicate key error (code 11000)
    if (error.code === 11000) {
        statusCode = 400;
        message = "Dữ liệu bị trùng lặp (tên cụm sân hoặc tên sân nhỏ đã tồn tại trong cụm). Vui lòng chọn tên khác!";
    } 
    // Handle Mongoose Validation Error
    else if (error.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(error.errors).map(val => val.message).join(", ");
    } 
    // Handle CastError (invalid ObjectId format)
    else if (error.name === "CastError") {
        statusCode = 400;
        message = "Định dạng mã ID không hợp lệ!";
    } 
    // Fallback for system / internal server errors
    else if (!error.message || error.status === 500) {
        statusCode = 500;
        message = "Đã xảy ra lỗi hệ thống nghiêm trọng. Vui lòng liên hệ Admin để được hỗ trợ!";
    }

    return res.status(statusCode).json({
        success: false,
        message
    });
}
