import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Geist_Mono, M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import AuthCookieSync from "@/components/AuthCookieSync";
import LumaBarClient from "@/components/LumaBarClient";
import OnboardingModal from "@/components/OnboardingModal";
import ProfileCelebration from "@/components/ProfileCelebration";

// Use Noto Sans JP as primary rounded-friendly Japanese font
const notoSans = Noto_Sans_JP({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "700"],
});

// Provide an optional rounded accent font for headings if desired
const mPlusRounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded-jp",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "enman",
    template: "%s | enman",
  },
  description: "Harmony & Finances for modern households.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png", sizes: "1024x1024" },
      { url: "/icon.png" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png", sizes: "1024x1024" },
    ],
    shortcut: [
      { url: "/logo.png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "enman",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdeff4" },
    { media: "(prefers-color-scheme: dark)", color: "#181a1f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${notoSans.variable} ${mPlusRounded.variable} ${geistMono.variable} antialiased pb-[calc(env(safe-area-inset-bottom)+96px)]`}
      >
        <ToastProvider>
          {/* Sync Supabase access token into a cookie for API auth */}
          <AuthCookieSync />
          {/* Show onboarding only for first login (no household membership) */}
          <OnboardingModal />
          <ProfileCelebration />
          {children}
          {/* Global bottom navigation */}
          <LumaBarClient />
        </ToastProvider>
      </body>
    </html>
  );
}
