import type { Metadata } from "next";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/content";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
});

const mono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: `${site.name} — ${site.role} · a scroll-driven journey`,
  description:
    "Walk through Yuvraj Mishra's journey: self-taught in Kolkata, first ships at 18, remote leap, CTO at Foontro, and the stack behind it all. A scroll-driven 3D portfolio.",
  openGraph: {
    title: `${site.name} — ${site.role}`,
    description:
      "A scroll-driven 3D journey: Kolkata origins, first ships, remote leap, CTO at Foontro.",
    type: "website",
    url: site.url,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
