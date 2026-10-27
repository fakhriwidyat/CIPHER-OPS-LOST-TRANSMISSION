import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIPHER OPS — Lost Transmission",
  description: "Pulihkan Novaris bersama 2–4 teman. Petualangan pixel-art dengan teka-teki fungsi matematika.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
