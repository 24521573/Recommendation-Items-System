import polars as pl
from recommendation import get_final_recommendations

ITEMS_PATH = "data/items.parquet"
TRANS_PATH = "data/transactions-2025-12.parquet"
RULES_PATH = "data/rules.parquet"

print("🧠 Đang dùng máy tính của Tấn để tính toán AI...")
df_rules = get_final_recommendations(TRANS_PATH, ITEMS_PATH)

# Ép kiểu an toàn trước khi lưu
df_rules = df_rules.with_columns(
    pl.col("item_A").cast(pl.String),
    pl.col("item_B").cast(pl.String)
)

# Lưu kết quả ra file
df_rules.write_parquet(RULES_PATH)
print(f"✅ Đã lưu kết quả siêu nhẹ vào {RULES_PATH}!")