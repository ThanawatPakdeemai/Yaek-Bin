const palette = ["sage", "peach", "purple", "blue", "yellow"];

export function Avatar({
  name,
  index,
  small = false,
}: {
  name: string;
  index: number;
  small?: boolean;
}) {
  return (
    <span
      className={`avatar ${palette[index % palette.length]} ${small ? "small" : ""}`}
    >
      {name.trim().slice(0, 1) || "?"}
    </span>
  );
}
