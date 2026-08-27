# Implementation Plan – Separate Bulk Discount Page

## Overview
Create a dedicated **Discounts** page (`/discounts`) that allows an admin to:
1. Apply a bulk discount to **an entire product category** (existing behavior).
2. Apply a bulk discount to **selected products** within a chosen category.
3. Clear discounts for either a full category or the selected products.

The current bulk‑discount UI lives inside the dashboard (`src/app/page.tsx`). This plan moves that functionality to its own page and extends the backend API to accept an optional list of product IDs.

---

## Files to Add / Modify
| Path | Action | Reason |
|------|--------|--------|
| `src/app/discounts/page.tsx` | **Add** | New page component that implements the UI described above.
| `src/app/api/discounts/route.ts` | **Modify** | Extend POST handler to accept `productIds?: string[]` and apply/clear discounts based on this list.
| `src/app/discounts/discounts.module.css` (or reuse existing) | **Add** (optional) | Scoped styling for the new page – can import shared styles if appropriate.
| `src/app/page.tsx` (dashboard) | **Modify (optional)** | Remove the bulk‑discount sidebar section or replace it with a navigation link to the new page to avoid duplicate UI.
| `src/app/layout.tsx` (if a global navigation exists) | **Modify (optional)** | Add a link/button to `/discounts` for easier admin navigation.
| `src/tests/api/discounts.test.ts` | **Add** | Unit tests covering the new `productIds` handling for both `apply` and `clear` actions.
| `src/tests/ui/discounts.test.tsx` | **Add** | Component tests ensuring UI behavior (selection, validation, loading states).
| `Context.md` | **Update** | Document new page route, UI flow, and API contract changes.
| `Changelog.md` | **Update (after implementation)** | Record the change per Section 8.1.

---

## Backend API Changes (`src/app/api/discounts/route.ts`)
1. **Request Payload** – Extend the accepted JSON to:
   ```json
   {
     "action": "apply" | "clear",
     "category": "all" | "rings" | "neckpieces" | "bracelets" | "earrings",
     "value": number,               // optional for "clear"
     "productIds": ["uuid1", "uuid2"] // optional – when present, discount applies only to these IDs
   }
   ```
2. **Validation**
   - `productIds` must be an array of non‑empty strings if provided.
   - If `productIds` is present, ignore the category filter for the database query (or optionally ensure each ID belongs to the selected category).
3. **Fetching Products**
   - When `productIds` is supplied: `supabase.from('products').select('*').in('id', productIds)`.
   - Else keep the existing category‑based query.
4. **Applying / Clearing**
   - Re‑use the existing `apply` and `clear` logic on the fetched subset.
5. **Security**
   - Ensure server‑side authentication/authorization checks are present (reuse any existing middleware or add a comment noting the need).
6. **Response** – Same shape as before, with `updatedCount` reflecting only the affected rows.

---

## Front‑end UI (`src/app/discounts/page.tsx`)
1. **Layout** – Use the existing global layout (`layout.tsx`). The page contains:
   - Category selector (`<select>`).
   - **Product list**: displays products of the selected category with a checkbox per row and a “Select All” checkbox in the header.
   - Discount percent input (`<input type="number">`).
   - **Apply** button (enabled when a discount percent is valid **and** at least one product is selected).
   - **Clear** button (same enable logic).
2. **State Management**
   - `selectedCategory`, `selectedProductIds: Set<string>`, `discountPercent`, `loading`, `notification`.
   - Fetch products via `/api/products` filtered by `selectedCategory` (reuse existing fetch logic).
3. **Interactions**
   - Changing category fetches the product list.
   - Selecting/deselecting checkboxes updates `selectedProductIds`.
   - “Select All” toggles all visible product checkboxes.
   - On **Apply**, POST `/api/discounts` with `{action:"apply", category, value, productIds: Array.from(selectedProductIds)}`.
   - On **Clear**, POST with `{action:"clear", category, productIds: …}`.
4. **Accessibility**
   - Each checkbox has a `<label>` linked via `htmlFor`.
   - Keyboard navigation supported (tab order, space/enter to toggle).
   - ARIA live region for notifications.
