import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
