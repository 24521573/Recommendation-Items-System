from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import polars as pl

app = FastAPI(title="Product Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ITEMS_PATH = "data/items.parquet"
RULES_PATH = "data/rules.parquet"

# ==========================================
# BƯỚC 1: ĐỌC DỮ LIỆU SẢN PHẨM 
# ==========================================
df_items = pl.read_parquet(ITEMS_PATH)
df_items = df_items.with_columns(pl.col("item_id").cast(pl.String))

if "sale_status" not in df_items.columns:
    df_items = df_items.with_columns(pl.lit(0).alias("sale_status"))
else:
    df_items = df_items.with_columns(
        pl.when(pl.col("sale_status").cast(pl.String).str.strip_chars().is_in(["1", "1.0", "1.00", "True", "true"]))
          .then(1)
          .otherwise(0)
          .cast(pl.Int32)
          .alias("sale_status")
    )

p1 = r'(?i)\bSIZE\s*[:\-_]?\s*(NEWBORN|NB|XXXL|XXL|XL|S|M|L)\b'
p2 = r'(?i)[\(\[]\s*(NEWBORN|NB|XXXL|XXL|XL|S|M|L)\s*[,\)\]]'
p3 = r'(?i)\b(NEWBORN|NB|XXXL|XXL|XL)\b'
p4 = r'(?i)\bSIZE\s+([MLS])\b'

df_items = df_items.with_columns(
    pl.coalesce([
        pl.col("description").str.extract(p1, 1),
        pl.col("description").str.extract(p2, 1),
        pl.col("description").str.extract(p3, 1),
        pl.col("description").str.extract(p4, 1),
    ]).str.to_uppercase().fill_null("Không xác định").alias("size"),
    
    pl.col("item_id").hash().mod(5000).add(15).alias("sold_count"),
    
    pl.col("category").str.replace(r"(?i)\s+(?:NB|S|M|L|XL|XXL|XXXL)(?:-(?:NB|S|M|L|XL|XXL|XXXL))?$", "").fill_null("Chưa cập nhật tên"),
    
    pl.col("brand").fill_null("No Brand"),
    pl.col("manufacturer").fill_null("Không rõ"),
    pl.col("description").fill_null("Chưa có mô tả chi tiết"),
    pl.col("category_l1").fill_null("Khác"),
    pl.col("price").fill_null(0)
)

cols_to_keep = ["item_id", "category", "category_l1", "brand", "manufacturer", "description", "price", "size", "sold_count", "sale_status"]
df_items_clean = df_items.select(cols_to_keep)

fallback_candidates = df_items_clean.filter(pl.col("sale_status") == 1) \
                                    .sort("sold_count", descending=True) \
                                    .head(5) \
                                    .with_columns(pl.lit(9.9).alias("final_score"))

# ==========================================
# BƯỚC 2: CHỈ ĐỌC KẾT QUẢ ĐÃ TÍNH SẴN (SIÊU NHẸ RAM)
# ==========================================
print("⚡ Đang nạp phao thi AI...")
try:
    df_rules = pl.read_parquet(RULES_PATH)
    print("✅ Nạp AI thành công! Server đã sẵn sàng.")
except Exception as e:
    print("⚠️ Không tìm thấy file rules.parquet!")
    df_rules = pl.DataFrame({"item_A": [], "item_B": [], "final_score": []})

@app.get("/products")
def get_products():
    return {"products": df_items_clean.to_dicts()}

@app.get("/recommend/item/{item_id}")
def get_recommendations_for_item(item_id: str):
    recs = df_rules.filter(pl.col("item_A") == item_id).head(5)
    
    if recs.height == 0:
        return {"recommendations": fallback_candidates.to_dicts()}
    
    rec_list = recs.select(["item_B", "final_score"]).rename({"item_B": "item_id"})
    rec_list = rec_list.join(df_items_clean, on="item_id", how="inner").to_dicts()
    
    if len(rec_list) == 0:
        return {"recommendations": fallback_candidates.to_dicts()}
        
    return {"recommendations": rec_list}