import Link from "next/link";
import { CATEGORIES } from "@/lib/products";

export default function CategoryFilter({ active }: { active: string | null }) {
  return (
    <div className="category-filter">
      <Link href="/produtos" className={`category-chip ${!active ? "active" : ""}`}>
        Todos
      </Link>
      {CATEGORIES.map((category) => (
        <Link
          key={category.slug}
          href={`/produtos?categoria=${category.slug}`}
          className={`category-chip ${active === category.slug ? "active" : ""}`}
        >
          {category.emoji} {category.label}
        </Link>
      ))}
    </div>
  );
}
