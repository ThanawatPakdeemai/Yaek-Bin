import type { LucideIcon } from "lucide-react";

export function SectionTitle({
  icon: Icon,
  number,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <span className="section-icon">
        <Icon size={19} />
      </span>
      <div>
        <h2>
          <span>{number}</span>
          {title}
        </h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
