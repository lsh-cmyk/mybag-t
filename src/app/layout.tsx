import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "my Bag — 오늘 챙길 것들",
  description: "아침 외출 전 체크리스트 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} antialiased bg-stone-50`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
