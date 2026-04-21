"use-client"

export default async function OrderDetails(
    { id }: Promise<{ id: string }>
) {
    const id = await id
    return (
        <div style={{ background: "#fff", height: "100vh", fontWeight: 1000 }}>
            <div style={{ color: "#2E5BFF", fontSize: "3rem", padding: "2rem" }}>{product_name + " Order Details"}</div>
        </div>
    )
}