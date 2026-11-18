import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Event Management System",
  description:
    "Publish campus events, register online, check in with QR tickets and report on attendance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
