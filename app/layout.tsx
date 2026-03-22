import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const metadata: Metadata = {
  title: "LOOK47 — Tag Studio",
  description: "Internal tagging interface for Look 47",
};

function Nav() {
  const pathname = usePathname();
  
  const linkStyle = (path: string) => ({
    color: pathname === path ? "#ececec" : "#8e8ea0",
    textDecoration: "none",
    fontSize: 14,
    padding: "0 16px",
    height: 44,
    display: "flex" as const,
    alignItems: "center" as const,
    borderBottom: pathname === path ? "2px solid #ececec" : "2px solid transparent",
    fontWeight: pathname === path ? 600 : 400,
    fontFamily: "Inter, sans-serif",
    transition: "all 0.15s",
  });

  return (
    <nav style={{
      display: "flex", alignItems: "center", gap: 0,
      padding: "0 24px", height: 44,
      borderBottom: "1px solid #2f2f2f",
      background: "#212121",
      fontFamily: "Inter, sans-serif",
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#ececec", marginRight: 24, letterSpacing: "0.05em" }}>
        LOOK47
      </span>
      <Link href="/" style={linkStyle("/")}>Tag Studio</Link>
      <Link href="/intake" style={linkStyle("/intake")}>Intake</Link>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#212121" }}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
