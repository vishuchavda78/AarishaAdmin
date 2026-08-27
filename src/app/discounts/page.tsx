"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./discounts.module.css";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  original_price: number | null;
}

const CATEGORIES = ["all", "rings", "neckpieces", "bracelets", "earrings"];

export default function DiscountsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [discountPercent, setDiscountPercent] = useState<string>("");

  const showNotification = (message: string, isError = false) => {
    setNotification({ message, isError });
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const loadProducts = async () => {
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
    loadProducts();
  }, []);

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

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products;
    return products.filter(
      (p) => p.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [products, selectedCategory]);

  const allVisibleSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedIds.has(p.id));
  }, [filteredProducts, selectedIds]);

  const handleSelectAllToggle = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      filteredProducts.forEach((p) => next.delete(p.id));
    } else {
      filteredProducts.forEach((p) => next.add(p.id));
    }
    setSelectedIds(next);
  };

  const handleToggleProduct = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };

  const isValidPercent = (() => {
    const percent = parseFloat(discountPercent);
    return !isNaN(percent) && percent > 0 && percent <= 100;
  })();

  const handleApply = async () => {
    const percent = parseFloat(discountPercent);
    if (!isValidPercent) {
      showNotification("Discount percent must be between 1 and 100.", true);
      return;
    }
    if (selectedIds.size === 0) {
      showNotification("Select at least one product to apply a discount.", true);
      return;
    }

    const ids = Array.from(selectedIds);
    if (!confirm(`Apply ${percent}% discount to ${ids.length} product(s)?`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          value: percent,
          productIds: ids,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message);
        setDiscountPercent("");
        await refreshProducts();
      } else {
        showNotification(data.error || "Failed to apply discount.", true);
      }
    } catch (err) {
      console.error("Apply discount error:", err);
      showNotification("Network error applying discount.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Clear all active discounts for every product?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear", category: "all" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message);
        await refreshProducts();
      } else {
        showNotification(data.error || "Failed to clear discounts.", true);
      }
    } catch (err) {
      console.error("Clear all discount error:", err);
      showNotification("Network error clearing all discounts.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    const ids = Array.from(selectedIds);
    const targetText = ids.length > 0
      ? `${ids.length} selected product(s)`
      : selectedCategory === "all"
        ? "all categories"
        : selectedCategory;

    if (!confirm(`Clear active discounts for ${targetText}?`)) return;

    setLoading(true);
    try {
      const payload: Record<string, unknown> = { action: "clear" };
      if (ids.length > 0) {
        payload.productIds = ids;
      } else {
        payload.category = selectedCategory;
      }

      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message);
        await refreshProducts();
      } else {
        showNotification(data.error || "Failed to clear discounts.", true);
      }
    } catch (err) {
      console.error("Clear discount error:", err);
      showNotification("Network error clearing discount.", true);
    } finally {
      setLoading(false);
    }
  };

  const refreshProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (res.ok && data.products) {
        setProducts(data.products);
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("Refresh products error:", err);
    }
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>Aarisha</h1>
          <span className={styles.badge}>Admin Panel</span>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => router.push("/")}
            className={styles.headerLink}
          >
            Catalog
          </button>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Log Out
          </button>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Bulk Discount Portal</h2>
            <span className={styles.pageSubtitle}>
              Apply or clear discounts for an entire category or selected products.
            </span>
          </div>
        </div>

        {notification && (
          <div
            role="alert"
            className={notification.isError ? styles.notificationError : styles.notification}
          >
            <span>{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className={styles.notificationClose}
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        )}

        <div className={styles.controlsRow}>
          <div className={styles.controlGroup}>
            <label htmlFor="discount-category" className={styles.controlLabel}>
              Category
            </label>
            <select
              id="discount-category"
              className={styles.selectInput}
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={loading}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Products" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="discount-percent" className={styles.controlLabel}>
              Discount Percent
            </label>
            <input
              id="discount-percent"
              type="number"
              className={styles.percentInput}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="15"
              min="1"
              max="100"
              disabled={loading}
            />
          </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                onClick={handleApply}
                className={styles.applyBtn}
                disabled={loading || selectedIds.size === 0 || !isValidPercent}
              >
                {loading ? "Applying..." : "Apply Discount"}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className={styles.clearBtn}
                disabled={loading}
              >
                Clear Discounts
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className={styles.clearAllBtn}
                disabled={loading}
              >
                Clear All Discounts
              </button>
            </div>
        </div>

        {fetching ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No Products Found</h3>
            <p>There are no products in this category.</p>
          </div>
        ) : (
          <>
            <div className={styles.selectionBar}>
              <label className={styles.selectAllRow}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={allVisibleSelected}
                  onChange={handleSelectAllToggle}
                  disabled={loading}
                  aria-label="Select all visible products"
                />
                <span>Select all in view</span>
              </label>
              <span className={styles.selectionCount}>
                {selectedIds.size} selected of {filteredProducts.length}
              </span>
            </div>

            <div className={styles.productTable}>
              <div className={styles.tableHeader}>
                <span></span>
                <span>Product</span>
                <span>Category</span>
                <span>Original Price</span>
                <span>Current Price</span>
              </div>
              {filteredProducts.map((product) => {
                const originalPriceVal = product.original_price !== null
                  ? Number(product.original_price)
                  : Number(product.price);
                const currentPriceVal = Number(product.price);
                const isDiscounted = originalPriceVal > currentPriceVal;
                const discountRate = isDiscounted
                  ? Math.round(((originalPriceVal - currentPriceVal) / originalPriceVal) * 100)
                  : 0;

                return (
                  <div key={product.id} className={styles.tableRow}>
                    <input
                      type="checkbox"
                      id={`product-${product.id}`}
                      className={styles.checkbox}
                      checked={selectedIds.has(product.id)}
                      onChange={() => handleToggleProduct(product.id)}
                      disabled={loading}
                      aria-label={`Select ${product.name}`}
                    />
                    <label htmlFor={`product-${product.id}`} className={styles.productName}>
                      {product.name}
                    </label>
                    <span className={styles.productCategory}>{product.category}</span>
                    <span className={isDiscounted ? styles.priceOriginal : styles.priceNeutral}>
                      ₹{originalPriceVal}
                    </span>
                    <span className={styles.priceCurrent}>
                      ₹{currentPriceVal}
                      {isDiscounted && (
                        <span className={styles.discountBadge}>{discountRate}% OFF</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}