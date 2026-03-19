import polars as pl

# 1. Đường dẫn tới 2 file dữ liệu
items_path = "data/items.parquet"
transactions_path = "data/transactions-2025-12.parquet"

# 2. Đọc dữ liệu bằng Polars (Cực kỳ nhanh)
df_items = pl.read_parquet(items_path)
df_transactions = pl.read_parquet(transactions_path)

# 3. In ra 3 dòng đầu tiên và danh sách các cột để quan sát
print("=== THÔNG TIN SẢN PHẨM (ITEMS) ===")
print(df_items.head(3))
print("Các cột của Items:", df_items.columns)

print("\n=== LỊCH SỬ GIAO DỊCH (TRANSACTIONS) ===")
print(df_transactions.head(3))
print("Các cột của Transactions:", df_transactions.columns)