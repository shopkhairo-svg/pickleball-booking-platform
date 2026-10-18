import Redis from "ioredis";

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("connect", () => {
    console.log("Đã kết nối thành công tới Redis");
});

redisClient.on("error", (err) => {
    console.error("Lỗi kết nối Redis:", err);
});

export default redisClient;