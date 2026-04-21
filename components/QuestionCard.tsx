"use client";

import Image from "next/image";
import { Question } from "@/lib/types";

type QuestionCardProps = {
  question: Question;
  children?: React.ReactNode;
};

export default function QuestionCard({ question, children }: QuestionCardProps) {
  return (
    <div className="w-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
      <p className="mb-5 text-lg font-semibold leading-relaxed sm:text-xl">
        {question.question}
      </p>

      {question.image ? (
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl bg-slate-100">
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
