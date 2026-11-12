export default function Throws({
  message = "Boom",
}: {
  message?: string;
}): never {
  throw new Error(message);
}
