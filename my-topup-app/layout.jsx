import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";

export const metadata = {
  title: "Vercel Topup BD",
  description: "Best Game Topup Shop in Bangladesh",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  themeColor: "#7B61FF",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <head>
        {/* Font Awesome CDN Link */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
        />
      </head>
      <body>
        {/* Auth Context Provider দিয়ে পুরো অ্যাপ র‍্যাপ করা হলো */}
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
      </body>
    </html>
  );
}