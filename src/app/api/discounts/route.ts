import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, category, value } = body;
    
    // 1. Validation
    if (!action || !category) {
      return NextResponse.json(
        { error: "Missing required fields: action and category are required." },
        { status: 400 }
      );
    }
    
    if (action !== "apply" && action !== "clear") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'apply' or 'clear'." },
        { status: 400 }
      );
    }
    
    const validCategories = ["all", "rings", "neckpieces", "bracelets", "earrings"];
    if (!validCategories.includes(category.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }
    
    // 2. Fetch products to update
    let query = supabase.from("products").select("*");
    if (category.toLowerCase() !== "all") {
      query = query.eq("category", category.toLowerCase());
    }
    
    const { data: products, error: fetchError } = await query;
    if (fetchError) {
      console.error("Supabase fetch error during bulk discount:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No products found in category '${category}' to update.`,
        updatedCount: 0
      });
    }
    
    let updatePayloads: any[] = [];
    
    // 3. Process apply action
    if (action === "apply") {
      const discountValue = parseFloat(value);
      if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
        return NextResponse.json(
          { error: "Discount percentage must be a valid number between 0 and 100." },
          { status: 400 }
        );
      }
      
      updatePayloads = products.map((product) => {
        // Base price is original_price if already set (avoid double stacking), otherwise current price
        const basePrice = product.original_price !== null && product.original_price !== undefined
          ? parseFloat(product.original_price)
          : parseFloat(product.price);
          
        const newPrice = Math.round(basePrice * (1 - discountValue / 100) * 100) / 100;
        
        return {
          ...product,
          price: newPrice,
          original_price: basePrice
        };
      });
    }
    
    // 4. Process clear action
    if (action === "clear") {
      // Find products that currently have an active discount (price is less than original_price)
      const discountedProducts = products.filter((p) => {
        if (p.original_price === null || p.original_price === undefined) return false;
        return parseFloat(p.price) !== parseFloat(p.original_price);
      });
      
      if (discountedProducts.length === 0) {
        return NextResponse.json({
          success: true,
          message: `No active discounts to clear in category '${category}'.`,
          updatedCount: 0
        });
      }
      
      updatePayloads = discountedProducts.map((product) => ({
        ...product,
        price: parseFloat(product.original_price!), // Restore original price
        original_price: parseFloat(product.original_price!) // Keep original_price populated and in sync
      }));
    }
    
    // 5. Execute bulk update using individual updates concurrently to bypass upsert/RLS issues on deployment
    if (updatePayloads.length > 0) {
      const updatePromises = updatePayloads.map((payload) =>
        supabase
          .from("products")
          .update({
            price: payload.price,
            original_price: payload.original_price,
          })
          .eq("id", payload.id)
      );
      
      const results = await Promise.all(updatePromises);
      const updateError = results.find((r) => r.error)?.error;
      
      if (updateError) {
        console.error("Supabase bulk update error during bulk discount:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: action === "apply"
        ? `Successfully applied ${value}% discount to ${updatePayloads.length} product(s) in category '${category}'.`
        : `Successfully cleared discounts and restored prices for ${updatePayloads.length} product(s) in category '${category}'.`,
      updatedCount: updatePayloads.length
    });
    
  } catch (error) {
    console.error("Discounts API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing bulk discounts." },
      { status: 500 }
    );
  }
}
