"use client"
import { useEffect, useState } from "react"

type Order = {
  listing_id: number;
  category: string;
  auction_title: string;
  product_name: string;
  product_description: string;
  quantity: number;
  reserve_price: number;
  max_bids: number;
  status: string;
  bidder_email: string;
  bid_price: number;
};

import OrderCard from "../../components/orderCard"
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
      fetch("http://localhost:8000/get_user_orders", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      }).then(response => response.json()).then(data => setOrders(data))
    }, [])

    fetch("http://localhost:8000/get_user_orders", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    })
    console.log(orders)
    return (
        <div style={{ background: "#fff", height: "100vh", fontWeight: 1000 }}>
            <div style={{ color: "#2E5BFF", fontSize: "3rem", padding: "2rem" }}>My Orders</div>
        {orders.map((bid, i) => {
            return (
                <OrderCard
                    key={i}
                    listing_id={bid.listing_id}
                    auction_title={bid.auction_title}
                    product_name={bid.product_name}
                    product_description={bid.product_description}
                    status={bid.status}
                    bid_amount={bid.bid_price}
                />
            )
        })}
       
        </div>
    )
}