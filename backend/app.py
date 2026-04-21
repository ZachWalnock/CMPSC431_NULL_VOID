from contextlib import asynccontextmanager
import base64
import csv
import hashlib
import hmac
import os
import re
import secrets
from urllib.parse import quote

from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
import psycopg
from psycopg.rows import dict_row
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:3000")
DATABASE_URL = (
    f"postgresql://{os.getenv('DATABASE_USER')}:{os.getenv('DATABASE_PASSWORD')}"
    "@localhost:5432/NittanyAuction"
)
EMAIL_CHANGE_NOTICE = "To change your email address, please submit a request to HelpDesk."
PHONE_PATTERN = re.compile(r"^\d{3}-\d{3}-\d{4}$")
PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")
IS_PRODUCTION = os.getenv("APP_ENV", "development").lower() == "production"
SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE", "3600"))
SESSION_HTTPS_ONLY = (
    os.getenv("SESSION_HTTPS_ONLY", "true" if IS_PRODUCTION else "false").lower()
    == "true"
)


def get_db():
    """Return a PostgreSQL connection with dict-style row access."""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def hash_password(plain: str) -> str:
    """SHA-256 hash a plain-text password."""
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()



def verify_password(plain: str, stored: str) -> bool:
    """Compare a plain-text password against the stored hash."""
    if not stored:
        return False
    return hmac.compare_digest(hash_password(plain), stored)


def normalize_csv_value(value):
    """Strip whitespace and normalize empty strings to None for cleaner inserts."""
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def digits_only(value: str | None) -> str:
    """Reduce payment values to digits before hashing or extracting the last four digits."""
    return "".join(ch for ch in (value or "") if ch.isdigit())


def hash_sensitive_value(value: str) -> str:
    """Persist only keyed hashes for card identifiers so raw PANs are not recoverable from the DB."""
    secret = os.getenv("MASTER_KEY", "nittanyauction-dev-key").encode("utf-8")
    return hmac.new(secret, value.encode("utf-8"), hashlib.sha256).hexdigest()


def create_table_if_missing(cur, create_sql: str) -> None:
    cur.execute(create_sql)


def ensure_column(cur, table_name: str, column_name: str, column_sql: str) -> None:
    cur.execute(
        f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column_name} {column_sql};"
    )


