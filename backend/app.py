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
                    email       TEXT PRIMARY KEY,
                    password    TEXT NOT NULL
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS Helpdesk (
                    email       TEXT PRIMARY KEY,
                    position    TEXT,
                    FOREIGN KEY (email) REFERENCES Users(email)
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS Bidders (
                    email           TEXT PRIMARY KEY,
                    first_name      TEXT,
                    last_name       TEXT,
                    age             INTEGER,
                    home_address_id TEXT,
                    major           TEXT,
                    FOREIGN KEY (email) REFERENCES Users(email)
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS Sellers (
                    email                TEXT PRIMARY KEY,
                    bank_routing_number  TEXT,
                    bank_account_number  TEXT,
                    balance              INTEGER,
                    FOREIGN KEY (email) REFERENCES Users(email)
                );
            """)

        conn.commit()


# ─── CSV Data Population ─────────────────────────────────────
def _load_csv_table(cur, data_dir, csv_file, table):
    """Load a CSV into the given table. Assumes CSV headers (lowercased) match DB columns.
    Skips rows whose email doesn't exist in Users."""
    cur.execute(f"SELECT COUNT(*) AS count FROM {table}")
    if cur.fetchone()["count"] > 0:
        return
    filepath = os.path.join(data_dir, csv_file)
    if not os.path.exists(filepath):
        return
    with open(filepath, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        columns = [col.lower() for col in reader.fieldnames]
        col_names = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))
        for row in reader:
            values = [row[col].strip() for col in reader.fieldnames]
            cur.execute(
                f"""
                INSERT INTO {table} ({col_names})
                SELECT {placeholders}
                WHERE EXISTS (SELECT 1 FROM Users WHERE email = %s)
                ON CONFLICT (email) DO NOTHING
                """,
                (*values, values[0]),
            )


def populate_from_csv():
    """Load CSV files from the NittanyAuctionDataset_v1/ directory into the database."""
    with get_db() as conn:
        with conn.cursor() as cur:
            data_dir = "NittanyAuctionDataset_v1"

            # Users is special: passwords must be hashed
            cur.execute("SELECT COUNT(*) AS count FROM Users")
            if cur.fetchone()["count"] == 0:
                users_file = os.path.join(data_dir, "Users.csv")
                if os.path.exists(users_file):
                    with open(users_file, newline="", encoding="utf-8-sig") as f:
                        for row in csv.DictReader(f):
                            cur.execute(
                                "INSERT INTO Users (email, password) VALUES (%s, %s) ON CONFLICT (email) DO NOTHING",
                                (row["email"].strip(), hash_password(row["password"].strip())),
                            )

            # All other tables follow the same pattern
            for csv_file, table in [
                ("Helpdesk.csv", "Helpdesk"),
                ("Bidders.csv",  "Bidders"),
                ("Sellers.csv",  "Sellers"),
            ]:
                _load_csv_table(cur, data_dir, csv_file, table)

        conn.commit()
        print("✅ Database populated from CSV files.")


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
