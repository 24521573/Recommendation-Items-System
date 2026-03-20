
<img width="1024" height="108" alt="LOGO_VNA_c054066f11_7d72ba6441" src="https://github.com/user-attachments/assets/4843cbcb-a1e2-4ec4-bf32-3e3ddcb079a2" />

# CS116 - LẬP TRÌNH PYTHON CHO MÁY HỌC

# RECOMMENDATION ITEMS SYSTEM

🚀 **Trải nghiệm ngay (Live Demo):** [https://recommendation-items-system.vercel.app/](https://recommendation-items-system.vercel.app/)


⚡ **API Backend:** [https://recommendation-items-system.onrender.com/products](https://recommendation-items-system.onrender.com/products)

> **💡 Lưu ý khi test:** Hệ thống Backend được triển khai trên nền tảng miễn phí (Render Free Tier). Nếu web mất khoảng 30-50 giây để tải sản phẩm ở lần truy cập đầu tiên, xin vui lòng đợi một chút để server "thức dậy". Sau đó hệ thống AI sẽ gợi ý với tốc độ cực nhanh!


---

# I. GIỚI THIỆU MÔN HỌC 

| **Môn học** | Lập trình Python cho Máy học |
| **Mã lớp** | CS116.Q21 |
| **Giảng viên** | TS. Nguyễn Vinh Tiệp |
| **Sinh viên** | Bùi Trọng Tấn |
| **MSSV** | 24521573 |

# II. PHƯƠNG PHÁP PHÂN TÍCH
## 1. FREQUENTLY BOUGHT TOGETHER (Co-occurrence Analysis)



### Nguyên lý

Khai thác hành vi mua hàng thực tế: nếu nhiều khách hàng mua A và B cùng một lần thanh toán → A và B có mối liên hệ thực tiễn.



### Kỹ thuật

**Định nghĩa "Basket"**: Nhóm tất cả `item_id` có cùng `customer_id` + `updated_date` (chính xác đến millisecond) → 1 lần thanh toán.



**Xây dựng Co-occurrence Matrix**:

```

co_occurrence[A][B] += 1  (mỗi lần A và B cùng basket)

co_occurrence[B][A] += 1  (đối xứng)

```



**Tính Confidence**:

```

Confidence(A → B) = count(A ∩ B) / count(A)

```

> Ý nghĩa: Khi mua A, xác suất cũng mua B.



**Tham số lọc**:

- `MIN_CONFIDENCE = 0.01` — loại cặp quá yếu

- `MIN_COUNT = 3` — loại cặp xuất hiện quá ít



---



## 2. SIMILAR PRODUCTS (Content-based Filtering)



### Nguyên lý

Sản phẩm tương tự = cùng danh mục + giá tương đương. Không phụ thuộc dữ liệu giao dịch → hoạt động với cả sản phẩm mới.



### Hệ thống tính điểm (Weighted Scoring)



| Yếu tố | Điều kiện | Điểm |

|--------|-----------|------|

| Danh mục | Cùng `category_l3` | +50 |

| Danh mục | Cùng `category_l2` | +30 |

| Danh mục | Cùng `category_l1` | +10 |

| Giá | Chênh ≤ 20% | +10 |

| Giá | Chênh ≤ 50% | +5 |

| Giá | Chênh ≤ 100% | +2.5 |

| Sale status | Tỷ lệ bán cao | +10 (normalized) |



**Chuẩn hóa**: `similarity_score = tổng_điểm / 70`



**Tối ưu candidate pool**: Ưu tiên lấy candidates từ `category_l3`, mở rộng ra `l2` nếu không đủ số lượng.



---



## 3. COMBINED RECOMMENDATIONS (Hybrid Approach)



### Nguyên lý

Kết hợp cả 2 nguồn thành **1 danh sách duy nhất**, tận dụng ưu điểm của cả 2 phương pháp.



### Công thức gộp (sản phẩm thường)

```

combined_score = 0.6 × confidence + 0.4 × similarity_score

```

- Nếu chỉ có co-bought: `0.6 × confidence`

- Nếu chỉ có similar: `0.4 × similarity_score`

- Nếu có cả hai: cộng đủ cả hai thành phần



### Sắp xếp

Giảm dần theo `combined_score`.



---



## 4. UPSALE LOGIC (Đặc thù Tã)



### Nguyên lý

Với sản phẩm tã lót (`category_l1 == "Tã"`), thứ tự size phản ánh sự phát triển của bé → gợi ý size phù hợp/lớn hơn giúp tăng doanh thu lâu dài.



### Thứ tự size

```

NB → S → M → L → XL → XXL → XXXL

```



### Upsale Tier

| Tier | Điều kiện | Ý nghĩa |

|------|-----------|---------|

| 0 | `size_target == size_source` | Cùng size → ưu tiên #1 |

| 1 | Lớn hơn 1–2 bậc | Upsell tốt nhất → ưu tiên #2 |

| 2 | Lớn hơn 3+ bậc | Upsell xa → ưu tiên #3 |

| 3 | Nhỏ hơn | Ít ưu tiên → cuối danh sách |

| 4 | Không xác định | Trung tính |



### Sắp xếp 2 tầng (chỉ cho Tã)

```

Tầng 1: Upsale tier tăng dần (0 tốt nhất)

Tầng 2: co_buy_count giảm dần (trong cùng tier)

```



---



## 5. SIZE EXTRACTION FROM DESCRIPTION (NLP/Regex)



### Vấn đề

Trường `size` trong data còn trống với nhiều sản phẩm, nhưng `description` thường chứa thông tin size ở nhiều dạng khác nhau.



### Chiến lược Regex (ưu tiên từ trên xuống)



```python

# Pattern 1 — có từ khóa "size" đứng trước (bắt S/M/L an toàn)

r'\bSIZE\s*[:\-_]?\s*(NEWBORN|NB|XXXL|XXL|XL|S|M|L)\b'



# Pattern 2 — trong ngoặc tròn/vuông: "(XL, 36 chiếc)", "[L]"

r'[\(\[]\s*(NEWBORN|NB|XXXL|XXL|XL|S|M|L)\s*[,\)\]]'



# Pattern 3 — XL/XXL/XXXL/NB đứng độc lập (ít nhầm lẫn hơn S/M/L)

r'(?<!\w)(NEWBORN|NB|XXXL|XXL|XL)(?!\w)'



# Pattern 4 — S/M/L chỉ khi có "size" đứng trước

r'\bSIZE\s+([MLS])\b'

```



> **Lý do thiết kế**: S/M/L đơn lẻ dễ nhầm với chữ cái trong từ tiếng Việt (Sữa, Samsung...) → chỉ bắt khi có từ khoá "size" xác nhận. XL/XXL/XXXL/NB ít gây nhầm lẫn hơn nên bắt rộng hơn.



**Kết quả**: 478/29,823 sản phẩm được điền size từ description (19/19 test cases passed).



---













## 6. THAM SỐ QUAN TRỌNG



| Tham số | Giá trị | Ý nghĩa |

|---------|---------|---------|

| `TOP_K_COMBINED` | 10 | Số gợi ý tối đa mỗi sản phẩm |

| `MIN_CONFIDENCE` | 0.01 | Ngưỡng confidence tối thiểu |

| `MIN_COUNT` | 3 | Số lần co-buy tối thiểu |

| `WEIGHT_CO_BUY` | 0.6 | Trọng số confidence trong combined score |

| `WEIGHT_SIMILAR` | 0.4 | Trọng số similarity trong combined score |

| `WEIGHT_CATEGORY_L3` | 50 | Điểm cùng category L3 |

| `WEIGHT_PRICE` | 10 | Điểm tương đồng giá |

| `SIZE_ORDER` | NB→XXXL | Thứ tự size cho logic upsale |

| `UPSALE_CATEGORY` | "Tã" | Category áp dụng upsale |

# III. CẤU TRÚC DỰ ÁN
RECOMMENDATION-SYSTEM/
├── .vscode/
│   └── settings.json
├── backend/
│   ├── __pycache__/
│   ├── data/
│   ├── venv/
│   ├── eda.py
│   ├── main.py
│   └── recommendation.py
├── frontend/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   └── tailwind.config.js
└── KY THUAT XU LY.md