def init_db():
    """Create and incrementally upgrade the profile and helpdesk schema required by the frontend."""
    with get_db() as conn:
        with conn.cursor() as cur:
            create_table_if_missing(
                cur,
                """
                CREATE TABLE IF NOT EXISTS Users (
                    email TEXT PRIMARY KEY,
                    password TEXT NOT NULL
                );
                """,
            )
            ensure_column(cur, "Users", "password", "TEXT")

            create_table_if_missing(
                cur,
                """
                CREATE TABLE IF NOT EXISTS Helpdesk (
                    email TEXT PRIMARY KEY,
                    position TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    phone TEXT,
                    department TEXT,
                    staff_id TEXT,
                    FOREIGN KEY (email) REFERENCES Users(email)
                );
                """,
            )
            for column_name, column_sql in [
                ("position", "TEXT"),
                ("first_name", "TEXT"),
                ("last_name", "TEXT"),
                ("phone", "TEXT"),
                ("department", "TEXT"),
                ("staff_id", "TEXT"),
            ]:
                ensure_column(cur, "Helpdesk", column_name, column_sql)

            create_table_if_missing(
                cur,
                """
                CREATE TABLE IF NOT EXISTS Bidders (
                    email TEXT PRIMARY KEY,
                    first_name TEXT,
                    last_name TEXT,
                    phone TEXT,
                    age INTEGER,
                    home_address_id TEXT,
                    major TEXT,
                    annual_income NUMERIC(12, 2),
                    FOREIGN KEY (email) REFERENCES Users(email)
                );
                """,
            )
            for column_name, column_sql in [
                ("first_name", "TEXT"),
                ("last_name", "TEXT"),
                ("phone", "TEXT"),
                ("age", "INTEGER"),
                ("home_address_id", "TEXT"),
                ("major", "TEXT"),
                ("annual_income", "NUMERIC(12, 2)"),
            ]:
                ensure_column(cur, "Bidders", column_name, column_sql)

            create_table_if_missing(
                cur,
                """
                CREATE TABLE IF NOT EXISTS Sellers (
                    email TEXT PRIMARY KEY,
                    first_name TEXT,
                    last_name TEXT,
                    phone TEXT,
                    age INTEGER,
                    home_address_id TEXT,
                    major TEXT,
                    bank_routing_number TEXT,
                    bank_account_number TEXT,
                    balance NUMERIC(12, 2),
                    FOREIGN KEY (email) REFERENCES Users(email)
                );
                """,
            )
            for column_name, column_sql in [
                ("first_name", "TEXT"),
                ("last_name", "TEXT"),
                ("phone", "TEXT"),
                ("age", "INTEGER"),
                ("home_address_id", "TEXT"),
                ("major", "TEXT"),
                ("bank_routing_number", "TEXT"),
                ("bank_account_number", "TEXT"),
                ("balance", "NUMERIC(12, 2)"),
            ]:
                ensure_column(cur, "Sellers", column_name, column_sql)

            create_table_if_missing(
                cur,
                """
                CREATE TABLE IF NOT EXISTS Address (
                    address_id TEXT PRIMARY KEY,
                    zipcode TEXT NOT NULL,
                    street_num TEXT,
                    street_name TEXT
                );
                """,
            )
            for column_name, column_sql in [
                ("zipcode", "TEXT"),
                ("street_num", "TEXT"),
                ("street_name", "TEXT"),
            ]:
                ensure_column(cur, "Address", column_name, column_sql)

            create_table_if_missing(
                cur,
                """
                CREATE TABLE IF NOT EXISTS Zipcode_Info (
                    zipcode TEXT PRIMARY KEY,
                    city TEXT NOT NULL,
                    state TEXT NOT NULL
                );
                """,
            )
            for column_name, column_sql in [("city", "TEXT"), ("state", "TEXT")]:
                ensure_column(cur, "Zipcode_Info", column_name, column_sql)

            create_table_if_missing(
                cur,
                """
                CREATE TABLE IF NOT EXISTS Credit_Cards (
                    card_token TEXT PRIMARY KEY,
                    card_type TEXT,
                    expire_month INTEGER,
                    expire_year INTEGER,
                    owner_email TEXT,
                    last_four_digits TEXT,
                    card_number_hash TEXT,
                    FOREIGN KEY (owner_email) REFERENCES Users(email)
                );
                """,
            )
            for column_name, column_sql in [
                ("card_token", "TEXT"),
                ("card_type", "TEXT"),
                ("expire_month", "INTEGER"),
                ("expire_year", "INTEGER"),
                ("owner_email", "TEXT"),
                ("last_four_digits", "TEXT"),
                ("card_number_hash", "TEXT"),
            ]:
                ensure_column(cur, "Credit_Cards", column_name, column_sql)

            create_table_if_missing(
                cur,
                """
                CREATE TABLE IF NOT EXISTS Local_Vendors (
                    email TEXT PRIMARY KEY,
                    business_name TEXT,
                    business_address_id TEXT,
                    customer_service_phone_number TEXT,
                    FOREIGN KEY (email) REFERENCES Users(email)
                );
                """,
            )
            for column_name, column_sql in [
                ("business_name", "TEXT"),
                ("business_address_id", "TEXT"),
                ("customer_service_phone_number", "TEXT"),
            ]:
                ensure_column(cur, "Local_Vendors", column_name, column_sql)

            create_table_if_missing(
                cur,
                """
                CREATE TABLE IF NOT EXISTS HelpDesk_Requests (
                    request_id SERIAL PRIMARY KEY,
                    requester_email TEXT NOT NULL,
                    request_type TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    description TEXT,
                    status TEXT DEFAULT 'unassigned',
                    assigned_to TEXT DEFAULT 'helpdeskteam@lsu.edu',
                    category_name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    FOREIGN KEY (requester_email) REFERENCES Users(email)
                );
                """,
            )
            for column_name, column_sql in [
                ("requester_email", "TEXT"),
                ("request_type", "TEXT"),
                ("subject", "TEXT"),
                ("description", "TEXT"),
                ("status", "TEXT DEFAULT 'unassigned'"),
                ("assigned_to", "TEXT DEFAULT 'helpdeskteam@lsu.edu'"),
                ("category_name", "TEXT"),
                ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
                ("completed_at", "TIMESTAMP"),
            ]:
                ensure_column(cur, "HelpDesk_Requests", column_name, column_sql)

        conn.commit()

    migrate_credit_card_storage()


def migrate_credit_card_storage():
    """Scrub plaintext card values from older databases and pivot to tokenized storage."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'credit_cards'
                """
            )
            columns = {row["column_name"] for row in cur.fetchall()}
            if not columns:
                return

            if "credit_card_num" in columns:
                cur.execute(
                    """
                    SELECT credit_card_num
                    FROM Credit_Cards
                    WHERE credit_card_num IS NOT NULL
                      AND (
                        card_token IS NULL
                        OR last_four_digits IS NULL
                        OR card_number_hash IS NULL
                      )
                    """
                )
                for row in cur.fetchall():
                    normalized = digits_only(row["credit_card_num"])
                    if not normalized:
                        continue
                    token = hash_sensitive_value(normalized)
                    cur.execute(
                        """
                        UPDATE Credit_Cards
                        SET card_token = %s,
                            last_four_digits = %s,
                            card_number_hash = %s
                        WHERE credit_card_num = %s
                        """,
                        (token, normalized[-4:], token, row["credit_card_num"]),
                    )
                cur.execute(
                    "ALTER TABLE Credit_Cards DROP CONSTRAINT IF EXISTS credit_cards_pkey"
                )
                cur.execute(
                    """
                    ALTER TABLE Credit_Cards
                    ADD CONSTRAINT credit_cards_pkey PRIMARY KEY (card_token)
                    """
                )
                cur.execute("ALTER TABLE Credit_Cards DROP COLUMN IF EXISTS credit_card_num")

            if "security_code" in columns:
                cur.execute("ALTER TABLE Credit_Cards DROP COLUMN IF EXISTS security_code")

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


