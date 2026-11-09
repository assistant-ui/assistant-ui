type Props = {
  value?: number;
  onRate: (n: number) => Promise<void>;
};

export default function Rating({ value = 0, onRate }: Props) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onRate(n)}>
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
