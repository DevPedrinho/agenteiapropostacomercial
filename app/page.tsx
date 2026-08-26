import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES, getFeaturedProducts } from "@/lib/products";

export default function Home() {
  const featured = getFeaturedProducts(4);

  return (
    <>
      <section className="hero">
        <span className="hero-eyebrow">👾 GeekBox</span>
        <h1>Tudo para o seu lado nerd, em um só lugar</h1>
        <p>
          Colecionáveis, camisetas, jogos de tabuleiro, acessórios gamer e muito mais —
          selecionados pra quem vive a cultura geek.
        </p>
        <Link href="/produtos" className="btn btn-lg">
          Ver todos os produtos
        </Link>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Categorias</h2>
        </div>
        <div className="category-grid">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/produtos?categoria=${category.slug}`}
              className="category-tile"
            >
              <span className="category-tile-emoji">{category.emoji}</span>
              <span>{category.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Destaques</h2>
          <Link href="/produtos">Ver tudo →</Link>
        </div>
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </>
  );
}
