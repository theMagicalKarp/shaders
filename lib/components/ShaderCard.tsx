import Link from "next/link";

export interface ShaderCardProps {
  title: { name: string; accent: string };
  description: string;
  link: string;
}

export default function ShaderCard({
  title,
  description,
  link,
}: ShaderCardProps) {
  return (
    <Link href={link}>
      <div className="card card-compact card-side bg-neutral text-neutral-content max-h-48 hover:border-primary border-solid border-2 border-neutral">
        <div className="card-body">
          <h2 className="card-title font-bold text-2xl">
            {title.name} <span className="text-base-content/60">/</span>{" "}
            <span className="text-accent">{title.accent}</span>
          </h2>
          <p>{description}</p>
        </div>
      </div>
    </Link>
  );
}
