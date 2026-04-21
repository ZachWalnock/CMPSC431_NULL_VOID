"use client";
const bids = [
  {
    orderID: "1",
    auction_title: "freshness guaranteed steak rolls",
    product_name: "steak rolls",
    product_description: "yummy rolls",
    status: "active",
    bid_amount: 100
  },
  {
    orderID: "2",
    auction_title: "wilson ncaa street shot outdoor basketball",
    product_name: "wilson basketball 9\"",
    product_description: "for wnba and kids",
    status: "closed",
    bid_amount: 250
  },
  {
    orderID: "3",
    auction_title: "washed linen bathrobe",
    product_name: "mainstays linen bathrobe",
    product_description: "linen bathrobe",
    status: "active",
    bid_amount: 85
  },
  {
    orderID: "4",
    auction_title: "liquid touch concealer brush",
    product_name: "rare beauty liquid touch brush",
    product_description: "makeup brush",
    status: "pending",
    bid_amount: 40
  },
  {
    orderID: "5",
    auction_title: "beef ribeye steak",
    product_name: "ribeye",
    product_description: "ready to cook ribeye",
    status: "active",
    bid_amount: 190
  }
];

import OrderCard from "../components/orderCard"
export default function OrdersPage(
    //Navbar,
    // Orders
) {
    return (
        <div style={{ background: "#fff", height: "100vh", fontWeight: 1000 }}>
            <div style={{ color: "#2E5BFF", fontSize: "3rem", padding: "2rem" }}>My Orders</div>
        {bids.map((bid, i) => {
            return (
                <OrderCard
                    key={i}
                    orderID={bid.orderID}
                    auction_title={bid.auction_title}
                    product_name={bid.product_name}
                    product_description={bid.product_description}
                    status={bid.status}
                    bid_amount={bid.bid_amount}
                />
            )
        })}
       
        </div>
    )
}