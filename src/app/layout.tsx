import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aarisha - Admin Panel",
  description: "Administrative product management portal for Aarisha jewelry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
