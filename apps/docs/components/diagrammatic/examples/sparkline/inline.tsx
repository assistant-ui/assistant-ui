import { Sparkline } from "diagrammatic";

export default function InlineSparkline() {
  return (
    <p className="text-base leading-relaxed">
      Signups climbed all week{" "}
      <Sparkline
        data={[12, 14, 13, 17, 21, 19, 24, 28, 27, 33]}
        title="Signups over ten days"
      />{" "}
      and closed at 33, while churn held flat{" "}
      <Sparkline
        data={[4, 5, 4, 4, 5, 4, 4, 5, 4, 4]}
        title="Churn over ten days"
      />
      .
    </p>
  );
}
