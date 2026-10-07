import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, Instrument_Serif } from "next/font/google";
import { ProfileProvider } from "@/components/ProfileProvider";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "PerfectMatch — your skin, decoded", template: "%s · PerfectMatch" },
  description:
    "Foundation shade matching, makeup and skincare suggestions, and an ingredient watch-list that learns what works for your skin.",
};

export const viewport: Viewport = { themeColor: "#faf8f5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ProfileProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="mx-auto w-full max-w-5xl px-5 py-10 text-xs leading-relaxed text-faint">
            PerfectMatch gives cosmetic suggestions, not medical advice. For persistent skin problems, see a
            dermatologist. Skincare guidance is graded against published research —{" "}
            <Link href="/science" className="underline underline-offset-2">
              how we use science
            </Link>
            . Shade data: The Pudding (MIT). Ingredient data: Open Beauty Facts (ODbL).
          </footer>
        </ProfileProvider>
      </body>
    </html>
  );
}
