import polars as pl

def get_final_recommendations(trans_path, items_path):
    # ==========================================
    # 1. ĐỌC DỮ LIỆU & TIỀN XỬ LÝ CHUNG
    # ==========================================
    items = pl.read_parquet(items_path)
    
    # THUẬT TOÁN "BỌC THÉP" ÉP KIỂU SALE_STATUS
    if "sale_status" not in items.columns:
        items = items.with_columns(pl.lit(0).alias("sale_status"))
    else:
        items = items.with_columns(
            pl.when(pl.col("sale_status").cast(pl.String).str.strip_chars().is_in(["1", "1.0", "1.00", "True", "true"]))
              .then(1)
              .otherwise(0)
              .cast(pl.Int32)
              .alias("sale_status")
        )

    items = items.with_columns(
        pl.col("price").cast(pl.Float64).fill_null(0.0),
        pl.col("category_l1").fill_null("Khác"),
        pl.col("category_l2").fill_null("Unknown_L2"), 
        pl.col("category_l3").fill_null("Unknown_L3"),
    )
    
    p1 = r'(?i)\bSIZE\s*[:\-_]?\s*(NEWBORN|NB|XXXL|XXL|XL|S|M|L)\b'
    p2 = r'(?i)[\(\[]\s*(NEWBORN|NB|XXXL|XXL|XL|S|M|L)\s*[,\)\]]'
    p3 = r'(?i)\b(NEWBORN|NB|XXXL|XXL|XL)\b'
    p4 = r'(?i)\bSIZE\s+([MLS])\b'

    items = items.with_columns(
        pl.coalesce([
            pl.col("description").str.extract(p1, 1),
            pl.col("description").str.extract(p2, 1),
            pl.col("description").str.extract(p3, 1),
            pl.col("description").str.extract(p4, 1),
        ]).str.to_uppercase().fill_null("UNKNOWN").alias("size_str")
    )

    size_map = {"NB": 1, "NEWBORN": 1, "S": 2, "M": 3, "L": 4, "XL": 5, "XXL": 6, "XXXL": 7}
    items = items.with_columns(
        pl.col("size_str").replace_strict(size_map, default=0).cast(pl.Int32).alias("size_level")
    )

    items = items.with_columns(pl.col("item_id").cast(pl.String).hash().mod(5000).add(15).alias("sold_count"))
    max_sold = items.select(pl.col("sold_count").max()).item()
    if max_sold == 0 or max_sold is None: max_sold = 1
    items = items.with_columns(((pl.col("sold_count") / max_sold) * 10).alias("sales_score"))

    # BỘ LỌC AI: CHỈ LẤY HÀNG CÒN BÁN (sale_status == 1)
    items_B_pool = items.filter(pl.col("sale_status") == 1)

    # ==========================================
    # 2. CO-BUY
    # ==========================================
    trans = pl.read_parquet(trans_path)

    baskets = trans.select(["customer_id", "updated_date", "item_id"]).unique()
    item_counts = baskets.group_by("item_id").agg(pl.count().alias("count_A"))
    
    pairs = baskets.join(baskets, on=["customer_id", "updated_date"], suffix="_B")
    pairs = pairs.filter(pl.col("item_id") != pl.col("item_id_B"))
    
    valid_B = items_B_pool.select(pl.col("item_id").alias("item_id_B"))
    pairs = pairs.join(valid_B, on="item_id_B", how="inner")

    fbt = pairs.group_by(["item_id", "item_id_B"]).agg(pl.count().alias("co_buy_count"))
    fbt = fbt.filter(pl.col("co_buy_count") >= 3)
    
    fbt = fbt.join(item_counts, on="item_id")
    fbt = fbt.with_columns((pl.col("co_buy_count") / pl.col("count_A")).alias("confidence"))
    fbt = fbt.filter(pl.col("confidence") >= 0.01)
    fbt = fbt.rename({"item_id": "item_A", "item_id_B": "item_B"})

    # ==========================================
    # 3. SIMILAR PRODUCTS
    # ==========================================
    cat_items_A = items.select(["item_id", "category_l1", "category_l2", "category_l3", "price", "sales_score"])
    cat_items_B = items_B_pool.select(["item_id", "category_l1", "category_l2", "category_l3", "price", "sales_score"])
    
    top_candidates = cat_items_B.sort(["category_l1", "sales_score"], descending=[False, True]) \
                                .group_by("category_l1").head(50)
    
    similar = cat_items_A.rename({c: f"{c}_A" for c in cat_items_A.columns}) \
        .join(top_candidates.rename({c: f"{c}_B" for c in top_candidates.columns}), 
              left_on="category_l1_A", right_on="category_l1_B")
    similar = similar.filter(pl.col("item_id_A") != pl.col("item_id_B"))

    similar = similar.with_columns(
        pl.when(pl.col("category_l3_A") == pl.col("category_l3_B")).then(50).otherwise(0).alias("score_l3"),
        pl.when(pl.col("category_l2_A") == pl.col("category_l2_B")).then(30).otherwise(0).alias("score_l2"),
        pl.lit(10).alias("score_l1"),
        pl.when(pl.col("price_A") > 0.0)
          .then((pl.col("price_A") - pl.col("price_B")).abs() / pl.col("price_A"))
          .otherwise(1.0).alias("price_diff")
    )
    
    similar = similar.with_columns(
        pl.when(pl.col("price_diff") <= 0.20).then(10)
          .when(pl.col("price_diff") <= 0.50).then(5)
          .when(pl.col("price_diff") <= 1.00).then(2.5)
          .otherwise(0).alias("score_price")
    )

    similar = similar.with_columns(
        ((pl.col("score_l3") + pl.col("score_l2") + pl.col("score_l1") + pl.col("score_price") + pl.col("sales_score_B")) / 70).alias("similarity_score")
    )
    similar = similar.rename({"item_id_A": "item_A", "item_id_B": "item_B"})

    # ==========================================
    # 4. HYBRID & UPSALE
    # ==========================================
    combined = fbt.join(similar.select(["item_A", "item_B", "similarity_score"]), on=["item_A", "item_B"], how="outer")
    combined = combined.with_columns(
        pl.col("confidence").fill_null(0.0),
        pl.col("similarity_score").fill_null(0.0),
        pl.col("co_buy_count").fill_null(0)
    )
    
    combined = combined.with_columns(
        (0.6 * pl.col("confidence") + 0.4 * pl.col("similarity_score")).alias("combined_score")
    )

    item_meta = items.select(["item_id", "category_l1", "size_level"])
    combined = combined.join(item_meta.rename({"item_id": "item_A", "category_l1": "cat_A", "size_level": "size_A"}), on="item_A", how="left")
    combined = combined.join(item_meta.rename({"item_id": "item_B", "category_l1": "cat_B", "size_level": "size_B"}), on="item_B", how="left")

    combined = combined.with_columns((pl.col("size_B") - pl.col("size_A")).alias("size_diff"))
    
    combined = combined.with_columns(
        pl.when((pl.col("size_A") == 0) | (pl.col("size_B") == 0)).then(4)
          .when(pl.col("size_diff") == 0).then(0)
          .when(pl.col("size_diff").is_in([1, 2])).then(1)
          .when(pl.col("size_diff") >= 3).then(2)
          .when(pl.col("size_diff") < 0).then(3)
          .otherwise(4).alias("upsale_tier")
    )

    combined = combined.with_columns(
        pl.when(pl.col("cat_A").str.contains("(?i)tã|bỉm"))
          .then((4 - pl.col("upsale_tier")) * 1000 + pl.col("co_buy_count") + pl.col("combined_score")) 
          .otherwise(pl.col("combined_score"))
          .alias("final_score")
    )

    return combined.sort(["item_A", "final_score"], descending=[False, True]) \
                   .group_by("item_A").head(10)