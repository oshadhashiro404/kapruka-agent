import type { Metadata } from "next";
import { Inter, Noto_Sans_Sinhala } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSinhala = Noto_Sans_Sinhala({
  variable: "--font-noto-sinhala",
  subsets: ["sinhala", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kapruka — Chat Shopping",
  description:
    "Shop Kapruka through a beautiful full-screen chat — search gifts, cakes, flowers, electronics, check delivery, and checkout across Sri Lanka.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${notoSinhala.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-bg text-foreground">
        {children}
      </body>
    </html>
  );
}
