import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GFLB Tag Studio",
  description: "Internal tagging interface for Global Fashion Lookbook",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0e0e0e" }}>{children}</body>
    </html>
  );
}
