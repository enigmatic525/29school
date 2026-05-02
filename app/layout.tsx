import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "29.school — Tools for the Eastside Prep Class of 2029",
    template: "%s · 29.school",
  },
  description:
    "Workload calendar, anonymous feedback, and shared study guides for the Eastside Prep Class of 2029.",
  applicationName: "29.school",
  authors: [{ name: "Class of 2029" }],
  keywords: [
    "Eastside Prep",
    "Class of 2029",
    "workload calendar",
    "Canvas",
    "study guides",
  ],
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    siteName: "29.school",
    title: "29.school — Tools for the Eastside Prep Class of 2029",
    description:
      "Workload calendar, anonymous feedback, and shared study guides for the Eastside Prep Class of 2029.",
  },
  twitter: {
    card: "summary",
    title: "29.school",
    description:
      "Workload calendar, anonymous feedback, and shared study guides for the Eastside Prep Class of 2029.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-gray-900 focus:text-white focus:px-3 focus:py-2 focus:text-xs focus:rounded"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
