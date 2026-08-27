export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Helper to parse Google Drive URLs and convert them to the thumbnail preview format.
 */
function formatGoogleDriveUrl(url: string): string {
  if (!url) return "";
  
  const trimmed = url.trim();
  
  // Format 1: https://drive.google.com/file/d/1yOD4LTUMHGKnNNvwA9h5YWoYEmf_r41-/view?usp=sharing
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{25,50})[/\?]?/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${fileDMatch[1]}&sz=w1000`;
  }
  
  // Format 2: https://drive.google.com/open?id=1yOD4LTUMHGKnNNvwA9h5YWoYEmf_r41-
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{25,50})/);
  if (queryMatch && queryMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${queryMatch[1]}&sz=w1000`;
  }
  
  // Format 3: Raw file ID
  if (trimmed.match(/^[a-zA-Z0-9_-]{25,50}$/)) {
    return `https://drive.google.com/thumbnail?id=${trimmed}&sz=w1000`;
  }
  
  // Already in thumbnail or direct link format
  if (trimmed.startsWith("https://drive.google.com/thumbnail")) {
    return trimmed;
  }
  
  return trimmed;
}

export async function GET() {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Supabase select error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ products });
  } catch (error) {
    console.error("Products GET API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching products." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, price, category, image_url, description, in_stock } = body;
    
    // 1. Validation
    if (!name || price === undefined || !category || !image_url) {
      return NextResponse.json(
        { error: "Missing required fields: name, price, category, and image_url are required." },
        { status: 400 }
      );
    }
    
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "Price must be a valid non-negative number." },
        { status: 400 }
      );
    }
    
    const validCategories = ["rings", "neckpieces", "bracelets", "earrings"];
    if (!validCategories.includes(category.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }
    
    // 2. Format Image URL
    const formattedImageUrl = formatGoogleDriveUrl(image_url);
    
    // 3. Insert into Supabase
    const { data: newProduct, error } = await supabase
      .from("products")
      .insert([
        {
          name: name.trim(),
          price: parsedPrice,
          category: category.toLowerCase(),
          image_url: formattedImageUrl,
          description: description?.trim() || "",
          in_stock: in_stock !== false, // Default to true if not specified
          original_price: parsedPrice, // Save entered price to original_price as well on creation
        },
      ])
      .select()
      .single();
      
    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    console.error("Products POST API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while adding the product." },
      { status: 500 }
    );
  }
}
