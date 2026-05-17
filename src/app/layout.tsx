import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clipper FYP Dashboard",
  description: "Optimasi Video Klip Anda untuk Masuk FYP dalam Sekali Klik!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
