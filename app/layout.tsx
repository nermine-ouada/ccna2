import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "CCNA Practice",
  description: "Flashcards and quiz practice from parsed CCNA questions"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ThemeToggle />
          <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-8 pt-14 sm:px-6 sm:pt-16">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
