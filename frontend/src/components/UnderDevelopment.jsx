import { Link } from "react-router-dom";

export default function UnderDevelopment() {
    return <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">Tính năng đang phát triển</h1>
        <p className="mt-4 text-gray-600">Chúng tôi đang dần hoàn thiện chức năng này. Bạn vẫn có thể tìm sân, đặt lịch, quản lý lịch chơi và gửi đánh giá.</p>
        <Link to="/courts" className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 text-white">Tìm sân</Link>
    </section>;
}
