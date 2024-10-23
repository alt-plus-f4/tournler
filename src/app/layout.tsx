import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster"

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
  authModal,
}: Readonly<{
  children: React.ReactNode,
  authModal: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${uncage.variable} antialiased dark text-foreground bg-background min-h-screen flex flex-col`}>
        <Navbar />

        {authModal}

        {children}

        <Toaster />

        <div className='text-foreground p-5 text-center text-sm w-full mt-auto bottom-0 border-t'>Shits hard</div>

      </body>
    </html>
  );
}
