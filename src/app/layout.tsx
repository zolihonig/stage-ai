import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import VersionBadge from "@/components/VersionBadge";
import ToastContainer from "@/components/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/server";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StageAI — AI Virtual Staging for Real Estate",
  description:
    "Stage entire listings in minutes with AI. Photorealistic virtual staging that preserves every architectural detail. 13 designer styles, MLS-compliant exports.",
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "StageAI — AI Virtual Staging for Real Estate",
    description: "Stage entire listings in minutes. Upload photos, pick a style, get photorealistic staged images instantly.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StageAI — AI Virtual Staging",
    description: "Stage entire listings in minutes with AI.",
    images: ["/og-image.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get initial user server-side for AuthProvider
  let initialUser = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    initialUser = user;
  } catch {
    // No auth on first load is fine
  }

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider initialUser={initialUser}>
          {children}
        </AuthProvider>
        <ToastContainer />
        <VersionBadge />
      </body>
    </html>
  );
}
