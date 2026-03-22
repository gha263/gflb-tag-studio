import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Look 47 — Tag Studio",
  description: "Internal tagging interface for Look 47",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#212121" }}>
        <nav style={{
          display: "flex", alignItems: "center", gap: 0,
          padding: "0 24px", height: 44,
          borderBottom: "1px solid #2f2f2f",
          background: "#212121",
          fontFamily: "Inter, sans-serif",
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ececec", marginRight: 24 }}>
            Look 47
          </span>
          <Link href="/" style={{
            color: "#8e8ea0", textDecoration: "none", fontSize: 14,
            padding: "0 16px", height: 44, display: "flex", alignItems: "center",
            borderBottom: "2px solid transparent",
          }}>
            Tag Studio
          </Link>
          <Link href="/intake" style={{
            color: "#8e8ea0", textDecoration: "none", fontSize: 14,
            padding: "0 16px", height: 44, display: "flex", alignItems: "center",
            borderBottom: "2px solid transparent",
          }}>
            Intake
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
