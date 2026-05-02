"use client";

import Image from "next/image";
import { Question } from "@/lib/types";

type QuestionCardProps = {
  question: Question;
  children?: React.ReactNode;
  /** Hide the illustration above the body until the parent shows it after reveal (spoiler-safe). */
  deferImage?: boolean;
};

export default function QuestionCard({ question, children, deferImage }: QuestionCardProps) {
  return (
    <div className="w-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 sm:p-7">
      <p className="mb-5 text-lg font-semibold leading-relaxed text-slate-900 dark:text-slate-100 sm:text-xl">
        {question.question}
      </p>

      {question.image && !deferImage ? (
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
          <Image
            src={question.image}
            alt="Question illustration"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 800px"
          />
        </div>
      ) : null}

      {children}
    </div>
  );
}
