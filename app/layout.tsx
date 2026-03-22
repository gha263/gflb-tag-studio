import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GFLB Tag Studio",
  description: "Internal tagging interface for Global Fashion Lookbook",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0e0e0e" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: 24, padding: "12px 24px", borderBottom: "1px solid #222", background: "#0e0e0e" }}>
          <Link href="/" style={{ color: "#ececec", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Tag Studio</Link>
          <Link href="/intake" style={{ color: "#8e8ea0", textDecoration: "none", fontSize: 14 }}>Intake</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
