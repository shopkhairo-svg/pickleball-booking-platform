import { useAuthStore } from "../store/authStore";
import UnderDevelopment from "./UnderDevelopment";

export default function CourtVendorFeature({ children }) {
    const user = useAuthStore(state => state.user);
    return user?.vendorType === "EQUIPMENT" ? <UnderDevelopment /> : children;
}
