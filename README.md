# TỔNG HỢP PHƯƠNG PHÁP & KỸ THUẬT — HỆ THỐNG GỢI Ý SẢN PHẨM

🚀 **Trải nghiệm ngay (Live Demo):** [https://recommendation-items-system.vercel.app/](https://recommendation-items-system.vercel.app/)
⚡ **API Backend:** [https://recommendation-items-system.onrender.com/products](https://recommendation-items-system.onrender.com/products)

> **💡 Lưu ý khi test:** Hệ thống Backend được triển khai trên nền tảng miễn phí (Render Free Tier). Nếu web mất khoảng 30-50 giây để tải sản phẩm ở lần truy cập đầu tiên, xin vui lòng đợi một chút để server "thức dậy". Sau đó hệ thống AI sẽ gợi ý với tốc độ cực nhanh!

---

## 1. FREQUENTLY BOUGHT TOGETHER (Co-occurrence Analysis)

### Nguyên lý
Khai thác hành vi mua hàng thực tế: nếu nhiều khách hàng mua A và B cùng một lần thanh toán → A và B có mối liên hệ thực tiễn.

### Kỹ thuật
**Định nghĩa "Basket"**: Nhóm tất cả `item_id` có cùng `customer_id` + `updated_date` (chính xác đến millisecond) → 1 lần thanh toán.

**Xây dựng Co-occurrence Matrix**:
```text
co_occurrence[A][B] += 1  (mỗi lần A và B cùng basket)
co_occurrence[B][A] += 1  (đối xứng)
