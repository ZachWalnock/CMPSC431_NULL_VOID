"use client"
import Link from "next/link";
import React, { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation"

type details = {
    seller_email: string,
    listing_id: number,
    category: string,
    auction_title: string,
    product_name: string,
    product_description: string,
    quantity: number,
    reserve_price: number,
    status: number
};



export default function OrderDetails({ params }: { params: Promise<{id: string }>}) {
    const { id } = use(params)
    const [orderDetails, setOrderDetails] = useState<details>();
    useEffect(() => {
        fetch(`http://localhost:8000/get_order_details?bid_id=${id}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(data => data.json()).then(data => setOrderDetails(data))
    }, [])
    console.log(orderDetails)
    return (
        <div style={{ background: "#fff", height: "100vh", fontWeight: 1000 }}>
            <div style={{ color: "#2E5BFF", fontSize: "3rem", padding: "2rem", paddingBottom: "0rem" }}>{ orderDetails?.product_name + " Order Details"}</div>
            <Link href={"/orders"} style={{color: "#C9C9C9", padding: "2rem"}}>
                Click to go back to orders
            </Link>
            <div
                style={{
                    margin: "2rem auto",
                    paddingTop: "10px",
                    width: "70%",
                    minHeight: "70%",
                    background: "#C9E2FF",
                    borderRadius: "11px",
                    color: "#000000",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    fontWeight: 500,
                    fontSize: "1.15rem",
                    position: "relative",
                }}
            >
       
                <span style={{fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.4rem"}}>Order Receipt</span>
                <div style={{width: "90%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ marginBottom: "0.7rem" }}>
                            <strong>Order ID:</strong> {id}
                        </div>
                        <div style={{ marginBottom: "0.7rem" }}>
                            <strong>Product:</strong> {orderDetails?.product_name}
                        </div>
                        <div style={{ marginBottom: "0.7rem" }}>
                            <strong>Auction Title:</strong> {orderDetails?.auction_title}
                        </div>
                        
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{marginBottom: "0.7rem"}}>
                            <strong>Category:</strong> {orderDetails?.category}
                        </div>
                        <div style={{marginBottom: "0.7rem"}}>
                            <strong>Seller:</strong> {orderDetails?.seller_email}
                        </div>
                        <div style={{marginBottom: "0.7rem"}}>
                            <strong>Quantity:</strong> {orderDetails?.quantity}
                        </div>

                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{marginBottom: "0.7rem"}}>
                            <strong>Date:</strong> empty
                        </div>
                        <div style={{marginBottom: "0.7rem"}}>
                            <strong>Reserve Price:</strong> {orderDetails?.reserve_price}
                        </div>
                        <div style={{marginBottom: "0.7rem"}}>
                            <strong>Status:</strong> {orderDetails?.status}
                        </div>    

                    </div>
               
                    <div style={{ position: "relative", left: 0, right: 0, bottom: 0, height: "1px", background: "#000000", marginBottom: "1rem"}} />
                    <form style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <label htmlFor="order-rating" style={{ fontWeight: 600 }}>Rate Your Order:</label>
                        <select
                            id="order-rating"
                            name="order-rating"
                            style={{
                                border: "1px solid #E3E9F9",
                                fontSize: "1rem",
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>Select a rating</option>
                            <option value="Awesome">Awesome</option>
                            <option value="Not bad">Not bad</option>
                            <option value="Bad">Bad</option>
                        </select>
                        <button type="submit"
                            style={{
                                padding:"0.25rem",
                                borderRadius: "6px",
                                border: "none",
                                background: "#3b82f6",
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: "1rem",
                            }}>
                            Submit
                        </button>
                    </form>
                    <form style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: "2rem", marginTop: "0.5rem" }}>
                        <label htmlFor="order-rating" style={{ fontWeight: 600 }}>Rate Your Order:</label>
                        <textarea
                            style={{
                                width: "100%",
                                height: "100%",
                                fontSize: "1rem",
                                borderRadius: "6px",
                                padding: "0.5rem",
                                border: "1.5px solid #000000"
                            }}
                            placeholder="Write your feedback here..."
                        ></textarea>
                   
                        <button
                            type="submit"
                            style={{
                                padding:"0.25rem",
                                borderRadius: "6px",
                                border: "none",
                                background: "#3b82f6",
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: "1rem",
                            }}
                        >
                            Submit
                        </button>
                    </form>
               
            
                    </div>
            </div>
   
        </div>
    )
}