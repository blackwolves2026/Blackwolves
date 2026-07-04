import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "BLACKWOLVES",
  description:
    "BLACKWOLVES — Professional trading education with instructor Ziad Ahmed. Structured course levels, high-quality videos, and progress tracking.",
  generator: "v0.app",
  openGraph: {
    title: "BLACKWOLVES",
    description: "Professional trading education with Ziad Ahmed",
    type: "website",
    locale: "en_US",
  },
  icons: {
    icon: [{ url: "/wolf-logo.png", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
          <a
            href="https://wa.me/201155818964"
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/25 transition hover:bg-emerald-600"
            aria-label="WhatsApp support"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.52 3.48A11.87 11.87 0 0012 0C5.37 0 0 5.37 0 12c0 2.1.55 4.14 1.6 5.92L0 24l6.3-1.64A11.92 11.92 0 0012 24c6.63 0 12-5.37 12-12 0-3.2-1.23-6.2-3.48-8.52zm-8.51 17.78c-1.7 0-3.36-.45-4.82-1.28l-.35-.21-3.74.98.99-3.65-.23-.37A9.83 9.83 0 012.16 12c0-5.4 4.38-9.78 9.78-9.78 2.61 0 5.06 1.02 6.91 2.86 1.84 1.83 2.86 4.28 2.86 6.9 0 5.4-4.38 9.78-9.78 9.78zm5.32-7.59c-.29-.15-1.7-.83-1.96-.92-.26-.09-.45-.14-.64.14-.19.29-.74.92-.91 1.11-.17.19-.33.21-.62.07-.29-.15-1.23-.45-2.34-1.45-.87-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.48.09-.19.05-.36-.02-.5-.07-.15-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49-.17-.01-.36-.01-.55-.01s-.5.07-.76.36c-.26.29-1 1-1 2.45s1.02 2.84 1.16 3.04c.14.19 1.96 3 4.75 4.2.66.28 1.18.45 1.58.58.66.21 1.26.18 1.74.11.53-.08 1.7-.7 1.94-1.37.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34z" />
            </svg>
          </a>
        </ThemeProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
