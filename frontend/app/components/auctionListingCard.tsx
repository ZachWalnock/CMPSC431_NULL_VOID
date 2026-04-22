import Link from "next/link";

type AuctionListingProps = {
  listing_id: number;
  seller_email: string;
  category: string;
  auction_title: string;
  product_name: string;
  product_description: string;
  quantity: number;
  reserve_price: number;
  max_bids: number;
  status: number;
  detailsHref?: string;
  footer?: React.ReactNode;
};

export default function AuctionListingCard({
  listing_id,
  seller_email,
  category,
  auction_title,
  product_name,
  product_description,
  quantity,
  reserve_price,
  max_bids,
  status,
  detailsHref,
  footer,
}: AuctionListingProps) {
  const statusLabel = status === 1 ? "Active" : "Closed";
  const statusColor = status === 1 ? "#16a34a" : "#6b7280";

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e3e9f9",
        borderRadius: "12px",
        padding: "1.25rem 1.5rem",
        margin: "0.5rem 0",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(46,91,255,0.10)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "6px" }}>
            Listing #{listing_id}
          </div>
          {detailsHref ? (
            <Link
              href={detailsHref}
              style={{ textDecoration: "none", color: "inherit", display: "inline-block" }}
            >
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{product_name}</div>
              <div style={{ fontSize: "0.9rem", color: "#374151", marginTop: "4px" }}>{auction_title}</div>
            </Link>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{product_name}</div>
              <div style={{ fontSize: "0.9rem", color: "#374151", marginTop: "4px" }}>{auction_title}</div>
            </>
          )}
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "2px" }}>{category}</div>
        </div>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            padding: "2px 10px",
            borderRadius: "999px",
            background: status === 1 ? "#dcfce7" : "#f3f4f6",
            color: statusColor,
            whiteSpace: "nowrap",
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div style={{ fontSize: "0.85rem", color: "#374151" }}>{product_description}</div>

      <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          Reserve: <span style={{ fontWeight: 600, color: "#111827" }}>${reserve_price}</span>
        </div>
        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          Max bids: <span style={{ fontWeight: 600, color: "#111827" }}>{max_bids}</span>
        </div>
        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          Qty: <span style={{ fontWeight: 600, color: "#111827" }}>{quantity}</span>
        </div>
        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          Seller: <span style={{ fontWeight: 600, color: "#111827" }}>{seller_email}</span>
        </div>
      </div>

      {(detailsHref || footer) ? (
        <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {detailsHref ? (
            <Link
              href={detailsHref}
              style={{
                color: "#2E5BFF",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "0.9rem",
              }}
            >
              View Details
            </Link>
          ) : (
            <span />
          )}
          {footer ? <div style={{ flex: "1 1 320px" }}>{footer}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
