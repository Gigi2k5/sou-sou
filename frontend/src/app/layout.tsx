import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";

import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
const SITE_TITLE = "Sou'Sou — Épargne maline, vie sereine";
const SITE_DESCRIPTION =
  "Tracker tes revenus et dépenses, atteindre tes objectifs d'épargne quotidiens et gagner des points en t'amusant.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Sou'Sou",
  authors: [{ name: "Sou'Sou" }],
  keywords: [
    "épargne",
    "budget",
    "tracker financier",
    "Afrique francophone",
    "FCFA",
    "gamification",
  ],
  icons: { icon: "/mascot.png" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "fr_FR",
    siteName: "Sou'Sou",
    images: [{ url: "/mascot.png", width: 512, height: 512, alt: "Sou'Sou" }],
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/mascot.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        newsreader.variable,
        jakarta.variable,
      )}
    >
      <body className="bg-background text-foreground min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
