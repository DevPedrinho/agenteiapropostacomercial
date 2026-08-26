import ProductCard from "@/components/ProductCard";
import CategoryFilter from "@/components/CategoryFilter";
import { getCategoryLabel, getProductsByCategory } from "@/lib/products";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const category = categoria || null;
  const products = getProductsByCategory(category);

  return (
    <>
      <div className="page-header">
        <h1>{category ? getCategoryLabel(category) : "Todos os produtos"}</h1>
        <p>{products.length} produto{products.length === 1 ? "" : "s"} encontrado{products.length === 1 ? "" : "s"}</p>
      </div>

      <CategoryFilter active={category} />

      {products.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum produto nessa categoria ainda.</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
