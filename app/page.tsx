import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">CCNA Practice</h1>
      <p className="text-slate-600">Train with flashcards or take a full quiz.</p>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <Link
          href="/flashcards"
          className="w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          Flashcards Mode
        </Link>
        <Link
          href="/quiz"
          className="w-full rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
        >
          Quiz Mode
        </Link>
      </div>
    </div>
  );
}
