"use client";
const auction_listings = [
  {
    listing_id: 747,
    seller_email: "wspadelli8j@lsu.edu",
    category: "Bakery & Bread",
    auction_title: "Freshness Guaranteed Steak Rolls",
    product_name: "Steak Rolls",
    product_description: "Yummy Rolls",
    quantity: 5,
    reserve_price: 50,
    max_bids: 3,
    status: 1
  },
  {
    listing_id: 741,
    seller_email: "dnaughton9f@lsu.edu",
    category: "Basketball",
    auction_title: "Wilson NCAA Street Shot Outdoor Basketball",
    product_name: "Wilson Basketball 9",
    product_description: "For WNBA and kids",
    quantity: 5,
    reserve_price: 145,
    max_bids: 3,
    status: 1
  },
  {
    listing_id: 786,
    seller_email: "amaccathayam@lsu.edu",
    category: "Bath Robes",
    auction_title: "Washed Linen Bathrobe",
    product_name: "Mainstays Linen Bathrobe",
    product_description: "Linen Bathrobe",
    quantity: 2,
    reserve_price: 80,
    max_bids: 3,
    status: 1
  }
];

import AuctionListingCard from "../../components/auctionListingCard";
export default function AuctionPage() {
    return (
        <div style={{ background: "#fff", height: "100vh", fontWeight: 1000 }}>
        <div style={{ color: "#2E5BFF", fontSize: "3rem", padding: "2rem" }}>Auction Items</div>
          {auction_listings.map((auction_listings, i) => {
              return (
                  <AuctionListingCard
                      key={i}
                      listing_id={auction_listings.listing_id}
                      seller_email={auction_listings.seller_email}
                      category={auction_listings.category}
                      auction_title={auction_listings.auction_title}
                      product_name={auction_listings.product_name}
                      product_description={auction_listings.product_description}
                      quantity={auction_listings.quantity}
                      reserve_price={auction_listings.reserve_price}
                      max_bids={auction_listings.max_bids}
                      status={auction_listings.status}
                  />
              )
          })}
        </div>
    )
}