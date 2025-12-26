import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { RecordingProvider } from "@/lib/recording-store";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Zoom - World Model Recording Explorer",
  description: "Debug and explore World Model recordings with visual timeline inspection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <RecordingProvider>{children}</RecordingProvider>
      </body>
    </html>
  );
}
