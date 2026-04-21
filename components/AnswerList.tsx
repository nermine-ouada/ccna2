type AnswerListProps = {
  options: string[];
  correctAnswers: string[];
  selected?: string[];
  revealed?: boolean;
};

export default function AnswerList({
  options,
  correctAnswers,
  selected = [],
  revealed = false
}: AnswerListProps) {
  return (
    <ul className="space-y-3">
      {options.map((option) => {
        const isCorrect = correctAnswers.includes(option);
        const isSelected = selected.includes(option);

        let style =
          "border-slate-200 bg-white text-slate-800";

        if (revealed && isCorrect) {
          style = "border-emerald-300 bg-emerald-50 text-emerald-900";
        } else if (revealed && isSelected && !isCorrect) {
          style = "border-rose-300 bg-rose-50 text-rose-900";
        } else if (!revealed && isSelected) {
          style = "border-blue-300 bg-blue-50 text-blue-900";
        }

        return (
          <li key={option} className={`rounded-xl border p-3 ${style}`}>
            {option}
          </li>
        );
      })}
    </ul>
  );
}
