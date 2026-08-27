"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string;
  description: string;
  in_stock: boolean;
  original_price: number | null;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();

  // State Management
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // 'all' | 'in_stock' | 'out_of_stock'

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);
  
  // Delete confirm modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Add/Edit Form fields state
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("rings");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formInStock, setFormInStock] = useState(true);

  // Bulk Discount Panel State
  const [discountCategory, setDiscountCategory] = useState("all");
  const [discountPercent, setDiscountPercent] = useState("");

  // Auto-clear notification after 5s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fetch products on load
  const fetchProducts = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      if (res.ok && data.products) {
        setProducts(data.products);
      } else {
        showNotification(data.error || "Failed to retrieve products.", true);
      }
    } catch (err) {
      console.error("Fetch products error:", err);
      showNotification("Could not communicate with server.", true);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Utility to trigger toast notifications
  const showNotification = (message: string, isError = false) => {
    setNotification({ message, isError });
  };

  // Google Drive File ID parser for live preview
  const parsedDriveId = useMemo(() => {
    if (!formImageUrl) return null;
    const url = formImageUrl.trim();
    
    // Check sharing URL format
    const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]{25,50})[/\?]?/);
    if (fileDMatch && fileDMatch[1]) return fileDMatch[1];
    
    // Check query ID format
    const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{25,50})/);
    if (queryMatch && queryMatch[1]) return queryMatch[1];
    
    // Check if it's already just the file ID
    if (url.match(/^[a-zA-Z0-9_-]{25,50}$/)) return url;
    
    // Check if it is a thumbnail link and pull the ID
    if (url.startsWith("https://drive.google.com/thumbnail")) {
      const thumbMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{25,50})/);
      if (thumbMatch && thumbMatch[1]) return thumbMatch[1];
    }
    
    return null;
  }, [formImageUrl]);

  // Live preview image URL construction
  const formPreviewUrl = useMemo(() => {
    if (parsedDriveId) {
      return `https://drive.google.com/thumbnail?id=${parsedDriveId}&sz=w1000`;
    }
    // Return direct thumbnail if they pasted it directly
    if (formImageUrl.trim().startsWith("https://drive.google.com/thumbnail")) {
      return formImageUrl.trim();
    }
    return "";
  }, [parsedDriveId, formImageUrl]);

  // Logout request
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      } else {
        showNotification("Logout failed.", true);
      }
    } catch (err) {
      console.error("Logout error:", err);
      showNotification("Error during logout.", true);
    }
  };

  // Quick Stock Status toggle directly on catalog cards
  const handleToggleStock = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card events
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_stock: !product.in_stock }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Optimistic / Local update
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, in_stock: !p.in_stock } : p))
        );
        showNotification(`Updated '${product.name}' status.`);
      } else {
        showNotification(data.error || "Failed to update stock.", true);
      }
    } catch (err) {
      console.error("Quick toggle stock error:", err);
      showNotification("Network error updating status.", true);
    } finally {
      setLoading(false);
    }
  };

  // Open Form modal in Add Mode
  const openAddModal = () => {
    setFormMode("add");
    setCurrentProductId(null);
    setFormName("");
    setFormPrice("");
    setFormCategory("rings");
    setFormImageUrl("");
    setFormDescription("");
    setFormInStock(true);
    setShowFormModal(true);
  };

  // Open Form modal in Edit Mode
  const openEditModal = (product: Product) => {
    setFormMode("edit");
    setCurrentProductId(product.id);
    setFormName(product.name);
    // If it currently has a discount, show original pre-discount price in edit form
    const editPrice = product.original_price !== null ? product.original_price : product.price;
    setFormPrice(editPrice.toString());
    setFormCategory(product.category);
    // Display the URL input cleanly (convert thumbnail back to direct preview link, or keep as is)
    setFormImageUrl(product.image_url);
    setFormDescription(product.description || "");
    setFormInStock(product.in_stock);
    setShowFormModal(true);
  };

  // Open Delete confirmation dialog
  const openDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  // Submit Add / Edit Form
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice || !formImageUrl) {
      showNotification("Please fill in all required fields.", true);
      return;
    }
    
    setLoading(true);
    const payload = {
      name: formName,
      price: parseFloat(formPrice),
      category: formCategory,
      image_url: formImageUrl,
      description: formDescription,
      in_stock: formInStock,
    };

    try {
      let res;
      if (formMode === "add") {
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/products/${currentProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(formMode === "add" ? "Product added successfully!" : "Product updated successfully!");
        setShowFormModal(false);
        fetchProducts(); // Refresh list
      } else {
        showNotification(data.error || "Save operation failed.", true);
      }
    } catch (err) {
      console.error("Save product error:", err);
      showNotification("Error communicating with database.", true);
    } finally {
      setLoading(false);
    }
  };

  // Delete product action
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, { method: "DELETE" });
      const data = await res.json();

      if (res.ok && data.success) {
        showNotification(`Deleted product '${productToDelete.name}'.`);
        setShowDeleteModal(false);
        setProductToDelete(null);
        fetchProducts(); // Refresh list
      } else {
        showNotification(data.error || "Delete operation failed.", true);
      }
    } catch (err) {
      console.error("Delete error:", err);
      showNotification("Error deleting product.", true);
    } finally {
      setLoading(false);
    }
  };

  // Apply Bulk Discount Action
  const handleApplyDiscount = async () => {
    const percent = parseFloat(discountPercent);
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      showNotification("Discount percent must be between 1 and 100.", true);
      return;
    }

    const categoryText = discountCategory === "all" ? "all categories" : `${discountCategory}`;
    if (!confirm(`Are you sure you want to apply a ${percent}% discount to ${categoryText}?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          category: discountCategory,
          value: percent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message);
        setDiscountPercent("");
        fetchProducts(); // Refresh
      } else {
        showNotification(data.error || "Failed to apply bulk discount.", true);
      }
    } catch (err) {
      console.error("Apply discount error:", err);
      showNotification("Network error applying discount.", true);
    } finally {
      setLoading(false);
    }
  };

  // Clear Bulk Discount Action
  const handleClearDiscount = async () => {
    const categoryText = discountCategory === "all" ? "all categories" : `${discountCategory}`;
    if (!confirm(`Are you sure you want to clear active discounts and restore prices for ${categoryText}?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear",
          category: discountCategory,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message);
        fetchProducts(); // Refresh
      } else {
        showNotification(data.error || "Failed to clear discount.", true);
      }
    } catch (err) {
      console.error("Clear discount error:", err);
      showNotification("Network error clearing discount.", true);
    } finally {
      setLoading(false);
    }
  };

  // Compute counts for categories (sidebar view)
  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = { all: products.length, rings: 0, neckpieces: 0, bracelets: 0, earrings: 0 };
    products.forEach((p) => {
      if (counts[p.category.toLowerCase()] !== undefined) {
        counts[p.category.toLowerCase()]++;
      }
    });
    return counts;
  }, [products]);

  // Compute list filters dynamically
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Search filter
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Category filter
      const matchesCategory =
        selectedCategory === "all" || product.category.toLowerCase() === selectedCategory.toLowerCase();
        
      // 3. Stock filter
      let matchesStock = true;
      if (stockFilter === "in_stock") matchesStock = product.in_stock;
      if (stockFilter === "out_of_stock") matchesStock = !product.in_stock;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  return (
    <div className={styles.layout}>
      {/* Top Header Navigation */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>Aarisha</h1>
          <span className={styles.badge}>Admin Panel</span>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Log Out
          </button>
        </div>
      </header>

      {/* Main Panel Content Area */}
      <div className={styles.mainContainer}>
        {/* Sidebar Filtering Controls */}
        <aside className={styles.sidebar}>
          {/* Search */}
          <div className={styles.sidebarSection}>
            <span className={styles.sectionTitle}>Search Catalog</span>
            <div className={styles.searchWrapper}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.searchIcon}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className={styles.sidebarSection}>
            <span className={styles.sectionTitle}>Filter by Category</span>
            <ul className={styles.categoryList}>
              {["all", "rings", "neckpieces", "bracelets", "earrings"].map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => setSelectedCategory(cat)}
                    className={selectedCategory === cat ? styles.categoryBtnActive : styles.categoryBtn}
                  >
                    <span style={{ textTransform: "capitalize" }}>{cat}</span>
                    <span className={styles.categoryCount}>{categoryCounts[cat] || 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Stock Filter Option */}
          <div className={styles.sidebarSection}>
            <span className={styles.sectionTitle}>Stock Status</span>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className={styles.selectInput}
            >
              <option value="all">Show All Items</option>
              <option value="in_stock">In Stock Only</option>
              <option value="out_of_stock">Out of Stock Only</option>
            </select>
          </div>

          {/* Bulk Discounts Portal */}
          <div className={styles.sidebarSection}>
            <span className={styles.sectionTitle}>Bulk Discount Portal</span>
            <div className={styles.discountBox}>
              <label className={styles.formLabel}>Target Category</label>
              <select
                value={discountCategory}
                onChange={(e) => setDiscountCategory(e.target.value)}
                className={styles.selectInput}
                style={{ fontSize: "0.8rem", padding: "6px" }}
              >
                <option value="all">All Products</option>
                <option value="rings">Rings</option>
                <option value="neckpieces">Neckpieces</option>
                <option value="bracelets">Bracelets</option>
                <option value="earrings">Earrings</option>
              </select>
              
              <label className={styles.formLabel}>Discount Rate (%)</label>
              <div className={styles.discountInputRow}>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="15"
                  className={styles.discountInput}
                  disabled={loading}
                  min="1"
                  max="100"
                />
                <button
                  onClick={handleApplyDiscount}
                  className={styles.applyDiscountBtn}
                  disabled={loading || !discountPercent}
                >
                  Apply
                </button>
              </div>
              <button
                onClick={handleClearDiscount}
                className={styles.clearDiscountBtn}
                disabled={loading}
              >
                Clear Category Discounts
              </button>
            </div>
          </div>
        </aside>

        {/* Dashboard Main Workspace */}
        <main className={styles.contentArea}>
          {/* Toast / Banner Feedback */}
          {notification && (
            <div
              className={notification.isError ? styles.notificationError : styles.notification}
              role="alert"
            >
              <span>{notification.message}</span>
              <button onClick={() => setNotification(null)} className={styles.notificationClose}>
                &times;
              </button>
            </div>
          )}

          {/* Sub-header controls */}
          <section className={styles.contentHeader}>
            <div className={styles.contentTitleBlock}>
              <h2 className={styles.contentTitle}>
                {selectedCategory === "all" ? "All Products" : selectedCategory}
              </h2>
              <span className={styles.contentSubtitle}>
                Showing {filteredProducts.length} of {products.length} items in inventory
              </span>
            </div>
            <button onClick={openAddModal} className={styles.addProductBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Product
            </button>
          </section>

          {/* Inventory Catalog Grid */}
          {fetching ? (
            <div style={{ textAlign: "center", padding: "100px 0" }}>
              <div className={styles.spinner} style={{ margin: "0 auto 20px", width: "32px", height: "32px" }} />
              <p style={{ color: "var(--text-secondary)" }}>Accessing Supabase database...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <h3 className={styles.emptyTitle}>No Jewelry Items Found</h3>
              <p>Try clearing filters or click "Add Product" to create one.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredProducts.map((product) => {
                const originalPriceVal = product.original_price !== null ? Number(product.original_price) : Number(product.price);
                const currentPriceVal = Number(product.price);
                const isDiscounted = originalPriceVal > currentPriceVal;
                const discountRate = isDiscounted
                  ? Math.round(((originalPriceVal - currentPriceVal) / originalPriceVal) * 100)
                  : 0;

                return (
                  <article key={product.id} className={styles.card}>
                    {/* Image Area */}
                    <div className={styles.imageWrapper}>
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className={styles.productImage}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // Fallback placeholder image if Drive link is broken/restricted
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23a39b94' stroke-width='1'><rect width='20' height='20' x='2' y='2' rx='2'/><circle cx='12' cy='12' r='4'/></svg>";
                        }}
                      />
                      <span className={styles.categoryTag}>{product.category}</span>
                      
                      {/* Stock Badge */}
                      <span className={product.in_stock ? styles.stockIn : styles.stockOut}>
                        {product.in_stock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>

                    {/* Description Area */}
                    <div className={styles.cardContent}>
                      <h3 className={product.name}>{product.name}</h3>
                      <p className={styles.productDescription}>
                        {product.description || "No description provided."}
                      </p>
                      
                      {/* Pricing Section */}
                      <div className={styles.priceSection}>
                        <span className={styles.priceCurrent}>₹{product.price}</span>
                        {isDiscounted && (
                          <>
                            <span className={styles.priceOriginal}>₹{product.original_price}</span>
                            <span className={styles.discountBadge}>{discountRate}% OFF</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stock Quick Toggle on Card */}
                    <button
                      onClick={(e) => handleToggleStock(product, e)}
                      className={styles.quickStockToggle}
                      disabled={loading}
                    >
                      Mark {product.in_stock ? "Out of Stock" : "In Stock"}
                    </button>

                    {/* Edit/Delete Controls */}
                    <div className={styles.cardActions}>
                      <button
                        onClick={() => openEditModal(product)}
                        className={`${styles.actionBtn} ${styles.actionEdit} ${styles.actionBtnSeparation}`}
                        disabled={loading}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(product)}
                        className={`${styles.actionBtn} ${styles.actionDelete}`}
                        disabled={loading}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Form Modal Dialog */}
      {showFormModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {formMode === "add" ? "Add New Jewelry Piece" : "Edit Jewelry Details"}
              </h3>
              <button onClick={() => setShowFormModal(false)} className={styles.modalClose}>
                &times;
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSaveProduct}>
              <div className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label htmlFor="prod-name" className={styles.formLabel}>Product Name *</label>
                    <input
                      id="prod-name"
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Vintage Gold Ring"
                      className={styles.formInput}
                      required
                    />
                  </div>
                  <div className={styles.formField}>
                    <label htmlFor="prod-price" className={styles.formLabel}>Base Price (₹) *</label>
                    <input
                      id="prod-price"
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="999"
                      className={styles.formInput}
                      required
                      min="0"
                      step="any"
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label htmlFor="prod-category" className={styles.formLabel}>Category *</label>
                    <select
                      id="prod-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className={styles.selectInput}
                      required
                    >
                      <option value="rings">Rings</option>
                      <option value="neckpieces">Neckpieces</option>
                      <option value="bracelets">Bracelets</option>
                      <option value="earrings">Earrings</option>
                    </select>
                  </div>
                  <div className={styles.formField} style={{ justifyContent: "center" }}>
                    <div className={styles.stockToggleRow}>
                      <input
                        id="prod-stock"
                        type="checkbox"
                        checked={formInStock}
                        onChange={(e) => setFormInStock(e.target.checked)}
                        className={styles.checkboxInput}
                      />
                      <label htmlFor="prod-stock" className={styles.formLabel} style={{ cursor: "pointer", userSelect: "none" }}>
                        Currently In Stock
                      </label>
                    </div>
                  </div>
                </div>

                <div className={styles.formFieldFull}>
                  <label htmlFor="prod-image" className={styles.formLabel}>Google Drive Image URL *</label>
                  <input
                    id="prod-image"
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className={styles.formInput}
                    required
                  />
                </div>

                {/* Real-time Image Preview Pane */}
                <div className={styles.formFieldFull}>
                  <label className={styles.formLabel}>Real-Time Image Preview</label>
                  <div className={styles.previewBox}>
                    {formPreviewUrl ? (
                      <>
                        <img
                          src={formPreviewUrl}
                          alt="Live Preview"
                          className={styles.previewImage}
                          referrerPolicy="no-referrer"
                          onError={() => {
                            // Handler in case the ID parsed correctly but the link fails CORS/public access
                          }}
                        />
                        <span className={styles.previewStatusSuccess}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Drive Image Link Parsed Successfully
                        </span>
                      </>
                    ) : (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                        <span className={styles.previewText}>
                          Paste a publicly accessible Google Drive sharing link to load image.
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.formFieldFull}>
                  <label htmlFor="prod-desc" className={styles.formLabel}>Product Description</label>
                  <textarea
                    id="prod-desc"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Write details about materials, dimensions, and craft..."
                    className={styles.formTextarea}
                  />
                </div>
              </div>

              {/* Modal controls */}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className={styles.cancelBtn}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={loading || !formName || !formPrice || !formImageUrl}
                >
                  {loading ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && productToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: "440px" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: "var(--color-danger)" }}>
                Delete Jewelry Item
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className={styles.modalClose}>
                &times;
              </button>
            </div>
            <div className={styles.confirmContent}>
              <div className={styles.confirmWarningIcon}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <p>
                Are you sure you want to permanently delete **{productToDelete.name}**?
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                This operation cannot be undone. It will be removed from the Supabase database.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={styles.cancelBtn}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                className={styles.deleteBtn}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
