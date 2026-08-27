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

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // We only update fields that are provided
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name.trim();
    
    if (body.price !== undefined) {
      const parsedPrice = parseFloat(body.price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { error: "Price must be a valid non-negative number." },
          { status: 400 }
        );
      }
      updateData.price = parsedPrice;
      updateData.original_price = parsedPrice; // Update base price in both columns
    }
    
    if (body.category !== undefined) {
      const validCategories = ["rings", "neckpieces", "bracelets", "earrings"];
      if (!validCategories.includes(body.category.toLowerCase())) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.category = body.category.toLowerCase();
    }
    
    if (body.image_url !== undefined) {
      updateData.image_url = formatGoogleDriveUrl(body.image_url);
    }
    
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || "";
    }
    
    if (body.in_stock !== undefined) {
      updateData.in_stock = !!body.in_stock;
    }
    
    if (body.original_price !== undefined) {
      updateData.original_price = body.original_price === null ? null : parseFloat(body.original_price);
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update." },
        { status: 400 }
      );
    }
    
    // Perform update in Supabase
    const { data: updatedProduct, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
      
    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error("Product PATCH API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating the product." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Product DELETE API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while deleting the product." },
      { status: 500 }
    );
  }
}
