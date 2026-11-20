// Names and addresses checked against the supplied map and the sources below.
// Prices, operating hours and two lanes per new venue are application settings,
// not a live inventory or a quotation from these businesses. No external reviews
// or photos are imported. Keep source metadata here for later verification.
const dongHoa = "Đông Hòa, Dĩ An, Bình Dương (địa chỉ cũ), Hồ Chí Minh";

export const MAP_COURTS = [
    {
        key: "tan-nguyen-academy-2", name: "Sân cầu lông Tấn Nguyễn 2",
        aliases: ["Tấn Nguyễn Academy 2", "Sân cầu lông Tấn Nguyên 2"],
        address: "66/18 đường Nguyễn Bính, Đông Hòa, TP.HCM", location: dongHoa,
        latitude: 10.90399, longitude: 106.7793, pricePerHour: 70000,
        description: "Sân cầu lông Tấn Nguyễn Academy 2 trên đường Nguyễn Bính, khu vực Đông Hòa.",
        sources: ["https://localleads.io.vn/danh-sach/sports-complex/ho-chi-minh/dong-hoa"]
    },
    {
        key: "cau-long-dong-hoa", name: "Sân cầu lông Đông Hòa",
        address: "93 Nguyễn Công Hoan, Đông Hòa, TP.HCM", location: dongHoa,
        latitude: 10.9024857, longitude: 106.7833409, pricePerHour: 60000,
        description: "Địa điểm chơi cầu lông trên đường Nguyễn Công Hoan, Đông Hòa.",
        sources: ["https://thegioithethao.vn/san-cau-long-dong-hoa-f-go40h", "https://maps.app.goo.gl/dxqv8CTAKDBDwtjaA"]
    },
    {
        key: "th-badminton", name: "TH Badminton - Sân cầu lông Dĩ An",
        aliases: ["TH Badminton", "TH Badminton - Sân Cầu Lông Dĩ An, Bình Dương"],
        address: "166 Võ Thị Sáu, khu phố Tây A, Đông Hòa, TP.HCM", location: dongHoa,
        latitude: 10.8966521, longitude: 106.7752661, pricePerHour: 80000,
        description: "TH Badminton tại 166 Võ Thị Sáu, khu phố Tây A. Bộ môn: cầu lông.",
        sources: ["https://thbadminton.com/san-cau-long-vo-thi-sau", "https://maps.app.goo.gl/gBE6qGYdL4DUSt6D6"]
    },
    {
        key: "tomcourts", name: "TomCourts - Cầu lông & Pickleball",
        aliases: ["Sân Cầu LôngPickleball TomCourts", "Sân Cầu Lông & Pickleball TomCourts"],
        address: "156/41/18 Võ Thị Sáu, khu phố Đông A, Đông Hòa, TP.HCM", location: dongHoa,
        pricePerHour: 120000,
        description: "TomCourts là địa điểm cầu lông và pickleball trong khu vực đường Võ Thị Sáu, Đông Hòa.",
        sources: ["https://localleads.io.vn/danh-sach/sports-complex/ho-chi-minh/dong-hoa"]
    },
    {
        key: "hl-sport", name: "Sân cầu lông HL SPORT",
        aliases: ["Cầu Lông HL SPORT", "Sân cầu lông Hoàng Long"],
        address: "Hẻm 23/1 Trần Hưng Đạo, Đông Hòa, TP.HCM", location: dongHoa,
        latitude: 10.894736, longitude: 106.7822508, pricePerHour: 60000,
        description: "Sân cầu lông HL SPORT (Hoàng Long) nằm trong hẻm 23/1 Trần Hưng Đạo, Đông Hòa.",
        sources: ["https://racketgo.com/vi/court-cau-long-hl-sport-12109", "https://maps.app.goo.gl/N8pLp92eRkFHyp9k6"]
    },
    {
        key: "bao-an-ql1k", name: "Sân cầu lông Bảo An - Quốc lộ 1K",
        aliases: ["Sân Cầu Lông Bảo An"],
        address: "460/1 Quốc lộ 1K, Đông Hòa, TP.HCM (Bình An, Dĩ An cũ)", location: dongHoa,
        latitude: 10.8971315, longitude: 106.7923082, pricePerHour: 70000,
        description: "Sân cầu lông Bảo An trên Quốc lộ 1K, khu vực Bình An, Dĩ An cũ.",
        sources: ["https://choicau.vn/san-cau-long-bao-an-quoc-lo-1k-dong-hoa-phuong-dong-hoa-dinh-ky-3", "https://maps.app.goo.gl/czAbqwkYkTnN779D8"]
    },
    {
        key: "ttp-sports", name: "TTP Sports - Tennis, Cầu lông, Bóng đá",
        aliases: ["TTP Sports (Tennis, Cầu lông, Bóng đá)"],
        address: "11/8 Quốc lộ 1K, khu phố Tây B, Đông Hòa, TP.HCM", location: dongHoa,
        pricePerHour: 100000, status: "HIDDEN",
        description: "TTP Sports tại khu phố Tây B, Quốc lộ 1K. Địa điểm thể thao được đánh dấu trên bản đồ khu vực Đông Hòa.",
        sources: ["https://ttpsport.vn/lien-he/"]
    },
    {
        key: "ao-an-my-phuoc-tan-van", name: "Sân cầu lông Ao An",
        address: "1015 Mỹ Phước - Tân Vạn, Đông Hòa, TP.HCM (Bình An, Dĩ An cũ)", location: dongHoa,
        latitude: 10.904074, longitude: 106.8098411, pricePerHour: 80000,
        description: "Sân cầu lông Ao An tại 1015 đường Mỹ Phước - Tân Vạn, khu vực Bình An, Dĩ An cũ.",
        sources: ["https://sancaulongaoan.com/", "https://maps.app.goo.gl/io6xZ5jZPbPeKs5Y9"]
    },
    {
        key: "dong-giao-linh-xuan", name: "CLB cầu lông Đồng Giao",
        aliases: ["Badminton Club Dong Giao", "Sân cầu lông Đồng Giao"],
        address: "25 Đường số 11, khu phố 4, Linh Xuân, TP.HCM", location: "Linh Xuân, Thủ Đức, Hồ Chí Minh",
        latitude: 10.8820863, longitude: 106.7668081, pricePerHour: 90000,
        description: "CLB cầu lông Đồng Giao trên Đường số 11, khu vực Linh Xuân.",
        sources: ["https://thegioisport.vn/danh-sach-10-san-cau-long-quan-thu-duc", "https://goo.gl/maps/KixRyAVWcLdawR1fA"]
    },
    {
        key: "binh-thang-badminton", name: "Sân cầu lông Bình Thắng - Badminton Club",
        aliases: ["Sân cầu lông Bình Thắng_Badminton club", "Sân cầu lông Bình Thắng Badminton club"],
        address: "304 ĐT743A, Đông Hòa, TP.HCM", location: dongHoa,
        pricePerHour: 90000,
        description: "Sân cầu lông Bình Thắng tại 304 ĐT743A, Đông Hòa.",
        sources: ["https://localleads.io.vn/danh-sach/sports-complex/ho-chi-minh/dong-hoa"]
    }
].map(entry => ({
    type: "INDOOR", openTime: "06:00", closeTime: "22:00", slotDuration: 60,
    status: "AVAILABLE", amenities: [], images: [], ...entry
}));