5. **Responsiveness** – Use flex/grid and the existing design tokens; ensure layout works on mobile (stacked list, scrollable table).

---

## Design Decisions & Alternatives
| Decision | Rationale | Alternatives |
|----------|-----------|--------------|
| Extend existing API rather than create a new endpoint | Keeps server‑side logic centralized; minimal duplication. | Create `/api/discounts/selected` – adds another endpoint, more maintenance.
| Use a simple list with checkboxes instead of a complex table component | Aligns with the project's current UI simplicity; easier to test. | Use a data‑grid library – adds extra dependency.
| Keep concurrent update pattern (`Promise.all`) | Mirrors existing bulk‑update strategy; already tested. | Batch update via Postgres `update ... where id in (…)` – would require custom RPC, more work.

---

## Edge Cases, Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Very large selection (thousands of IDs) could cause many concurrent requests → API throttling or performance degradation. | Potential timeouts or Supabase rate‑limit errors. | Limit concurrency (e.g., chunk updates in groups of 50) – can be added later if needed. |
| Admin could accidentally apply a discount to the wrong products. | Business impact (price loss). | Confirmation dialog summarising count and discount percent before sending request. |
| Missing or malformed `productIds` could cause DB errors. | API returns 400; UI should surface error. | Strong validation on server; defensive checks on client. |
| UI becomes unwieldy on small screens with long product lists. | Poor UX. | Enable vertical scrolling, responsive stacking, and a search filter within the product list. |
| Authorization bypass – a non‑admin could call the endpoint directly. | Security breach. | Ensure the existing auth middleware (if any) is applied; otherwise add a check for admin role before processing. |

---

## Testing Strategy
1. **API Unit Tests** (`src/tests/api/discounts.test.ts`)
   - Success: apply discount with `productIds` list.
   - Success: clear discount with `productIds`.
   - Validation errors: missing `action`, invalid `action`, invalid `category`, invalid `productIds` (non‑array, empty strings).
   - Edge: empty product set returns `updatedCount: 0` with appropriate message.
2. **Component Tests** (`src/tests/ui/discounts.test.tsx`)
   - Renders category selector, product list, and controls.
   - Selecting a category triggers product fetch (mock fetch).
   - Checkbox selection updates internal state.
   - Apply button disabled until a valid percent and at least one checkbox.
   - Successful API call displays success notification; error displays error notification.
3. **Accessibility Tests** (use `jest-axe` or similar) to ensure no ARIA violations.
4. **Responsive Checks** – Use viewport size simulations in tests to ensure layout does not break.

---

## Documentation Updates
- **Context.md** – Add a new section under UI/Motion:
  ```markdown
  ## Discounts Page
  Route: /discounts
  Purpose: Admin bulk‑discount management. Allows category‑wide discounts or selection of individual products within a category.
  ```
- **Changelog.md** – After implementation, add an entry per the required format (timestamp, category: Dev, short title, description, why, etc.).

---

## Rollback & Recovery
If the deployment fails or tests expose regressions:
1. Revert `src/app/api/discounts/route.ts` to its original contents (git checkout of the file).
2. Remove the newly added `src/app/discounts` folder.
3. Re‑add any UI elements removed from the dashboard (if we removed them).
4. Ensure `Context.md` and `Changelog.md` are rolled back to their previous state.
All revert actions can be performed via a single git commit that restores the prior files.

---

## Acceptance Criteria
- Visiting `/discounts` renders a fully functional page with the described UI.
- Admin can select a category, pick individual products, specify a discount percent, and apply it – the API updates only the selected rows.
- Admin can clear discounts for selected products (or whole category) using the Clear button.
- Validation errors are shown for missing/invalid inputs.
- The UI is responsive, keyboard‑navigable, and includes accessible labels.
- All new API paths are covered by unit tests, and the UI component is covered by component tests.
- `Context.md` and `Changelog.md` are updated accordingly.

---

*Prepared according to @RULES.md – no code changes have been made yet.*