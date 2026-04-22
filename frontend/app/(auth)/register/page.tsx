"use client"
import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
export default function Register() {
    const [firstName, setFirstName] = useState<string>("")
    const [lastName, setLastName] = useState<string>("")
    const [age, setAge] = useState<string>("")
    const [zipcode, setZipcode] = useState<string>("")
    const [streetNum, setStreetNum] = useState<string>("")
    const [streetName, setStreetName] = useState<string>("")
    const [major, setMajor] = useState<string>("")
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [error, setError] = useState<string>("")
    const router = useRouter()
    async function handleSubmit(e: React.MouseEvent ){
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:8000/api/register", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    age,
                    zipcode,
                    streetNum,
                    streetName,
                    major,
                    email,
                    password
                })
            }).then(data => data.json())
            if (!res.ok) {
                setError("Invalid credentials")
            }
        router.push("/")
        } catch {
            setError("Invalid credentials")
        }
    }

    return (
        <div style={{backgroundColor: "#FFFFFF"}}>
            <div
                style={{
                    width: "100vw",
                    height: "100vh",
                    display: "flex",
                    flexDirection: "column"
                }}
            >
            <div
                style={{
                    height: "15vh",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "end"
                }}
            >
                <div
                    style={{
                        fontSize: "2.5rem",
                        fontWeight: "bold",
                        letterSpacing: "0.03em",
                        color: "#334d6e"
                    }}
                >
                NittanyAuction
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "start",
                    paddingTop: "3vh",
                    color: "#000000",
                }}
            >
                <div
                    style={{
                        background: "white",
                        borderRadius: "12px",
                        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
                        padding: "2.5rem",
                        width: "40vw",
                        minHeight: "60vh",
                        height: "auto",
                        minWidth: "300px",
                        display: "flex",
                        justifyContent: "center",
                        
                    }}
                >
                <div style={{ width: "80%", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
                    <div style={{marginBottom: "4px", display: "flex", flexDirection: "column"}}>
                        <label style={{ fontWeight: 800, fontSize: "2rem" }}>First name</label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            placeholder="Enter first name"
                            required
                            autoFocus
                            style={{ color: "#4D4D4D", border: "1px solid black", borderRadius: "5px", padding: "6px" }}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </div>
                    <div style={{marginBottom: "4px", display: "flex", flexDirection: "column"}}>
                        <label style={{ fontWeight: 800, fontSize: "2rem" }}>Last name</label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            placeholder="Enter last name"
                            required
                            style={{ color: "#4D4D4D", border: "1px solid black", borderRadius: "5px", padding: "6px" }}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                    <div style={{marginBottom: "4px", display: "flex", flexDirection: "column"}}>
                        <label style={{ fontWeight: 800, fontSize: "2rem" }}>Age</label>
                        <input
                            type="number"
                            id="age"
                            name="age"
                            placeholder="Enter age"
                            required
                            min={0}
                            style={{ color: "#4D4D4D", border: "1px solid black", borderRadius: "5px", padding: "6px" }}
                            onChange={(e) => setAge(e.target.value)}
                        />
                    </div>
                    <div style={{marginBottom: "4px", display: "flex", flexDirection: "column"}}>
                        <label style={{ fontWeight: 800, fontSize: "2rem" }}>Home address</label>
                        <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                            <input
                                type="text"
                                id="zipcode"
                                name="zipcode"
                                placeholder="Zipcode"
                                required
                                style={{ color: "#4D4D4D", border: "1px solid black", borderRadius: "5px", padding: "6px", width: "30%" }}
                                onChange={(e) => setZipcode(e.target.value)}
                            />
                            <input
                                type="text"
                                id="streetNum"
                                name="streetNum"
                                placeholder="Street #"
                                required
                                style={{ color: "#4D4D4D", border: "1px solid black", borderRadius: "5px", padding: "6px", width: "30%" }}
                                onChange={(e) => setStreetNum(e.target.value)}
                            />
                            <input
                                type="text"
                                id="streetName"
                                name="streetName"
                                placeholder="Street name"
                                required
                                style={{ color: "#4D4D4D", border: "1px solid black", borderRadius: "5px", padding: "6px", width: "40%" }}
                                onChange={(e) => setStreetName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{marginBottom: "4px", display: "flex", flexDirection: "column"}}>
                        <label style={{ fontWeight: 800, fontSize: "2rem" }}>Major</label>
                        <input
                            type="text"
                            id="major"
                            name="major"
                            placeholder="Enter major"
                            required
                            style={{ color: "#4D4D4D", border: "1px solid black", borderRadius: "5px", padding: "6px" }}
                            onChange={(e) => setMajor(e.target.value)}
                        />
                    </div>
                    <div style={{marginBottom: "4px", display: "flex", flexDirection: "column"}}>
                        <label style={{ fontWeight: 800, fontSize: "2rem" }}>Set email address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Enter email"
                            required
                            style={{ color: "#4D4D4D", border: "1px solid black", borderRadius: "5px", padding: "6px" }}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div style={{marginBottom: "4px", display: "flex", flexDirection: "column"}}>
                        <label style={{ fontWeight: 800, fontSize: "2rem" }}>Create password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Enter password"
                            required
                            style={{border: "1px solid black", borderRadius: "5px", padding: "6px"}}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div style={{color: "red"}}>{error}</div>
                    <Link style={{display: "flex", justifyContent: "center", color: "#C9C9C9"}} href={"/login"}>
                        <span style={{ textDecoration: "underline" }}>Or login</span>                   
                    </Link>
                    <div style={{display: "grid"}}>
                    <button type="submit" style={{ backgroundColor: "#334d6e", borderRadius: "6px", color: "#FFFFFF", padding: "1rem" }} onClick={(e) => handleSubmit(e)}>
                        Register
                    </button>
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>
    )
}