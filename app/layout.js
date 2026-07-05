import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "THE VOID V2",
  description: "Encrypted cyber communication platform — premium, privacy-first",
  manifest: "/manifest.json",
  themeColor: "#000000",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // lets iOS keyboard resize content instead of overlay
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        style={{ background: "#000", color: "#fff", margin: 0 }}
        suppressHydrationWarning={false}
      >
        {children}
      </body>
    </html>
  );
}
