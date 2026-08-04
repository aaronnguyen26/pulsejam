import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, EB_Garamond, Hanken_Grotesk } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PulseJam AI — Refined Brand & Studio Workspace",
  description:
    "PulseJam AI listens to your instrument and reactively crossfades between Chill, Groove, and Peak backing stems in real time — zero latency, all client-side.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${ebGaramond.variable} ${hankenGrotesk.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#131313] text-[#e5e2e1] selection:bg-[#d4af37] selection:text-[#3c2f00]">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
