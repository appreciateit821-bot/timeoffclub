import type { Metadata } from "next";
import "./globals.css";
import Agentation from '@/components/Agentation';

export const metadata: Metadata = {
  title: "타임오프클럽 예약",
  description: "타임오프클럽 예약 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#FFF8F0" />
        <meta name="color-scheme" content="light" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased min-h-screen bg-[#FFF8F0] text-gray-800">
        {children}
        <Agentation />
      </body>
    </html>
  );
}