def load_users(cur, data_dir: str) -> None:
    cur.execute("SELECT COUNT(*) AS count FROM Users")
    if cur.fetchone()["count"] > 0:
        return
    users_file = os.path.join(data_dir, "Users.csv")
    if not os.path.exists(users_file):
        return
    with open(users_file, newline="", encoding="utf-8-sig") as csv_file:
        for row in csv.DictReader(csv_file):
            cur.execute(
                """
                INSERT INTO Users (email, password)
                VALUES (%s, %s)
                ON CONFLICT (email) DO NOTHING
                """,
                (
                    normalize_csv_value(row["email"]),
                    hash_password(normalize_csv_value(row["password"])),
                ),
            )


def load_table_from_rows(cur, table_name: str, rows: list[dict], insert_sql: str) -> None:
    cur.execute(f"SELECT COUNT(*) AS count FROM {table_name}")
    if cur.fetchone()["count"] > 0:
        return
    for row in rows:
        cur.execute(insert_sql, row)


def read_csv_rows(data_dir: str, filename: str) -> list[dict]:
    filepath = os.path.join(data_dir, filename)
    if not os.path.exists(filepath):
        return []

    with open(filepath, newline="", encoding="utf-8-sig") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = []
        for row in reader:
            normalized_row = {
                key: normalize_csv_value(value) for key, value in row.items()
            }
            if filename == "Credit_Cards.csv":
                card_digits = digits_only(normalized_row.get("credit_card_num"))
                if card_digits:
                    token = hash_sensitive_value(card_digits)
                    normalized_row["card_token"] = token
                    normalized_row["last_four_digits"] = card_digits[-4:]
                    normalized_row["card_number_hash"] = token
                normalized_row.pop("credit_card_num", None)
                normalized_row.pop("security_code", None)
            if filename == "Requests.csv":
                normalized_row["requester_email"] = normalized_row.get("sender_email")
                normalized_row["assigned_to"] = normalized_row.get("helpdesk_staff_email")
                normalized_row["description"] = normalized_row.get("request_desc")
                normalized_row["subject"] = normalized_row.get("request_type")
                raw_status = normalized_row.get("request_status")
                if raw_status == "1":
                    normalized_row["status"] = "open"
                else:
                    normalized_row["status"] = "unassigned"
                normalized_row["category_name"] = None
            rows.append(normalized_row)
        return rows


def seed_helpdesk_team_inbox(cur) -> None:
    """Ensure helpdeskteam@lsu.edu exists as the shared ticket inbox account."""
    cur.execute(
        "INSERT INTO Users (email, password) VALUES (%s, %s) ON CONFLICT (email) DO NOTHING",
        ("helpdeskteam@lsu.edu", hash_password("helpdeskteam")),
    )
    cur.execute(
        """
        INSERT INTO Helpdesk (email, position, first_name, last_name)
        VALUES ('helpdeskteam@lsu.edu', 'Team Inbox', 'HelpDesk', 'Team')
        ON CONFLICT (email) DO NOTHING
        """,
    )


