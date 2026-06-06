import pandas as pd
# pyrefly: ignore [missing-import]
import yfinance as yf
import time
import os
from dotenv import load_dotenv
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy import text

# Convert 'YYYY-MM-DD' to UNIX timestamp
def date_to_unix(date_str):
    return int(time.mktime(time.strptime(date_str, "%Y-%m-%d")))

# Convert UNIX timestamp back to YYYY-MM-DD
def unix_to_date(timestamp):
    return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d')

# Get current date
current_date = datetime.now().strftime('%Y-%m-%d')

# Define date range
start_date = '2023-07-01'
period1 = date_to_unix(start_date)
period2 = date_to_unix(current_date)

# Convert timestamps back to dates for yfinance
start_date_yf = unix_to_date(period1)
end_date_yf = unix_to_date(period2)

# Read trackers.csv
file_path = '../trackers.csv'
symbols_df = pd.read_csv(file_path)
trackers = symbols_df[['Symbol', 'Type']].to_dict(orient='records')

# Store all downloaded data
data_frames = []
for tracker in trackers:
    symbol = tracker['Symbol']
    type_of_asset = tracker['Type']
    try:
        df = yf.download(
            symbol,
            start=start_date_yf,
            end=end_date_yf,
            progress=False,
            auto_adjust=False
        )
        if df.empty:
            print(f"No data found for {symbol}")
            continue
        
        # FIX: Flatten MultiIndex columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
            
        df = df.reset_index()
        df['Symbol'] = symbol
        df['Type'] = type_of_asset
        
        # Keep only required columns
        required_cols = [
            'Symbol',
            'Type',
            'Date',
            'Open',
            'High',
            'Low',
            'Close',
            'Adj Close',
            'Volume'
        ]
        
        available_cols = [c for c in required_cols if c in df.columns]
        df = df[available_cols]
        data_frames.append(df)
        print(f"Data for {symbol} downloaded successfully.")
    except Exception as e:
        print(f"Failed to download data for {symbol}: {e}")

# Combine all data
if len(data_frames) == 0:
    raise Exception("No data downloaded. Check symbols or internet connection.")
combined_data = pd.concat(data_frames, ignore_index=True)

print("Data fetched. Proceeding to save to MySQL.")

# Load environment variables from root .env
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

# Connect to MySQL Database
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT")

# Create a connection engine without a specific database to create the database if it doesn't exist
engine_creation = create_engine(f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/")
with engine_creation.connect() as conn:
    conn.execute(text("CREATE DATABASE IF NOT EXISTS market_db"))

# Create engine for the market_db
engine = create_engine(f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/market_db")

# Save to database
combined_data.to_sql('market_data', con=engine, if_exists='replace', index=False)
symbols_df.to_sql('trackers', con=engine, if_exists='replace', index=False)

print("Data saved to database `market_db` successfully.")
