export default function Text({
  text = "The quick brown fox jumps over the lazy dog",
}: {
  text?: string;
}) {
  return <span data-probe="text">{text}</span>;
}
