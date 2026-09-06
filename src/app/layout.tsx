import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari, Noto_Sans_Tamil, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/skillpulse/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});

const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SkillPulse Grid — Labour-Market-to-Curriculum Intelligence",
  description:
    "SkillPulse Grid continuously converts labour-market signals into curriculum intelligence. Every recommendation traces back to the evidence that produced it.",
  keywords: [
    "SkillPulse Grid",
    "SIH26134",
    "Smart India Hackathon 2026",
    "curriculum intelligence",
    "labour market signals",
    "ESCO",
    "skills demand",
  ],
  authors: [{ name: "SkillPulse Grid Project Team" }],
  openGraph: {
    title: "SkillPulse Grid",
    description:
      "Turning labour-market signals into curriculum action, with every recommendation linked back to the evidence that produced it.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon-logo.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon-logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon-logo.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoDevanagari.variable} ${notoTamil.variable} ${notoBengali.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <I18nProvider>
            {children}
            <Toaster />
            <SonnerToaster richColors position="bottom-right" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
