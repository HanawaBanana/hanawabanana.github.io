import clsx from "clsx";

type ScoreDialProps = {
  score: number;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "h-16 w-16 text-xl",
  md: "h-24 w-24 text-3xl",
  lg: "h-32 w-32 text-5xl"
};

export function ScoreDial({ score, size = "md" }: ScoreDialProps) {
  const degree = Math.round((score / 100) * 360);

  return (
    <div
      className={clsx(
        "grid shrink-0 place-items-center rounded-full border border-ink/10 font-display font-black text-coal shadow-insetLine",
        sizeClass[size]
      )}
      style={{
        background: `conic-gradient(#bc442d ${degree}deg, rgba(32,35,30,.09) 0deg), radial-gradient(circle, #fbf7ec 58%, transparent 60%)`
      }}
      aria-label={`综合评分 ${score}`}
    >
      {score.toFixed(1)}
    </div>
  );
}
