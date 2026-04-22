from contextlib import asynccontextmanager
import csv
import hashlib
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import psycopg
from psycopg.rows import dict_row
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

DATABASE_URL = f"postgresql://{os.getenv('DATABASE_USER')}:{os.getenv('DATABASE_PASSWORD')}@localhost:5432/NittanyAuction"


# ─── Database Helpers ─────────────────────────────────────────
def get_db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def hash_password(plain: str) -> str:
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()


def get_user_role(email: str, conn) -> str:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM Helpdesk WHERE email = %s", (email,))
        if cur.fetchone():
            return "helpdesk"
        cur.execute("SELECT 1 FROM Sellers WHERE email = %s", (email,))
        if cur.fetchone():
            return "seller"
        cur.execute("SELECT 1 FROM Bidders WHERE email = %s", (email,))
        if cur.fetchone():
            return "buyer"
    return "unknown"


def get_orders_for_user(bidder_email):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT B.listing_id, A.category, A.auction_title, A.product_name,
                       A.product_description, A.quantity, A.reserve_price,
                       A.max_bids, A.status, B.bidder_email, B.bid_price
                FROM Auction_Listings A
                JOIN Bids B ON A.listing_id = B.listing_id
                WHERE B.bidder_email = %s
            """, (bidder_email,))
            return cur.fetchall()


def get_order_details(listing_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT seller_email, category, auction_title, product_name,
                       product_description, status, quantity, reserve_price
                FROM Auction_Listings WHERE listing_id = %s
            """, (listing_id,))
            return cur.fetchone()


def require_buyer(request: Request):
    email = request.session.get("email")
    role = request.session.get("role")
    if not email or role != "buyer":
        return None, JSONResponse({"error": "Buyer access required."}, status_code=403)
    return email, None


