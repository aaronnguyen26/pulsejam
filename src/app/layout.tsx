import type { Metadata } from "next";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseJam AI — Studio Workspace",
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
      className="h-full antialiased dark"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;700&family=Hanken+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Icons&family=Material+Icons+Outlined&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#131313] text-[#e5e2e1] selection:bg-[#d4af37] selection:text-[#3c2f00]">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
