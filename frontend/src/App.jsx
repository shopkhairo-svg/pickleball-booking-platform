import { RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { router } from "./routes";
import { googleClientId, isGoogleConfigured } from "./config/googleAuth";

export default function App() {
  if (!isGoogleConfigured) return <RouterProvider router={router} />;

  return (
      // 🎯 3. Bọc toàn bộ RouterProvider lại bên trong GoogleOAuthProvider
      <GoogleOAuthProvider clientId={googleClientId}>
        <RouterProvider router={router} />
      </GoogleOAuthProvider>
  );
}
