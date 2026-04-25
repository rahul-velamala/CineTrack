import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { ToastProvider } from "@/components/Toast";
import GuestSavePrompt from "@/components/GuestSavePrompt";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cinetrack.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CineTrack — Track movies & TV with friends",
  description: "Free, premium movie & TV tracker. Build your watchlist, watch trailers, send recs to friends. Bollywood, Hollywood & more.",
  openGraph: {
    title: "CineTrack — Track movies & TV with friends",
    description: "Free, premium movie & TV tracker. Build your watchlist, watch trailers, send recs to friends.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CineTrack — Track movies & TV with friends",
    description: "Free, premium movie & TV tracker.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <AppProvider>
          <ToastProvider>
            {children}
            <GuestSavePrompt />
          </ToastProvider>
        </AppProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
