import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Package, Sparkles, ArrowLeft, Search, Filter, ChevronLeft, ChevronRight, Tag, Factory, FileText, Ruler, TrendingUp, Medal } from 'lucide-react';
import axios from 'axios';

function App() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatL1, setSelectedCatL1] = useState("All");
  const [stockFilter, setStockFilter] = useState("All"); 
  const [sortOrder, setSortOrder] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    axios.get('https://recommendation-items-system.onrender.com/products')
      .then((res) => setProducts(res.data.products))
      .catch((err) => console.error(err));
  }, []);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setRecommendations([]); 
    setLoadingRecs(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    axios.get(`https://recommendation-items-system.onrender.com/recommend/item/${product.item_id}`)
      .then((res) => {
        setRecommendations(res.data.recommendations);
        setLoadingRecs(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingRecs(false);
      });
  };

  const uniqueCatL1 = ["All", ...new Set(products.map(p => p.category_l1))];

  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchSearch = p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCatL1 === "All" || p.category_l1 === selectedCatL1;
      
      // LOGIC CHUẨN: = 1 là Còn hàng, khác 1 là Hết hàng
      const matchStock = stockFilter === "All" 
        ? true 
        : stockFilter === "InStock" 
          ? p.sale_status === 1 
          : p.sale_status !== 1; 

      return matchSearch && matchCat && matchStock;
    });

    if (sortOrder === "asc") result.sort((a, b) => a.price - b.price);
    if (sortOrder === "desc") result.sort((a, b) => b.price - a.price);

    return result;
  }, [products, searchQuery, selectedCatL1, stockFilter, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCatL1, stockFilter, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE) || 1;
  const currentProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-[#fdf8f5] font-sans pb-10">
      <header className="bg-orange-500 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer hover:text-orange-100 transition" onClick={() => setSelectedProduct(null)}>
            <ShoppingCart size={32} className="drop-shadow-md" />
            <div className="hidden md:block">
              <h1 className="text-xl md:text-2xl font-bold leading-tight drop-shadow-md">Recommendation System</h1>
              <p className="text-sm font-medium text-orange-100 drop-shadow-sm">Bui Trong Tan - UIT</p>
            </div>
          </div>
          
          {!selectedProduct && (
            <div className="relative w-full md:w-1/3 ml-4">
              <input 
                type="text" 
                placeholder="Tìm kiếm sản phẩm..." 
                className="w-full px-4 py-2 rounded-full text-gray-800 outline-none focus:ring-2 focus:ring-orange-300 shadow-inner border border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute right-3 top-2 text-gray-400" size={20}/>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto p-4 mt-6">
        
        {selectedProduct ? (
          /* TRANG CHI TIẾT SẢN PHẨM */
          <div>
            <button onClick={() => setSelectedProduct(null)} className="mb-6 flex items-center gap-2 text-orange-500 font-bold hover:text-orange-700 transition bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
              <ArrowLeft size={20} /> Quay lại danh sách
            </button>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-10 md:flex gap-10">
              <div className="bg-orange-50/60 relative w-full md:w-72 h-72 rounded-xl flex items-center justify-center text-orange-300 shrink-0 mb-6 md:mb-0 shadow-inner border border-orange-100">
                <Package size={100} className="drop-shadow-sm" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 text-orange-600 font-bold uppercase text-sm drop-shadow-sm">
                    <Medal size={18} /> {selectedProduct.brand}
                  </div>
                  {/* BADGE CẬP NHẬT THEO LOGIC MỚI: 1 là Còn hàng */}
                  {selectedProduct.sale_status === 1 ? (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded border border-green-200 ml-2 shadow-sm">Còn hàng</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded border border-gray-200 ml-2 shadow-sm">Hết hàng</span>
                  )}
                </div>
                
                <h2 className="text-3xl font-bold text-gray-800 mb-6 leading-tight drop-shadow-sm">{selectedProduct.category}</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <Tag className="text-orange-500" size={20} />
                    <span className="text-sm font-medium text-gray-700">Mã: {selectedProduct.item_id}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <Ruler className="text-orange-500" size={20} />
                    <span className="text-sm font-medium text-gray-700">Size: {selectedProduct.size}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <Factory className="text-gray-500" size={20} />
                    <span className="text-sm font-medium text-gray-700 line-clamp-1" title={selectedProduct.manufacturer}>NSX: {selectedProduct.manufacturer}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-100">
                    <TrendingUp className="text-green-600" size={20} />
                    <span className="text-sm font-bold text-green-700">Đã bán: {selectedProduct.sold_count}</span>
                  </div>
                </div>

                <div className="mb-6 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-2 text-orange-700 font-bold mb-2 drop-shadow-sm">
                    <FileText size={18} /> Mô tả sản phẩm
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedProduct.description}
                  </p>
                </div>

                <p className={`text-4xl font-black drop-shadow-md ${selectedProduct.sale_status === 1 ? 'text-red-500' : 'text-gray-400 line-through'}`}>
                  {selectedProduct.price.toLocaleString()} VNĐ
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-orange-600 drop-shadow-sm">
                <Sparkles size={28} className="animate-pulse" />
                <h3 className="text-2xl font-bold">Gợi ý cho bạn</h3>
              </div>
              
              {loadingRecs ? (
                <p className="text-orange-500 font-medium flex items-center gap-2">⏳ AI đang phân tích dữ liệu...</p>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {recommendations.map((item) => (
                    <div key={item.item_id} onClick={() => handleProductClick(item)} className="bg-white p-3 rounded-xl shadow border border-orange-200 hover:-translate-y-2 hover:shadow-md hover:border-orange-400 transition-all cursor-pointer">
                      <div className="relative bg-orange-50/80 w-full h-32 rounded-lg flex items-center justify-center mb-3 text-orange-300 border border-orange-100">
                        <span className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">Còn hàng</span>
                        <Package size={40} className="drop-shadow-sm" />
                      </div>
                      <p className="text-xs text-orange-500 font-bold truncate mb-1 drop-shadow-sm">{item.brand}</p>
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2 drop-shadow-sm">{item.category}</p>
                      <p className="text-sm font-black text-red-500 mb-2 drop-shadow-sm">{item.price.toLocaleString()} đ</p>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 bg-gray-50 p-1.5 rounded">
                        <span>Size: {item.size}</span>
                        <span className="text-orange-600 font-bold flex items-center gap-1"><Sparkles size={10}/> {item.final_score.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-dashed border-orange-300 text-center">
                  <p className="text-gray-500">Trống.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TRANG CHỦ: DANH SÁCH SẢN PHẨM */
          <div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter size={20} className="text-orange-500 drop-shadow-sm"/>
                <select 
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-400 block w-full p-2.5 outline-none cursor-pointer"
                  value={selectedCatL1}
                  onChange={(e) => setSelectedCatL1(e.target.value)}
                >
                  {uniqueCatL1.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat === "All" ? "Tất cả danh mục" : cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Package size={20} className="text-green-500 drop-shadow-sm"/>
                <select 
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-400 block w-full p-2.5 outline-none cursor-pointer"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                >
                  <option value="All">Trạng thái tồn kho</option>
                  <option value="InStock">Còn hàng</option>
                  <option value="OutOfStock">Hết hàng</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-sm text-gray-600 font-bold whitespace-nowrap">Sắp xếp:</span>
                <select 
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-400 block w-full p-2.5 outline-none cursor-pointer"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="">Ngẫu nhiên</option>
                  <option value="asc">Giá: Thấp đến Cao</option>
                  <option value="desc">Giá: Cao đến Thấp</option>
                </select>
              </div>
            </div>

            {currentProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
                  {currentProducts.map((item) => (
                    <div key={item.item_id} onClick={() => handleProductClick(item)} className={`bg-white p-5 rounded-2xl shadow-sm border hover:shadow-md transition-all cursor-pointer flex flex-col group ${item.sale_status === 1 ? 'border-gray-200 hover:border-orange-400' : 'border-gray-200 opacity-80 hover:border-gray-400'}`}>
                      <div className="relative bg-orange-50/60 w-full h-48 rounded-xl flex items-center justify-center mb-4 text-orange-300 group-hover:bg-orange-100 transition-colors border border-orange-50">
                        {item.sale_status === 1 ? (
                          <span className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">Còn hàng</span>
                        ) : (
                          <span className="absolute top-3 right-3 bg-gray-400 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">Hết hàng</span>
                        )}
                        <Package size={64} className="drop-shadow-sm" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-bold uppercase mb-2 flex items-center gap-1 drop-shadow-sm ${item.sale_status === 1 ? 'text-orange-500' : 'text-gray-500'}`}><Medal size={12}/> {item.brand}</p>
                        <h3 className={`text-base font-bold line-clamp-2 mb-3 transition-colors drop-shadow-sm ${item.sale_status === 1 ? 'text-gray-800 group-hover:text-orange-600' : 'text-gray-600'}`}>{item.category}</h3>
                        <div className="flex items-center gap-3 mb-4 text-xs font-medium">
                          <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded flex items-center gap-1 shadow-sm"><Ruler size={12}/> Size: {item.size}</span>
                          <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded flex items-center gap-1 shadow-sm"><TrendingUp size={12}/> Đã bán: {item.sold_count}</span>
                        </div>
                      </div>
                      <div className="mt-auto pt-4 border-t border-dashed border-gray-200">
                        <p className={`text-xl font-black drop-shadow-md ${item.sale_status === 1 ? 'text-red-500' : 'text-gray-400 line-through'}`}>{item.price.toLocaleString()} VNĐ</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center items-center gap-2 mt-10">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-2 rounded-lg bg-white border border-gray-300 shadow-sm disabled:opacity-50 hover:bg-orange-50 hover:text-orange-600 transition"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' ? setCurrentPage(page) : null}
                      className={`w-10 h-10 rounded-lg font-bold flex items-center justify-center border transition-all drop-shadow-sm ${
                        currentPage === page 
                          ? 'bg-orange-500 text-white border-orange-500 shadow-md transform scale-105' 
                          : page === '...' 
                            ? 'bg-transparent border-none text-gray-400 cursor-default shadow-none'
                            : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 border-gray-300 shadow-sm'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-2 rounded-lg bg-white border border-gray-300 shadow-sm disabled:opacity-50 hover:bg-orange-50 hover:text-orange-600 transition"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-24 bg-white rounded-2xl shadow-sm border border-gray-200">
                <Search size={64} className="mx-auto text-gray-300 mb-6 drop-shadow-sm"/>
                <p className="text-2xl font-bold text-gray-600 mb-2 drop-shadow-sm">Không tìm thấy sản phẩm nào</p>
                <p className="text-gray-500 drop-shadow-sm">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc nhé!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;