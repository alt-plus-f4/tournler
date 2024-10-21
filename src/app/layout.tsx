import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";

const uncage = localFont({
  src: "/fonts/Raleway-Regular.ttf",
  variable: "--font-main-font",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Tournler",
  description: " Website for gaming tournament organizing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${uncage.variable} antialiased dark text-foreground bg-background`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
