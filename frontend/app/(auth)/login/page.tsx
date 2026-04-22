"use-client"
import Link from "next/link"
export default function Login() {
    const apiBaseUrl = "http://localhost:8000";

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
                        height: "60vh",
                        minWidth: "300px",
                        display: "flex",
                        justifyContent: "center",
                        
                    }}
                >
                <form
                    method="post"
                    action={`${apiBaseUrl}/login`}
                    style={{ width: "80%", display: "flex", flexDirection: "column", justifyContent: "space-around"}}
                >
                    <div style={{marginBottom: "4px", display: "flex", flexDirection: "column"}}>
                        <label style={{ fontWeight: 800, fontSize: "2rem" }}>Email address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Enter email"
                            required
                            autoFocus
                            style={{ color: "#4D4D4D", border: "1px solid black", borderRadius: "5px", padding: "6px" }}
                        />
                    </div>
                    <div style={{marginBottom: "4px", display: "flex", flexDirection: "column"}}>
                        <label style={{ fontWeight: 800, fontSize: "2rem" }}>Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Enter password"
                            required
                            style={{border: "1px solid black", borderRadius: "5px", padding: "6px"}}
                        />
                    </div>
                    <Link style={{display: "flex", justifyContent: "center", color: "#C9C9C9"}} href={"/register"}>
                        <span style={{ textDecoration: "underline" }}>Or register!</span>                   
                    </Link>
                    <div style={{display: "grid"}}>
                    <button type="submit" style={{ backgroundColor: "#334d6e", borderRadius: "6px", color: "#FFFFFF", padding: "1rem" }}>
                        Sign in
                    </button>
                    </div>
                </form>
                </div>
            </div>
            </div>
        </div>
    )
}