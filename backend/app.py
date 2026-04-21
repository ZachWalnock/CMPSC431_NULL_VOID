from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
import psycopg
from psycopg.rows import dict_row
import hashlib
import csv
import os
from dotenv import load_dotenv
load_dotenv()

# ─── Database Helpers ─────────────────────────────────────────
def get_db():
    """Return a PostgreSQL connection with dict-style row access."""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def hash_password(plain: str) -> str:
    """SHA-256 hash a plain-text password."""
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()

def get_orders_for_user(bidder_email):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
            SELECT A.Category, A.Auction_Title, A.Product_Name, A.Product_Description, A.Quantity, A.Reserve_Price, A.Max_bids, A.Status, B.Bidder_Email, B.Bid_Price
            FROM Auction_Listings A, Bids B
            WHERE A.Listing_ID = B.Listing_ID AND B.Bidder_Email = %s
            """, (bidder_email,))
            results = cur.fetchall()
    return results
       
       


# ─── Database Initialization ─────────────────────────────────
def init_db():
    """Create tables based on the provided relational schema."""
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
                    credit_card_num  TEXT PRIMARY KEY,
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
                    bid_price INTEGER,
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

        conn.commit()


# ─── CSV Data Population ─────────────────────────────────────
def _load_csv(cur, data_dir, csv_file, table, skip_cols=None, rename_cols=None):
    """
    Load a CSV into a table if it's empty.
    - skip_cols:   CSV column names (case-insensitive) to omit, e.g. SERIAL PKs
    - rename_cols: map of csv col name → db col name, e.g. {"bidder_email": "buyer_email"}
    """
    cur.execute(f"SELECT COUNT(*) AS count FROM {table}")
    if cur.fetchone()["count"] > 0:
        return

    filepath = os.path.join(data_dir, csv_file)
    if not os.path.exists(filepath):
        print(f"{csv_file} not found, skipping.")
        return

    skip_cols   = {c.lower() for c in (skip_cols or [])}
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
                vals.append(raw.strip() if raw is not None else None)

            col_names = ", ".join(cols)
            placeholders = ", ".join(["%s"] * len(cols))
            cur.execute(
                f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING",
                vals,
            )

    print(f"Loaded {csv_file} → {table}")


def populate_from_csv():
    """Load all CSV files in FK-dependency order."""
    with get_db() as conn:
        with conn.cursor() as cur:
            data_dir = "NittanyAuctionDataset_v1"

            # Users — passwords must be hashed before insert
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

            # Load order respects FK dependencies
            _load_csv(cur, data_dir, "Zipcode_Info.csv", "Zipcode_Info")
            _load_csv(cur, data_dir, "Address.csv", "Address")
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


# ─── Startup Event ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    init_db()
    populate_from_csv()

    yield

    # TODO: shutdown logic here


# ─── Helper: Determine User Role ─────────────────────────────
def get_user_role(email: str, conn) -> str:
    """Return 'helpdesk', 'seller', or 'buyer' based on which tables the user exists in."""
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


# ─── App Setup ────────────────────────────────────────────────
app = FastAPI(lifespan=lifespan)
templates = Jinja2Templates(directory="templates")
app.add_middleware(SessionMiddleware, secret_key=os.getenv('MASTER_KEY'))
DATABASE_URL = f"postgresql://{os.getenv('DATABASE_USER')}:{os.getenv('DATABASE_PASSWORD')}@localhost:5432/NittanyAuction"


# ─── Routes ───────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html", {"request": request})

@app.post("/login", response_class=HTMLResponse)
async def login(request: Request, email: str = Form(...), password: str = Form(...)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM Users WHERE email = %s", (email,))
            user = cur.fetchone()

            if not user or user["password"] != hash_password(password):
                return templates.TemplateResponse(request, "login.html", {"request": request, "error": "Invalid email or password."}, status_code=401)

            role = get_user_role(email, conn)

    request.session["email"] = email
    request.session["role"] = role

    return templates.TemplateResponse(request, "dashboard.html", {"request": request})


@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/")
