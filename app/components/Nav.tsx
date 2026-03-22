"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  const link = (path: string, label: string) => (
    <Link href={path} style={{
      color: pathname === path ? "#ececec" : "#8e8ea0",
      textDecoration: "none",
      fontSize: 14,
      fontWeight: pathname === path ? 600 : 400,
      padding: "0 16px",
      height: 44,
      display: "flex",
      alignItems: "center",
      borderBottom: pathname === path ? "2px solid #ececec" : "2px solid transparent",
      fontFamily: "Inter, sans-serif",
      transition: "all 0.15s",
    }}>
      {label}
    </Link>
  );

  return (
    <nav style={{
      display: "flex", alignItems: "center",
      padding: "0 24px", height: 44,
      borderBottom: "1px solid #2f2f2f",
      background: "#212121",
      fontFamily: "Inter, sans-serif",
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#ececec", marginRight: 24, letterSpacing: "0.05em" }}>
        LOOK47
      </span>
      {link("/", "Tag Studio")}
      {link("/intake", "Intake")}
    </nav>
  );
}
