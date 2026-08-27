import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, category, value, productIds } = body;

    if (!action || (action !== "apply" && action !== "clear")) {
      return NextResponse.json(
        { error: "Missing or invalid action. Must be 'apply' or 'clear'." },
        { status: 400 }
      );
    }

    const validCategories = ["all", "rings", "neckpieces", "bracelets", "earrings"];

    const hasProductIds = Array.isArray(productIds) && productIds.length > 0;
    if (hasProductIds) {
      if (!productIds.every((id: unknown) => typeof id === "string" && (id as string).length > 0)) {
        return NextResponse.json(
          { error: "productIds must be an array of non-empty strings." },
          { status: 400 }
        );
      }
    } else if (!category || !validCategories.includes(String(category).toLowerCase())) {
      return NextResponse.json(
        { error: `Missing or invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    let query = supabase.from("products").select("*");
    if (hasProductIds) {
      query = query.in("id", productIds as string[]);
    } else if (category.toLowerCase() !== "all") {
      query = query.eq("category", category.toLowerCase());
    }

    const { data: products, error: fetchError } = await query;
    if (fetchError) {
      console.error("Supabase fetch error during bulk discount:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const target = hasProductIds ? "selected products" : `category '${category}'`;

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No products found for ${target} to update.`,
        updatedCount: 0,
      });
    }

    let updatePayloads: Array<{ id: string; price: number; original_price: number }> = [];

    if (action === "apply") {
      const discountValue = parseFloat(value);
      if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
        return NextResponse.json(
          { error: "Discount percentage must be a valid number between 0 and 100." },
          { status: 400 }
        );
      }

      updatePayloads = products.map((product) => {
        const basePrice = product.original_price !== null && product.original_price !== undefined
          ? parseFloat(product.original_price)
          : parseFloat(product.price);

        const newPrice = Math.round(basePrice * (1 - discountValue / 100) * 100) / 100;

        return {
          ...product,
          price: newPrice,
          original_price: basePrice,
        };
      });
    }

    if (action === "clear") {
      const discountedProducts = products.filter((p) => {
        if (p.original_price === null || p.original_price === undefined) return false;
        return parseFloat(p.price) !== parseFloat(p.original_price);
      });

      if (discountedProducts.length === 0) {
        return NextResponse.json({
          success: true,
          message: `No active discounts to clear for ${target}.`,
          updatedCount: 0,
        });
      }

      updatePayloads = discountedProducts.map((product) => ({
        ...product,
        price: parseFloat(product.original_price!),
        original_price: parseFloat(product.original_price!),
      }));
    }

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

    const verb = action === "apply"
      ? `applied ${value}% discount to`
      : "cleared discounts for";

    return NextResponse.json({
      success: true,
      message: `Successfully ${verb} ${updatePayloads.length} product(s) for ${target}.`,
      updatedCount: updatePayloads.length,
    });
  } catch (error) {
    console.error("Discounts API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing bulk discounts." },
      { status: 500 }
    );
  }
}