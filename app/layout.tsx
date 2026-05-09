import type { Metadata } from "next";
import type { Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { AppPreferences } from "@/components/app-preferences";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Today.",
  description: "A minimal health tracking PWA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Today.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body>
        <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background px-5 pb-safe-bottom text-foreground">
          <AppPreferences>{children}</AppPreferences>
        </main>
      </body>
    </html>
  );
}