# ─── Database Initialization ─────────────────────────────────
def init_db():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Users (
                    email TEXT PRIMARY KEY,
                    password TEXT NOT NULL
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Helpdesk (
                    email TEXT PRIMARY KEY,
                    position TEXT,
                    FOREIGN KEY (email) REFERENCES Users(email)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Zipcode_Info (
                    zipcode TEXT PRIMARY KEY,
                    city TEXT,
                    state TEXT
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Address (
                    address_id TEXT PRIMARY KEY,
                    zipcode TEXT,
                    street_num TEXT,
                    street_name TEXT,
                    FOREIGN KEY (zipcode) REFERENCES Zipcode_Info(zipcode)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Bidders (
                    email TEXT PRIMARY KEY,
                    first_name TEXT,
                    last_name TEXT,
                    age INTEGER,
                    home_address_id TEXT,
                    major TEXT,
                    FOREIGN KEY (email) REFERENCES Users(email),
                    FOREIGN KEY (home_address_id) REFERENCES Address(address_id)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Sellers (
                    email TEXT PRIMARY KEY,
                    bank_routing_number TEXT,
                    bank_account_number TEXT,
                    balance INTEGER,
                    FOREIGN KEY (email) REFERENCES Users(email)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Local_Vendors (
                    email TEXT PRIMARY KEY,
                    business_name TEXT,
                    business_address_id TEXT,
                    customer_service_phone_number TEXT,
                    FOREIGN KEY (email) REFERENCES Sellers(email),
                    FOREIGN KEY (business_address_id) REFERENCES Address(address_id)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Requests (
                    request_id SERIAL PRIMARY KEY,
                    sender_email TEXT,
                    helpdesk_staff_email TEXT DEFAULT 'helpdeskteam@lsu.edu',
                    request_type TEXT,
                    request_desc TEXT,
                    request_status INTEGER DEFAULT 0,
                    FOREIGN KEY (sender_email) REFERENCES Users(email),
                    FOREIGN KEY (helpdesk_staff_email) REFERENCES Helpdesk(email)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Credit_Cards (
                    credit_card_num TEXT PRIMARY KEY,
                    card_type TEXT,
                    expire_month INTEGER,
                    expire_year INTEGER,
                    security_code TEXT,
                    owner_email TEXT,
                    FOREIGN KEY (owner_email) REFERENCES Bidders(email)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Categories (
                    parent_category TEXT,
                    category_name TEXT,
                    PRIMARY KEY (parent_category, category_name)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Auction_Listings (
                    seller_email TEXT,
                    listing_id INTEGER,
                    category TEXT,
                    auction_title TEXT,
                    product_name TEXT,
                    product_description TEXT,
                    quantity INTEGER DEFAULT 1,
                    reserve_price INTEGER,
                    max_bids INTEGER,
                    status INTEGER DEFAULT 1,
                    PRIMARY KEY (seller_email, listing_id),
                    FOREIGN KEY (seller_email) REFERENCES Sellers(email)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Bids (
                    bid_id SERIAL PRIMARY KEY,
                    seller_email TEXT,
                    listing_id INTEGER,
                    bidder_email TEXT,
                    bid_price TEXT,
                    FOREIGN KEY (seller_email, listing_id) REFERENCES Auction_Listings(seller_email, listing_id),
                    FOREIGN KEY (bidder_email) REFERENCES Bidders(email)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Transactions (
                    transaction_id SERIAL PRIMARY KEY,
                    seller_email TEXT,
                    listing_id INTEGER,
                    buyer_email TEXT,
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    payment INTEGER,
                    FOREIGN KEY (seller_email, listing_id) REFERENCES Auction_Listings(seller_email, listing_id),
                    FOREIGN KEY (buyer_email) REFERENCES Bidders(email)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Cart_Items (
                    bidder_email TEXT,
                    seller_email TEXT,
                    listing_id INTEGER,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (bidder_email, seller_email, listing_id),
                    FOREIGN KEY (bidder_email) REFERENCES Bidders(email),
                    FOREIGN KEY (seller_email, listing_id) REFERENCES Auction_Listings(seller_email, listing_id)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Rating (
                    bidder_email TEXT,
                    seller_email TEXT,
                    date DATE,
                    rating INTEGER,
                    rating_desc TEXT,
                    PRIMARY KEY (bidder_email, seller_email, date),
                    FOREIGN KEY (bidder_email) REFERENCES Bidders(email),
                    FOREIGN KEY (seller_email) REFERENCES Sellers(email)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS Listing_Removals (
                    listing_id INTEGER,
                    seller_email TEXT,
                    removed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    remaining_bids INTEGER,
                    reason TEXT,
                    PRIMARY KEY (listing_id, seller_email),
                    FOREIGN KEY (seller_email, listing_id) REFERENCES Auction_Listings(seller_email, listing_id)
                );
            """)
        conn.commit()


# ─── CSV Data Population ─────────────────────────────────────
def _load_csv(cur, data_dir, csv_file, table, skip_cols=None, rename_cols=None):
    cur.execute(f"SELECT COUNT(*) AS count FROM {table}")
    if cur.fetchone()["count"] > 0:
        return
    filepath = os.path.join(data_dir, csv_file)
    if not os.path.exists(filepath):
        print(f"{csv_file} not found, skipping.")
        return
    skip_cols = {c.lower() for c in (skip_cols or [])}
    rename_cols = {k.lower(): v for k, v in (rename_cols or {}).items()}
    with open(filepath, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cols, vals = [], []
            for csv_col in reader.fieldnames:
                normalized = csv_col.lower().strip()
                if normalized in skip_cols:
                    continue
                cols.append(rename_cols.get(normalized, normalized))
                raw = row[csv_col]
                cleaned = raw.strip().lstrip("$").replace(",", "") if raw is not None else None
                vals.append(cleaned if cleaned != "" else None)
            col_names = ", ".join(cols)
            placeholders = ", ".join(["%s"] * len(cols))
            cur.execute(
                f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING",
                vals,
            )
    print(f"Loaded {csv_file} → {table}")


def populate_from_csv():
    with get_db() as conn:
        with conn.cursor() as cur:
            data_dir = "NittanyAuctionDataset_v1"
            cur.execute("SELECT COUNT(*) AS count FROM Users")
            if cur.fetchone()["count"] == 0:
                users_file = os.path.join(data_dir, "Users.csv")
                if os.path.exists(users_file):
                    with open(users_file, newline="", encoding="utf-8-sig") as f:
                        for row in csv.DictReader(f):
                            cur.execute(
                                "INSERT INTO Users (email, password) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                                (row["email"].strip(), hash_password(row["password"].strip())),
                            )
            _load_csv(cur, data_dir, "Zipcode_Info.csv", "Zipcode_Info")
            _load_csv(cur, data_dir, "Address.csv", "Address")
            cur.execute(
                "INSERT INTO Users (email, password) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                ("helpdeskteam@lsu.edu", hash_password("helpdeskteam")),
            )
            _load_csv(cur, data_dir, "Helpdesk.csv", "Helpdesk")
            _load_csv(cur, data_dir, "Bidders.csv", "Bidders")
            _load_csv(cur, data_dir, "Sellers.csv", "Sellers")
            _load_csv(cur, data_dir, "Local_Vendors.csv", "Local_Vendors")
            _load_csv(cur, data_dir, "Credit_Cards.csv", "Credit_Cards")
            _load_csv(cur, data_dir, "Categories.csv", "Categories")
            _load_csv(cur, data_dir, "Auction_Listings.csv", "Auction_Listings")
            _load_csv(cur, data_dir, "Bids.csv", "Bids", skip_cols=["bid_id"])
            _load_csv(cur, data_dir, "Transactions.csv", "Transactions", skip_cols=["transaction_id"], rename_cols={"bidder_email": "buyer_email"})
            _load_csv(cur, data_dir, "Ratings.csv", "Rating")
            _load_csv(cur, data_dir, "Requests.csv", "Requests", skip_cols=["request_id"])
        conn.commit()
        print("Database populated from CSV files.")


# ─── App Setup ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    populate_from_csv()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=os.getenv("MASTER_KEY", "dev-secret"))


# ─── Auth Routes ──────────────────────────────────────────────
@app.post("/api/login")
async def login(request: Request):
    payload = await request.json()
    email = payload.get("email", "")
    password = payload.get("password", "")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email, password FROM Users WHERE email = %s", (email,))
            user = cur.fetchone()
        if not user or user["password"] != hash_password(password):
            return JSONResponse({"error": "Invalid email or password."}, status_code=401)
        role = get_user_role(email, conn)
    request.session["email"] = email
    request.session["role"] = role
    return {"email": email, "role": role}

@app.post("/api/register")
async def register(request: Request):
    payload = await request.json()
    email = payload.get("email", "")
    password = payload.get("password", "")
    first_name = payload.get("firstName", "")
    last_name = payload.get("lastName", "")
    zipcode = payload.get("zipcode", "")
    street_num = payload.get("streetNum", "")
    street_name = payload.get("streetName", "")
    major = payload.get("major", "")
    age = payload.get("age", "")
    address_id = hash_password(zipcode + street_num + street_name)
    if email == None or password == None or first_name == None or last_name == None or zipcode == None or major == None or age == None:
        return JSONResponse({"error": "Invalid information."}, status_code=401)
    password = hash_password(password)
    with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("INSERT INTO Users (email, password) VALUES (%s, %s) ON CONFLICT (email) DO NOTHING", (email, password))
                cur.execute("INSERT INTO Address (address_id,zipcode,street_num,street_name) VALUES (%s, %s, %s, %s) ON CONFLICT (address_id) DO NOTHING", (address_id, zipcode, street_num, street_name))
                cur.execute("INSERT INTO Bidders (email, first_name, last_name, age, home_address_id, major) VALUES (%s, %s, %s, %s, %s, %s)", (email, first_name, last_name, age, address_id, major))
    return {"success": True}

@app.get("/api/session")
def api_session(request: Request):
    email = request.session.get("email")
    role = request.session.get("role")
    if not email:
        return JSONResponse({"authenticated": False}, status_code=401)
    return {"authenticated": True, "email": email, "role": role}


@app.post("/api/logout")
async def logout(request: Request):
    request.session.clear()
    return {"success": True}


# ─── Orders ───────────────────────────────────────────────────
@app.get("/get_user_orders")
async def get_user_orders(request: Request):
    bidder_email = request.session.get("email")
    return get_orders_for_user(bidder_email)


@app.get("/get_order_details")
async def order_details(request: Request):
    bid_id = request.query_params.get("bid_id")
    return get_order_details(int(bid_id))


# ─── Auction Routes ───────────────────────────────────────────
@app.get("/api/categories")
async def get_categories():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT parent_category, category_name FROM Categories ORDER BY parent_category, category_name")
            rows = cur.fetchall()
    grouped = {}
    for row in rows:
        parent = row["parent_category"]
        child = row["category_name"]
        if parent not in grouped:
            grouped[parent] = []
        grouped[parent].append(child)
    return [{"parent": parent, "children": children} for parent, children in grouped.items()]


@app.get("/api/listings")
async def get_listings(
    request: Request,
    category: str = None,
    q: str = None,
    min_price: float = None,
    max_price: float = None,
):
    buyer_email = request.session.get("email") if request.session.get("role") == "buyer" else None
    conditions = ["a.status = 1"]
    params = [buyer_email]
    if category:
        conditions.append("a.category = %s")
        params.append(category)
    if q:
        conditions.append("""
            (a.product_name ILIKE %s OR a.product_description ILIKE %s
             OR a.auction_title ILIKE %s OR a.category ILIKE %s OR a.seller_email ILIKE %s)
        """)
        like = f"%{q}%"
        params.extend([like, like, like, like, like])
    if min_price is not None:
        conditions.append("a.reserve_price >= %s")
        params.append(min_price)
    if max_price is not None:
        conditions.append("a.reserve_price <= %s")
        params.append(max_price)
    where = " AND ".join(conditions)
    query = f"""
        SELECT a.*,
               CASE WHEN c.listing_id IS NULL THEN FALSE ELSE TRUE END AS in_cart
        FROM Auction_Listings a
        LEFT JOIN Cart_Items c
          ON c.bidder_email = %s
         AND c.seller_email = a.seller_email
         AND c.listing_id = a.listing_id
        WHERE {where}
        ORDER BY a.listing_id DESC
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    return rows


class CartBody(BaseModel):
    listing_id: int
    seller_email: str


@app.get("/api/cart")
async def get_cart(request: Request):
    buyer_email, err = require_buyer(request)
    if err:
        return err
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.*, c.added_at
                FROM Cart_Items c
                JOIN Auction_Listings a
                  ON a.seller_email = c.seller_email
                 AND a.listing_id = c.listing_id
                WHERE c.bidder_email = %s
                ORDER BY c.added_at DESC, a.listing_id DESC
            """, (buyer_email,))
            rows = cur.fetchall()
    return rows


@app.post("/api/cart")
async def add_to_cart(request: Request, body: CartBody):
    buyer_email, err = require_buyer(request)
    if err:
        return err
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 1
                FROM Auction_Listings
                WHERE seller_email = %s AND listing_id = %s AND status = 1
            """, (body.seller_email, body.listing_id))
            listing = cur.fetchone()
            if not listing:
                return JSONResponse({"error": "Listing not found."}, status_code=404)
            cur.execute("""
                INSERT INTO Cart_Items (bidder_email, seller_email, listing_id)
                VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (buyer_email, body.seller_email, body.listing_id))
        conn.commit()
    return {"success": True}


@app.delete("/api/cart")
async def remove_from_cart(request: Request, body: CartBody):
    buyer_email, err = require_buyer(request)
    if err:
        return err
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM Cart_Items
                WHERE bidder_email = %s AND seller_email = %s AND listing_id = %s
            """, (buyer_email, body.seller_email, body.listing_id))
        conn.commit()
    return {"success": True}


@app.get("/api/get_top_ten_items")
async def get_top_ten_items():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.*, COUNT(b.bid_id) AS bid_count
                FROM Auction_Listings a
                LEFT JOIN Bids b ON a.seller_email = b.seller_email AND a.listing_id = b.listing_id
                WHERE a.status = 1
                GROUP BY a.seller_email, a.listing_id
                ORDER BY bid_count DESC
                LIMIT 10
            """)
            rows = cur.fetchall()
    return rows


@app.get("/api/listing/{listing_id}")
async def get_listing(listing_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.*,
                       COUNT(b.bid_id) AS bid_count,
                       MAX(b.bid_price::numeric) AS highest_bid
                FROM Auction_Listings a
                LEFT JOIN Bids b ON a.seller_email = b.seller_email AND a.listing_id = b.listing_id
                WHERE a.listing_id = %s
                GROUP BY a.seller_email, a.listing_id
            """, (listing_id,))
            listing = cur.fetchone()
            if not listing:
                raise HTTPException(status_code=404, detail="Listing not found")
            cur.execute("""
                SELECT bidder_email FROM Bids WHERE listing_id = %s ORDER BY bid_id DESC LIMIT 1
            """, (listing_id,))
            last_bid = cur.fetchone()
            listing["last_bidder_email"] = last_bid["bidder_email"] if last_bid else None

            # Auction result fields (when ended)
            listing["winner_email"] = None
            listing["successful"] = None
            if listing["bid_count"] >= listing["max_bids"] or listing["status"] == 2:
                cur.execute("""
                    SELECT bidder_email, bid_price::numeric AS bid_price
                    FROM Bids WHERE listing_id = %s
                    ORDER BY bid_price::numeric DESC LIMIT 1
                """, (listing_id,))
                top = cur.fetchone()
                if top:
                    listing["winner_email"] = top["bidder_email"]
                    listing["successful"] = float(top["bid_price"]) >= listing["reserve_price"]
            # Seller average rating
            cur.execute("""
                SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS rating_count
                FROM rating WHERE seller_email = %s
            """, (listing["seller_email"],))
            rating_row = cur.fetchone()
            listing["seller_avg_rating"] = float(rating_row["avg_rating"]) if rating_row["avg_rating"] else None
            listing["seller_rating_count"] = rating_row["rating_count"]
    return listing


class BidRequest(BaseModel):
    bidder_email: str
    bid_price: float


@app.post("/api/listing/{listing_id}/bid")
async def place_bid(listing_id: int, body: BidRequest):
    auction_ended = False
    successful = False
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.*, COUNT(b.bid_id) AS bid_count, MAX(b.bid_price::numeric) AS highest_bid
                FROM Auction_Listings a
                LEFT JOIN Bids b ON a.seller_email = b.seller_email AND a.listing_id = b.listing_id
                WHERE a.listing_id = %s
                GROUP BY a.seller_email, a.listing_id
            """, (listing_id,))
            listing = cur.fetchone()
            if not listing:
                raise HTTPException(status_code=404, detail="Listing not found")
            if listing["status"] != 1 or listing["bid_count"] >= listing["max_bids"]:
                return {"accepted": False, "reason": "auction ended"}
            cur.execute("""
                SELECT bidder_email FROM Bids WHERE listing_id = %s ORDER BY bid_id DESC LIMIT 1
            """, (listing_id,))
            last = cur.fetchone()
            if last and last["bidder_email"] == body.bidder_email:
                return {"accepted": False, "reason": "you must wait for another bidder"}
            min_bid = listing["reserve_price"] if listing["highest_bid"] is None else listing["highest_bid"] + 1
            if body.bid_price < min_bid:
                return {"accepted": False, "reason": f"bid too low — minimum is ${min_bid}"}
            cur.execute("""
                INSERT INTO Bids (seller_email, listing_id, bidder_email, bid_price)
                VALUES (%s, %s, %s, %s)
            """, (listing["seller_email"], listing_id, body.bidder_email, str(body.bid_price)))
            auction_ended = listing["bid_count"] + 1 >= listing["max_bids"]
            if auction_ended:
                successful = body.bid_price >= listing["reserve_price"]
                new_status = 0  # closed; becomes 2 (sold) after payment
                cur.execute("""
                    UPDATE Auction_Listings SET status = %s
                    WHERE seller_email = %s AND listing_id = %s
                """, (new_status, listing["seller_email"], listing_id))
        conn.commit()

    if auction_ended:
        return {
            "accepted": True,
            "reason": "bid placed successfully",
            "auction_ended": True,
            "successful": successful,
            "winner_email": body.bidder_email if successful else None,
        }
    return {"accepted": True, "reason": "bid placed successfully", "auction_ended": False}


# ─── Profile Routes ───────────────────────────────────────────
@app.get("/api/profile")
def get_profile(request: Request):
    email = request.session.get("email")
    if not email:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    with get_db() as conn:
        role = get_user_role(email, conn)
        with conn.cursor() as cur:
            if role == "buyer":
                cur.execute("SELECT * FROM Bidders WHERE email = %s", (email,))
            elif role == "seller":
                cur.execute("SELECT * FROM Sellers WHERE email = %s", (email,))
            elif role == "helpdesk":
                cur.execute("SELECT * FROM Helpdesk WHERE email = %s", (email,))
            else:
                return JSONResponse({"error": "User not found"}, status_code=404)
            profile = cur.fetchone()
    return {"email": email, "role": role, "profile": profile or {}}


@app.put("/api/profile")
async def update_profile(request: Request):
    email = request.session.get("email")
    if not email:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    payload = await request.json()
    with get_db() as conn:
        role = get_user_role(email, conn)
        with conn.cursor() as cur:
            if role == "buyer":
                cur.execute("""
                    UPDATE Bidders SET first_name=%s, last_name=%s, age=%s, major=%s
                    WHERE email=%s
                """, (
                    payload.get("first_name"),
                    payload.get("last_name"),
                    payload.get("age") or None,
                    payload.get("major"),
                    email,
                ))
            elif role == "seller":
                cur.execute("""
                    UPDATE Sellers SET bank_routing_number=%s, bank_account_number=%s
                    WHERE email=%s
                """, (
                    payload.get("bank_routing_number"),
                    payload.get("bank_account_number"),
                    email,
                ))
            elif role == "helpdesk":
                cur.execute("""
                    UPDATE Helpdesk SET position=%s WHERE email=%s
                """, (payload.get("position"), email))
        conn.commit()
    return {"success": True}


@app.post("/api/profile/password")
async def change_password(request: Request):
    email = request.session.get("email")
    if not email:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    payload = await request.json()
    current = payload.get("current_password", "")
    new_pw = payload.get("new_password", "")
    if not current or not new_pw:
        return JSONResponse({"error": "Both fields are required."}, status_code=400)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT password FROM Users WHERE email = %s", (email,))
            user = cur.fetchone()
            if not user or user["password"] != hash_password(current):
                return JSONResponse({"error": "Current password is incorrect."}, status_code=400)
            cur.execute("UPDATE Users SET password=%s WHERE email=%s", (hash_password(new_pw), email))
        conn.commit()
    return {"success": True}


# ─── Seller Dashboard Routes ──────────────────────────────────
def require_seller(request: Request):
    email = request.session.get("email")
    role = request.session.get("role")
    if not email or role != "seller":
        return None, JSONResponse({"error": "Seller access required."}, status_code=403)
    return email, None


@app.get("/api/seller/listings")
def seller_listings(request: Request):
    email, err = require_seller(request)
    if err:
        return err
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.*, COUNT(b.bid_id) AS bid_count
                FROM Auction_Listings a
                LEFT JOIN Bids b ON a.seller_email = b.seller_email AND a.listing_id = b.listing_id
                WHERE a.seller_email = %s
                GROUP BY a.seller_email, a.listing_id
                ORDER BY a.listing_id DESC
            """, (email,))
            rows = cur.fetchall()
    return rows


class ListingBody(BaseModel):
    auction_title: str
    product_name: str
    product_description: str
    category: str
    reserve_price: int
    max_bids: int
    quantity: int = 1


@app.post("/api/seller/listings")
async def create_listing(request: Request, body: ListingBody):
    email, err = require_seller(request)
    if err:
        return err
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COALESCE(MAX(listing_id), 0) + 1 AS next_id FROM Auction_Listings")
            next_id = cur.fetchone()["next_id"]
            cur.execute("""
                INSERT INTO Auction_Listings
                    (seller_email, listing_id, category, auction_title, product_name,
                     product_description, quantity, reserve_price, max_bids, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
            """, (email, next_id, body.category, body.auction_title, body.product_name,
                  body.product_description, body.quantity, body.reserve_price, body.max_bids))
        conn.commit()
    return {"success": True, "listing_id": next_id}


@app.put("/api/seller/listings/{listing_id}")
async def update_listing(listing_id: int, request: Request, body: ListingBody):
    email, err = require_seller(request)
    if err:
        return err
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.status, COUNT(b.bid_id) AS bid_count
                FROM Auction_Listings a
                LEFT JOIN Bids b ON a.seller_email = b.seller_email AND a.listing_id = b.listing_id
                WHERE a.seller_email = %s AND a.listing_id = %s
                GROUP BY a.status
            """, (email, listing_id))
            row = cur.fetchone()
            if not row:
                return JSONResponse({"error": "Listing not found."}, status_code=404)
            if row["status"] == 2:
                return JSONResponse({"error": "Cannot edit a sold listing."}, status_code=400)
            if row["status"] == 1 and row["bid_count"] > 0:
                return JSONResponse({"error": "Cannot edit an active listing that already has bids."}, status_code=400)
            cur.execute("""
                UPDATE Auction_Listings
                SET auction_title=%s, product_name=%s, product_description=%s,
                    category=%s, reserve_price=%s, max_bids=%s, quantity=%s
                WHERE seller_email=%s AND listing_id=%s
            """, (body.auction_title, body.product_name, body.product_description,
                  body.category, body.reserve_price, body.max_bids, body.quantity,
                  email, listing_id))
        conn.commit()
    return {"success": True}


class RemoveBody(BaseModel):
    reason: str


@app.post("/api/seller/listings/{listing_id}/remove")
async def remove_listing(listing_id: int, request: Request, body: RemoveBody):
    email, err = require_seller(request)
    if err:
        return err
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.status, a.max_bids, COUNT(b.bid_id) AS bid_count
                FROM Auction_Listings a
                LEFT JOIN Bids b ON a.seller_email = b.seller_email AND a.listing_id = b.listing_id
                WHERE a.seller_email = %s AND a.listing_id = %s
                GROUP BY a.status, a.max_bids
            """, (email, listing_id))
            row = cur.fetchone()
            if not row or row["status"] != 1:
                return JSONResponse({"error": "Only active listings can be removed."}, status_code=400)
            remaining = row["max_bids"] - row["bid_count"]
            cur.execute(
                "UPDATE Auction_Listings SET status = 0 WHERE seller_email = %s AND listing_id = %s",
                (email, listing_id)
            )
            cur.execute("""
                INSERT INTO Listing_Removals (listing_id, seller_email, remaining_bids, reason)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (listing_id, seller_email) DO UPDATE
                    SET remaining_bids = EXCLUDED.remaining_bids,
                        reason = EXCLUDED.reason,
                        removed_at = CURRENT_TIMESTAMP
            """, (listing_id, email, remaining, body.reason))
        conn.commit()
    return {"success": True}


# ─── Payment Routes ───────────────────────────────────────────
@app.get("/api/payment/{listing_id}")
def get_payment_page(listing_id: int, request: Request):
    email = request.session.get("email")
    if not email:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.*, MAX(b.bid_price::numeric) AS highest_bid
                FROM Auction_Listings a
                JOIN Bids b ON a.seller_email = b.seller_email AND a.listing_id = b.listing_id
                WHERE a.listing_id = %s
                GROUP BY a.seller_email, a.listing_id
            """, (listing_id,))
            listing = cur.fetchone()
            if not listing:
                return JSONResponse({"error": "Listing not found"}, status_code=404)
            # Verify session user is the winner
            cur.execute("""
                SELECT bidder_email FROM Bids WHERE listing_id = %s
                ORDER BY bid_price::numeric DESC LIMIT 1
            """, (listing_id,))
            top = cur.fetchone()
            if not top or top["bidder_email"] != email:
                return JSONResponse({"error": "You are not the winner of this auction."}, status_code=403)
            if listing["status"] == 2:
                return JSONResponse({"error": "This auction has already been paid."}, status_code=400)
            # Fetch saved credit cards
            cur.execute("""
                SELECT card_token, card_type, expire_month, expire_year, last_four_digits
                FROM Credit_Cards WHERE owner_email = %s
            """, (email,))
            cards = cur.fetchall()
    return {"listing": listing, "winning_bid": float(listing["highest_bid"]), "saved_cards": cards}


class PaymentBody(BaseModel):
    card_token: str
    card_type: str
    expire_month: int
    expire_year: int
    security_code: str


@app.post("/api/payment/{listing_id}")
async def process_payment(listing_id: int, request: Request, body: PaymentBody):
    email = request.session.get("email")
    if not email:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    with get_db() as conn:
        with conn.cursor() as cur:
            # Confirm winner and get listing
            cur.execute("""
                SELECT a.*, MAX(b.bid_price::numeric) AS highest_bid
                FROM Auction_Listings a
                JOIN Bids b ON a.seller_email = b.seller_email AND a.listing_id = b.listing_id
                WHERE a.listing_id = %s
                GROUP BY a.seller_email, a.listing_id
            """, (listing_id,))
            listing = cur.fetchone()
            if not listing or listing["status"] == 2:
                return JSONResponse({"error": "Invalid or already paid."}, status_code=400)
            cur.execute("""
                SELECT bidder_email FROM Bids WHERE listing_id = %s
                ORDER BY bid_price::numeric DESC LIMIT 1
            """, (listing_id,))
            top = cur.fetchone()
            if not top or top["bidder_email"] != email:
                return JSONResponse({"error": "You are not the winner."}, status_code=403)
            # Save card if not already stored
            last_four = body.card_token[-4:]
            card_hash = hash_password(body.card_token)
            cur.execute("""
                INSERT INTO Credit_Cards (card_token, card_type, expire_month, expire_year, owner_email, last_four_digits, card_number_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (card_token) DO NOTHING
            """, (body.card_token, body.card_type, body.expire_month, body.expire_year,
                  email, last_four, card_hash))
            # Record transaction
            cur.execute("""
                INSERT INTO Transactions (seller_email, listing_id, buyer_email, payment)
                VALUES (%s, %s, %s, %s)
            """, (listing["seller_email"], listing_id, email, int(listing["highest_bid"])))
            # Mark as sold
            cur.execute("""
                UPDATE Auction_Listings SET status = 2
                WHERE seller_email = %s AND listing_id = %s
            """, (listing["seller_email"], listing_id))
        conn.commit()
    return {"success": True}


# ─── Rating Routes ────────────────────────────────────────────
@app.get("/api/rating/{listing_id}")
def get_rating_status(listing_id: int, request: Request):
    email = request.session.get("email")
    if not email:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT rating, rating_desc FROM rating
                WHERE bidder_email = %s AND listing_id = %s
            """, (email, listing_id))
            row = cur.fetchone()
    if row:
        return {"already_rated": True, "rating": row["rating"], "rating_desc": row["rating_desc"]}
    return {"already_rated": False}


class RatingBody(BaseModel):
    rating: int
    rating_desc: str = ""


@app.post("/api/rating/{listing_id}")
def submit_rating(listing_id: int, request: Request, body: RatingBody):
    email = request.session.get("email")
    if not email:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if body.rating < 1 or body.rating > 5:
        return JSONResponse({"error": "Rating must be between 1 and 5."}, status_code=400)
    with get_db() as conn:
        with conn.cursor() as cur:
            # Verify a completed, paid transaction exists for this bidder + listing
            cur.execute("""
                SELECT t.seller_email FROM Transactions t
                JOIN Auction_Listings a ON t.seller_email = a.seller_email AND t.listing_id = a.listing_id
                WHERE t.listing_id = %s AND t.buyer_email = %s AND a.status = 2
            """, (listing_id, email))
            txn = cur.fetchone()
            if not txn:
                return JSONResponse({"error": "You can only rate sellers after completing payment."}, status_code=403)
            # Check for duplicate
            cur.execute("""
                SELECT 1 FROM rating WHERE bidder_email = %s AND listing_id = %s
            """, (email, listing_id))
            if cur.fetchone():
                return JSONResponse({"error": "You have already rated this seller for this auction."}, status_code=409)
            cur.execute("""
                INSERT INTO rating (bidder_email, seller_email, date, rating, rating_desc, listing_id)
                VALUES (%s, %s, CURRENT_DATE, %s, %s, %s)
            """, (email, txn["seller_email"], body.rating, body.rating_desc, listing_id))
        conn.commit()
    return {"success": True}
