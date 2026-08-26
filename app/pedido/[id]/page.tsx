import Link from "next/link";
import { notFound } from "next/navigation";
import ClearCartOnMount from "@/components/ClearCartOnMount";
import { formatBRL } from "@/lib/format";
import { getOrderById } from "@/lib/orders";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getOrderById(id);

  if (!order) notFound();

  return (
    <div className="order-confirmation">
      <ClearCartOnMount />
      <div className="panel">
        <span className="order-confirmation-check">✔</span>
        <h1>Pedido recebido!</h1>
        <p>
          Obrigado, {order.customerName}. Seu pedido <strong>#{order.id.slice(0, 8)}</strong> foi
          registrado e em breve entraremos em contato pelo e-mail ou telefone informado.
        </p>

        <div className="order-summary">
          {order.items.map((item) => (
            <div key={item.id} className="checkout-summary-row">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatBRL(item.priceCents * item.quantity)}</span>
            </div>
          ))}
          <div className="checkout-summary-row checkout-summary-total">
            <span>Total</span>
            <strong>{formatBRL(order.totalCents)}</strong>
          </div>
        </div>

        <p className="field-hint">
          Entrega em: {order.address}
        </p>

        <Link href="/produtos" className="btn">
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}