def populate_from_csv():
    with get_db() as conn:
        with conn.cursor() as cur:
            data_dir = "NittanyAuctionDataset_v1"
            load_users(cur, data_dir)
            seed_helpdesk_team_inbox(cur)
            load_table_from_rows(
                cur,
                "Address",
                read_csv_rows(data_dir, "Address.csv"),
                """
                INSERT INTO Address (address_id, zipcode, street_num, street_name)
                VALUES (%(address_id)s, %(zipcode)s, %(street_num)s, %(street_name)s)
                ON CONFLICT (address_id) DO NOTHING
                """,
            )
            load_table_from_rows(
                cur,
                "Zipcode_Info",
                read_csv_rows(data_dir, "Zipcode_Info.csv"),
                """
                INSERT INTO Zipcode_Info (zipcode, city, state)
                VALUES (%(zipcode)s, %(city)s, %(state)s)
                ON CONFLICT (zipcode) DO NOTHING
                """,
            )
            load_table_from_rows(
                cur,
                "Bidders",
                read_csv_rows(data_dir, "Bidders.csv"),
                """
                INSERT INTO Bidders (
                    email, first_name, last_name, age, home_address_id, major, phone, annual_income
                )
                SELECT %(email)s, %(first_name)s, %(last_name)s, %(age)s, %(home_address_id)s,
                       %(major)s, NULL, NULL
                WHERE EXISTS (SELECT 1 FROM Users WHERE email = %(email)s)
                ON CONFLICT (email) DO NOTHING
                """,
            )
            load_table_from_rows(
                cur,
                "Sellers",
                read_csv_rows(data_dir, "Sellers.csv"),
                """
                INSERT INTO Sellers (
                    email, first_name, last_name, phone, age, home_address_id, major,
                    bank_routing_number, bank_account_number, balance
                )
                SELECT %(email)s, NULL, NULL, NULL, NULL, NULL, NULL,
                       %(bank_routing_number)s, %(bank_account_number)s, %(balance)s
                WHERE EXISTS (SELECT 1 FROM Users WHERE email = %(email)s)
                ON CONFLICT (email) DO NOTHING
                """,
            )
            load_table_from_rows(
                cur,
                "Helpdesk",
                read_csv_rows(data_dir, "Helpdesk.csv"),
                """
                INSERT INTO Helpdesk (
                    email, position, first_name, last_name, phone, department, staff_id
                )
                SELECT %(email)s, %(Position)s, NULL, NULL, NULL, NULL, NULL
                WHERE EXISTS (SELECT 1 FROM Users WHERE email = %(email)s)
                ON CONFLICT (email) DO NOTHING
                """,
            )
            load_table_from_rows(
                cur,
                "Credit_Cards",
                read_csv_rows(data_dir, "Credit_Cards.csv"),
                """
                INSERT INTO Credit_Cards (
                    card_token, card_type, expire_month, expire_year, owner_email,
                    last_four_digits, card_number_hash
                )
                SELECT %(card_token)s, %(card_type)s, %(expire_month)s, %(expire_year)s,
                       %(Owner_email)s, %(last_four_digits)s, %(card_number_hash)s
                WHERE EXISTS (SELECT 1 FROM Users WHERE email = %(Owner_email)s)
                ON CONFLICT (card_token) DO NOTHING
                """,
            )
            load_table_from_rows(
                cur,
                "Local_Vendors",
                read_csv_rows(data_dir, "Local_Vendors.csv"),
                """
                INSERT INTO Local_Vendors (
                    email, business_name, business_address_id, customer_service_phone_number
                )
                SELECT %(Email)s, %(Business_Name)s, %(Business_Address_ID)s,
                       %(Customer_Service_Phone_Number)s
                WHERE EXISTS (SELECT 1 FROM Users WHERE email = %(Email)s)
                ON CONFLICT (email) DO NOTHING
                """,
            )
            load_table_from_rows(
                cur,
                "HelpDesk_Requests",
                read_csv_rows(data_dir, "Requests.csv"),
                """
                INSERT INTO HelpDesk_Requests (
                    request_id, requester_email, request_type, subject, description, status,
                    assigned_to, category_name
                )
                VALUES (
                    %(request_id)s, %(requester_email)s, %(request_type)s, %(subject)s, %(description)s,
                    COALESCE(%(status)s, 'unassigned'),
                    COALESCE(%(assigned_to)s, 'helpdeskteam@lsu.edu'),
                    %(category_name)s
                )
                ON CONFLICT DO NOTHING
                """,
            )

        conn.commit()
        print("Database populated from CSV files.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    populate_from_csv()
    yield


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
            return "bidder"
    return "unknown"


def get_authenticated_user(request: Request):
    email = request.session.get("email")
    role = request.session.get("role")
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")
    return email, role


def get_zipcode_details(zipcode: str, cur):
    cur.execute(
        "SELECT zipcode, city, state FROM Zipcode_Info WHERE zipcode = %s",
        (zipcode,),
    )
    return cur.fetchone()


def mask_account_number(account_number: str | None) -> str:
    if not account_number:
        return "Not provided"
    visible = account_number[-4:]
    return f"{'•' * max(len(account_number) - 4, 0)}{visible}"


def format_expiration(month: int | None, year: int | None) -> str:
    if month is None or year is None:
        return "N/A"
    return f"{int(month):02d}/{year}"


def build_address_payload(address_row, zipcode_row):
    return {
        "address_id": address_row["address_id"] if address_row else None,
        "street_num": address_row["street_num"] if address_row else "",
        "street_name": address_row["street_name"] if address_row else "",
        "zipcode": address_row["zipcode"] if address_row else "",
        "city": zipcode_row["city"] if zipcode_row else "",
        "state": zipcode_row["state"] if zipcode_row else "",
    }


def serialize_request_row(row):
    return {
        "request_id": row["request_id"],
        "requester_email": row["requester_email"],
        "request_type": row["request_type"],
        "subject": row["subject"],
        "description": row["description"],
        "status": row["status"],
        "assigned_to": row["assigned_to"],
        "category_name": row["category_name"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
    }


def get_profile_context(email: str, conn):
    role = get_user_role(email, conn)
    with conn.cursor() as cur:
        cur.execute("SELECT email FROM Users WHERE email = %s", (email,))
        user = cur.fetchone()
        if not user:
            return None

        profile = None
        address = build_address_payload(None, None)
        vendor = None
        payment_methods = []

        if role == "bidder":
            cur.execute("SELECT * FROM Bidders WHERE email = %s", (email,))
            profile = cur.fetchone()
            if profile and profile["home_address_id"]:
                cur.execute("SELECT * FROM Address WHERE address_id = %s", (profile["home_address_id"],))
                address_row = cur.fetchone()
                zipcode_row = get_zipcode_details(address_row["zipcode"], cur) if address_row else None
                address = build_address_payload(address_row, zipcode_row)
            cur.execute(
                """
                SELECT last_four_digits, card_type, expire_month, expire_year
                FROM Credit_Cards
                WHERE owner_email = %s
                ORDER BY expire_year, expire_month, card_token
                """,
                (email,),
            )
            payment_methods = [
                {
                    "card_type": (row["card_type"] or "").strip() or "Card",
                    "masked_number": f"••••••••••••{row['last_four_digits'] or '0000'}",
                    "expiration": format_expiration(row["expire_month"], row["expire_year"]),
                }
                for row in cur.fetchall()
            ]
        elif role == "seller":
            cur.execute("SELECT * FROM Sellers WHERE email = %s", (email,))
            profile = cur.fetchone()
            if profile:
                profile["masked_bank_account"] = mask_account_number(profile.get("bank_account_number"))
                profile["masked_routing_number"] = mask_account_number(profile.get("bank_routing_number"))
            if profile and profile["home_address_id"]:
                cur.execute("SELECT * FROM Address WHERE address_id = %s", (profile["home_address_id"],))
                address_row = cur.fetchone()
                zipcode_row = get_zipcode_details(address_row["zipcode"], cur) if address_row else None
                address = build_address_payload(address_row, zipcode_row)
            cur.execute("SELECT * FROM Local_Vendors WHERE email = %s", (email,))
            vendor = cur.fetchone()
            if vendor and vendor["business_address_id"]:
                cur.execute("SELECT * FROM Address WHERE address_id = %s", (vendor["business_address_id"],))
                vendor_address_row = cur.fetchone()
                zipcode_row = get_zipcode_details(vendor_address_row["zipcode"], cur) if vendor_address_row else None
                vendor["address"] = build_address_payload(vendor_address_row, zipcode_row)
            elif vendor:
                vendor["address"] = build_address_payload(None, None)
        elif role == "helpdesk":
            cur.execute("SELECT * FROM Helpdesk WHERE email = %s", (email,))
            profile = cur.fetchone()

        return {
            "user": user,
            "role": role,
            "profile": profile or {},
            "address": address,
            "vendor": vendor,
            "payment_methods": payment_methods,
        }


def validate_profile_payload(payload: dict, role: str, email: str, cur):
    errors = {}
    cleaned = {}

    posted_email = normalize_csv_value(payload.get("email"))
    if posted_email and posted_email != email:
        errors["email"] = EMAIL_CHANGE_NOTICE

    for field in ["first_name", "last_name"]:
        value = normalize_csv_value(payload.get(field))
        if role in {"bidder", "seller", "helpdesk"} and not value:
            errors[field] = f"{field.replace('_', ' ').title()} is required."
        cleaned[field] = value

    phone = normalize_csv_value(payload.get("phone"))
    if phone and not PHONE_PATTERN.fullmatch(phone):
        errors["phone"] = "Phone must be in XXX-XXX-XXXX format."
    cleaned["phone"] = phone

    age = normalize_csv_value(payload.get("age"))
    if age:
        if not age.isdigit():
            errors["age"] = "Age must be a whole number."
        else:
            age_value = int(age)
            if age_value < 18 or age_value > 120:
                errors["age"] = "Age must be between 18 and 120."
            cleaned["age"] = age_value
    else:
        cleaned["age"] = None

    cleaned["major"] = normalize_csv_value(payload.get("major"))
    if role in {"bidder", "seller"} and not cleaned["major"]:
        errors["major"] = "Major is required."

    income = normalize_csv_value(payload.get("annual_income"))
    if income:
        try:
            income_value = float(income)
            if income_value < 0:
                raise ValueError
            cleaned["annual_income"] = income_value
        except ValueError:
            errors["annual_income"] = "Annual income must be a non-negative number."
    else:
        cleaned["annual_income"] = None

    street_num = normalize_csv_value(payload.get("street_num"))
    street_name = normalize_csv_value(payload.get("street_name"))
    zipcode = normalize_csv_value(payload.get("zipcode"))
    zipcode_row = get_zipcode_details(zipcode, cur) if zipcode else None
    if role in {"bidder", "seller"}:
        if not street_num:
            errors["street_num"] = "Street number is required."
        if not street_name:
            errors["street_name"] = "Street name is required."
        if not zipcode:
            errors["zipcode"] = "Zipcode is required."
        elif not zipcode_row:
            errors["zipcode"] = "Zipcode must exist in Zipcode_Info."
    cleaned["address"] = {
        "street_num": street_num,
        "street_name": street_name,
        "zipcode": zipcode,
        "zipcode_row": zipcode_row,
    }

    if role == "seller":
        cur.execute("SELECT 1 FROM Local_Vendors WHERE email = %s", (email,))
        vendor_exists = cur.fetchone() is not None
        routing = normalize_csv_value(payload.get("bank_routing_number"))
        account = normalize_csv_value(payload.get("bank_account_number"))
        if not routing:
            errors["bank_routing_number"] = "Bank routing number is required."
        if not account:
            errors["bank_account_number"] = "Bank account number is required."
        cleaned["bank_routing_number"] = routing
        cleaned["bank_account_number"] = account

        business_name = normalize_csv_value(payload.get("business_name"))
        customer_phone = normalize_csv_value(payload.get("customer_service_phone_number"))
        vendor_street_num = normalize_csv_value(payload.get("vendor_street_num"))
        vendor_street_name = normalize_csv_value(payload.get("vendor_street_name"))
        vendor_zipcode = normalize_csv_value(payload.get("vendor_zipcode"))
        vendor_zipcode_row = get_zipcode_details(vendor_zipcode, cur) if vendor_zipcode else None
        has_vendor_data = vendor_exists or any(
            [
                business_name,
                customer_phone,
                vendor_street_num,
                vendor_street_name,
                vendor_zipcode,
            ]
        )
        if customer_phone and not PHONE_PATTERN.fullmatch(customer_phone):
            errors["customer_service_phone_number"] = "Customer service phone must be in XXX-XXX-XXXX format."
        if has_vendor_data:
            if not business_name:
                errors["business_name"] = "Business name is required for vendor profiles."
            if not customer_phone:
                errors["customer_service_phone_number"] = "Customer service phone is required for vendor profiles."
            if not vendor_street_num:
                errors["vendor_street_num"] = "Business street number is required for vendor profiles."
            if not vendor_street_name:
                errors["vendor_street_name"] = "Business street name is required for vendor profiles."
            if not vendor_zipcode:
                errors["vendor_zipcode"] = "Business zipcode is required for vendor profiles."
        elif vendor_zipcode and not vendor_zipcode_row:
            errors["vendor_zipcode"] = "Vendor zipcode must exist in Zipcode_Info."
        if vendor_zipcode and not vendor_zipcode_row:
            errors["vendor_zipcode"] = "Vendor zipcode must exist in Zipcode_Info."
        cleaned["vendor"] = {
            "business_name": business_name,
            "customer_service_phone_number": customer_phone,
            "street_num": vendor_street_num,
            "street_name": vendor_street_name,
            "zipcode": vendor_zipcode,
            "zipcode_row": vendor_zipcode_row,
            "has_vendor_data": has_vendor_data,
        }

    if role == "helpdesk":
        cleaned["position"] = normalize_csv_value(payload.get("position"))
        cleaned["department"] = normalize_csv_value(payload.get("department"))

    return cleaned, errors


def validate_password_change(current_password: str, new_password: str, confirm_password: str, stored_hash: str):
    errors = {}
    if not verify_password(current_password, stored_hash):
        errors["current_password"] = "Current password is incorrect."
    if new_password != confirm_password:
        errors["confirm_password"] = "New password and confirmation must match."
    if current_password and new_password and current_password == new_password:
        errors["new_password"] = "New password must be different from the current password."
    if not PASSWORD_PATTERN.fullmatch(new_password or ""):
        errors["new_password"] = (
            "Password must be at least 8 characters and include an uppercase letter, "
            "a number, and a special character."
        )
    return errors


def upsert_address(cur, address_id: str | None, street_num: str, street_name: str, zipcode: str) -> str:
    new_address_id = address_id or secrets.token_hex(16)
    cur.execute(
        """
        INSERT INTO Address (address_id, street_num, street_name, zipcode)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (address_id) DO UPDATE SET
            street_num = EXCLUDED.street_num,
            street_name = EXCLUDED.street_name,
            zipcode = EXCLUDED.zipcode
        """,
        (new_address_id, street_num, street_name, zipcode),
    )
    return new_address_id


def get_dashboard_payload(email: str, conn):
    role = get_user_role(email, conn)
    profile_context = get_profile_context(email, conn)
    dashboard = {
        "role": role,
        "email": email,
        "links": [
            {"label": "Profile", "href": "/profile"},
            {"label": "Logout", "href": "/backend/logout"},
        ],
    }
    if role == "bidder":
        dashboard["cards"] = [
            {"title": "Shopping Cart", "description": "Review current items before checkout."},
            {"title": "Auction History", "description": "Track your active and completed bids."},
            {"title": "Profile Edit", "description": "Update account and address details."},
        ]
    elif role == "seller":
        dashboard["cards"] = [
            {"title": "Banking Summary", "description": "Review masked banking information."},
            {"title": "Balance", "description": f"Current balance: {profile_context['profile'].get('balance', 0)}"},
            {"title": "Auction Management", "description": "Manage active listings and profile settings."},
        ]
    elif role == "helpdesk":
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM HelpDesk_Requests WHERE status != 'completed'")
            open_count = cur.fetchone()["count"]
            cur.execute(
                "SELECT COUNT(*) AS count FROM HelpDesk_Requests WHERE assigned_to = %s AND status != 'completed'",
                (email,),
            )
            assigned_count = cur.fetchone()["count"]
        dashboard["cards"] = [
            {"title": "Ticket Queue", "description": f"{open_count} tickets still open."},
            {"title": "Assigned To Me", "description": f"{assigned_count} tickets currently assigned."},
            {"title": "System Access", "description": "Manage support requests and staff workflows."},
        ]
    else:
        dashboard["cards"] = []
    return dashboard


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("MASTER_KEY"),
    max_age=SESSION_MAX_AGE,
    same_site="strict",
    https_only=SESSION_HTTPS_ONLY,
)


@app.get("/")
def login_page():
    return RedirectResponse(url=f"{FRONTEND_ORIGIN}/", status_code=303)


@app.post("/login")
async def login(request: Request, email: str = Form(...), password: str = Form(...)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email, password FROM Users WHERE email = %s", (email,))
            user = cur.fetchone()
            if not user or not verify_password(password, user["password"]):
                return RedirectResponse(
                    url=f"{FRONTEND_ORIGIN}/?error={quote('Invalid email or password.')}",
                    status_code=303,
                )
            role = get_user_role(email, conn)

    request.session["email"] = email
    request.session["role"] = role
    return RedirectResponse(url=f"{FRONTEND_ORIGIN}/dashboard", status_code=303)


@app.post("/api/login")
async def api_login(request: Request):
    payload = await request.json()
    email = payload.get("email", "")
    password = payload.get("password", "")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email, password FROM Users WHERE email = %s", (email,))
            user = cur.fetchone()
            if not user or not verify_password(password, user["password"]):
                return JSONResponse({"error": "Invalid email or password."}, status_code=401)
            role = get_user_role(email, conn)
    request.session["email"] = email
    request.session["role"] = role
    return {"email": email, "role": role}


@app.get("/api/session")
def api_session(request: Request):
    email = request.session.get("email")
    role = request.session.get("role")
    if not email:
        return JSONResponse({"authenticated": False}, status_code=401)
    return {"authenticated": True, "email": email, "role": role}


@app.get("/api/dashboard")
def api_dashboard(request: Request):
    email, _ = get_authenticated_user(request)
    with get_db() as conn:
        return get_dashboard_payload(email, conn)


@app.get("/api/profile")
def api_profile(request: Request):
    email, _ = get_authenticated_user(request)
    with get_db() as conn:
        profile_context = get_profile_context(email, conn)
    if not profile_context:
        return JSONResponse({"error": "Profile not found"}, status_code=404)
    return profile_context


@app.put("/api/profile")
async def api_update_profile(request: Request):
    email, role = get_authenticated_user(request)
    payload = await request.json()
    with get_db() as conn:
        profile_context = get_profile_context(email, conn)
        with conn.cursor() as cur:
            cleaned, errors = validate_profile_payload(payload, role, email, cur)
            if errors:
                return JSONResponse({"errors": errors}, status_code=400)

            if role == "bidder":
                address_id = upsert_address(
                    cur,
                    profile_context["address"]["address_id"],
                    cleaned["address"]["street_num"],
                    cleaned["address"]["street_name"],
                    cleaned["address"]["zipcode"],
                )
                cur.execute(
                    """
                    UPDATE Bidders
                    SET first_name = %s,
                        last_name = %s,
                        phone = %s,
                        age = %s,
                        major = %s,
                        annual_income = %s,
                        home_address_id = %s
                    WHERE email = %s
                    """,
                    (
                        cleaned["first_name"],
                        cleaned["last_name"],
                        cleaned["phone"],
                        cleaned["age"],
                        cleaned["major"],
                        cleaned["annual_income"],
                        address_id,
                        email,
                    ),
                )
            elif role == "seller":
                address_id = upsert_address(
                    cur,
                    profile_context["address"]["address_id"],
                    cleaned["address"]["street_num"],
                    cleaned["address"]["street_name"],
                    cleaned["address"]["zipcode"],
                )
                cur.execute(
                    """
                    UPDATE Sellers
                    SET first_name = %s,
                        last_name = %s,
                        phone = %s,
                        age = %s,
                        major = %s,
                        bank_routing_number = %s,
                        bank_account_number = %s,
                        home_address_id = %s
                    WHERE email = %s
                    """,
                    (
                        cleaned["first_name"],
                        cleaned["last_name"],
                        cleaned["phone"],
                        cleaned["age"],
                        cleaned["major"],
                        cleaned["bank_routing_number"],
                        cleaned["bank_account_number"],
                        address_id,
                        email,
                    ),
                )
                vendor_clean = cleaned.get("vendor")
                if profile_context["vendor"] or vendor_clean.get("has_vendor_data"):
                    vendor_address_id = None
                    if vendor_clean.get("has_vendor_data"):
                        existing_vendor_address = (
                            profile_context["vendor"]["address"]["address_id"]
                            if profile_context["vendor"] and profile_context["vendor"].get("address")
                            else None
                        )
                        vendor_address_id = upsert_address(
                            cur,
                            existing_vendor_address,
                            vendor_clean.get("street_num"),
                            vendor_clean.get("street_name"),
                            vendor_clean.get("zipcode"),
                        )
                    cur.execute(
                        """
                        INSERT INTO Local_Vendors (
                            email, business_name, business_address_id, customer_service_phone_number
                        )
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (email) DO UPDATE SET
                            business_name = EXCLUDED.business_name,
                            business_address_id = EXCLUDED.business_address_id,
                            customer_service_phone_number = EXCLUDED.customer_service_phone_number
                        """,
                        (
                            email,
                            vendor_clean.get("business_name"),
                            vendor_address_id,
                            vendor_clean.get("customer_service_phone_number"),
                        ),
                    )
            elif role == "helpdesk":
                cur.execute(
                    """
                    UPDATE Helpdesk
                    SET first_name = %s,
                        last_name = %s,
                        phone = %s,
                        department = %s,
                        position = %s
                    WHERE email = %s
                    """,
                    (
                        cleaned["first_name"],
                        cleaned["last_name"],
                        cleaned["phone"],
                        cleaned["department"],
                        cleaned["position"],
                        email,
                    ),
                )
        conn.commit()
        updated_profile = get_profile_context(email, conn)
    return {"success": True, "profile": updated_profile}


@app.post("/api/profile/change-password")
async def api_change_password(request: Request):
    email, _ = get_authenticated_user(request)
    payload = await request.json()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT password FROM Users WHERE email = %s", (email,))
            user = cur.fetchone()
            errors = validate_password_change(
                payload.get("current_password", ""),
                payload.get("new_password", ""),
                payload.get("confirm_password", ""),
                user["password"],
            )
            if errors:
                return JSONResponse({"errors": errors}, status_code=400)
            cur.execute(
                "UPDATE Users SET password = %s WHERE email = %s",
                (hash_password(payload["new_password"]), email),
            )
        conn.commit()
    return {"success": True}


@app.get("/api/zipcode/{zipcode}")
def api_zipcode_lookup(zipcode: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            row = get_zipcode_details(zipcode, cur)
    if not row:
        return JSONResponse({"error": "Zipcode not found"}, status_code=404)
    return row


@app.get("/api/requests")
def api_my_requests(request: Request):
    email, role = get_authenticated_user(request)
    with get_db() as conn:
        with conn.cursor() as cur:
            if role == "helpdesk":
                cur.execute(
                    """
                    SELECT * FROM HelpDesk_Requests
                    WHERE requester_email = %s OR assigned_to = %s
                    ORDER BY created_at DESC
                    """,
                    (email, email),
                )
            else:
                cur.execute(
                    "SELECT * FROM HelpDesk_Requests WHERE requester_email = %s ORDER BY created_at DESC",
                    (email,),
                )
            rows = [serialize_request_row(row) for row in cur.fetchall()]
    return {"requests": rows}


@app.post("/api/requests")
async def api_create_request(request: Request):
    email, role = get_authenticated_user(request)
    if role == "helpdesk":
        return JSONResponse({"error": "HelpDesk staff do not submit user support tickets here."}, status_code=403)
    payload = await request.json()
    request_type = normalize_csv_value(payload.get("request_type"))
    subject = normalize_csv_value(payload.get("subject"))
    description = normalize_csv_value(payload.get("description"))
    if not request_type or not subject:
        return JSONResponse({"errors": {"request_type": "Request type is required.", "subject": "Subject is required."}}, status_code=400)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO HelpDesk_Requests (
                    requester_email, request_type, subject, description, status, assigned_to
                )
                VALUES (%s, %s, %s, %s, 'unassigned', 'helpdeskteam@lsu.edu')
                RETURNING *
                """,
                (email, request_type, subject, description),
            )
            created = serialize_request_row(cur.fetchone())
        conn.commit()
    return {"success": True, "request": created}


@app.get("/api/helpdesk/tickets")
def api_helpdesk_tickets(request: Request):
    email, role = get_authenticated_user(request)
    if role != "helpdesk":
        return JSONResponse({"error": "HelpDesk access required."}, status_code=403)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM HelpDesk_Requests
                WHERE assigned_to = 'helpdeskteam@lsu.edu' AND status != 'completed'
                ORDER BY created_at ASC
                """
            )
            unassigned = [serialize_request_row(row) for row in cur.fetchall()]
            cur.execute(
                """
                SELECT * FROM HelpDesk_Requests
                WHERE assigned_to = %s AND status != 'completed'
                ORDER BY created_at ASC
                """,
                (email,),
            )
            assigned = [serialize_request_row(row) for row in cur.fetchall()]
            cur.execute(
                """
                SELECT * FROM HelpDesk_Requests
                WHERE status = 'completed'
                ORDER BY completed_at DESC NULLS LAST, created_at DESC
                LIMIT 25
                """
            )
            completed = [serialize_request_row(row) for row in cur.fetchall()]
    return {"unassigned": unassigned, "assigned": assigned, "completed": completed}


@app.post("/api/helpdesk/tickets/{request_id}/claim")
def api_claim_ticket(request_id: int, request: Request):
    email, role = get_authenticated_user(request)
    if role != "helpdesk":
        return JSONResponse({"error": "HelpDesk access required."}, status_code=403)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE HelpDesk_Requests
                SET assigned_to = %s, status = 'open'
                WHERE request_id = %s AND assigned_to = 'helpdeskteam@lsu.edu'
                RETURNING *
                """,
                (email, request_id),
            )
            row = cur.fetchone()
        conn.commit()
    if not row:
        return JSONResponse({"error": "Ticket could not be claimed."}, status_code=409)
    return {"success": True, "ticket": serialize_request_row(row)}


@app.post("/api/helpdesk/tickets/{request_id}/resolve")
def api_resolve_ticket(request_id: int, request: Request):
    email, role = get_authenticated_user(request)
    if role != "helpdesk":
        return JSONResponse({"error": "HelpDesk access required."}, status_code=403)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE HelpDesk_Requests
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                WHERE request_id = %s AND assigned_to = %s
                RETURNING *
                """,
                (request_id, email),
            )
            row = cur.fetchone()
        conn.commit()
    if not row:
        return JSONResponse({"error": "Ticket could not be resolved."}, status_code=409)
    return {"success": True, "ticket": serialize_request_row(row)}


@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url=f"{FRONTEND_ORIGIN}/", status_code=303)


@app.post("/api/logout")
async def api_logout(request: Request):
    request.session.clear()
    return {"success": True}
