import { RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { router } from "./routes";

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
      // 🎯 3. Bọc toàn bộ RouterProvider lại bên trong GoogleOAuthProvider
      <GoogleOAuthProvider clientId={googleClientId}>
        <RouterProvider router={router} />
      </GoogleOAuthProvider>
  );
}