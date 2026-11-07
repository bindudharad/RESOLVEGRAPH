# RESOLVEGRAPH — Multimodal Evidence Extraction & Provenance Tracking

## 1. Overview

Commerce disputes often revolve around mismatched specifications, conflicting serial numbers, packaging damage, or delivery scans. ResolveGraph implements a forensic multimodal extraction pipeline that converts unstructured evidence artifacts (PDF invoices, tracking screenshots, photos of damaged goods, warehouse packing slips) into verifiable, atomic database facts.

---

## 2. Extraction Engines

### 2.1 PDF Extraction (`PdfExtractor`)
- Built using zero-dependency pure JavaScript `unpdf` (`extractText`, `getDocumentProxy`).
- Operates entirely in memory without spawning native canvas dependencies or external C++ processes.
- Extracts text per page, tracking:
  - Exact `pageNumber`
  - Cumulative character start (`charStart`) and character end (`charEnd`)
  - Line counts and paragraph breaks
- **Scanned PDF Detection**: If the average character count per page is below 30 characters, the document is flagged as scanned/image-only (`isScanned = true`) to trigger multimodal vision analysis fallback.

### 2.2 Photographic & Vision Inspection (`ImageExtractor`)
- Inspects raster images (`.png`, `.jpg`, `.jpeg`, `.webp`).
- Converts files to base64 data URLs for multimodal analysis.
- **Normalized Bounding Box System**: Vision models localize damage, barcodes, and serial labels on a normalized 0–1000 integer grid:
  $$\text{Box} = \{ y_{\min}, x_{\min}, y_{\max}, x_{\max}, \text{label} \}$$
  Coordinates map directly to frontend canvas overlays regardless of display DPI or container dimensions.

### 2.3 Plain Text & Claim Locator (`TextExtractor`)
- Maps plain text statements, email threads, and buyer declarations.
- Locates exact character offset ranges of quotes and excerpts within the parent document.

---

## 3. Fact Normalization (`FactNormalizer`)

Raw strings cannot be compared directly across parties (e.g. "1 TB" vs "1024 GB", or "$1,299.99" vs "129999 cents"). The `FactNormalizer` transforms heterogeneous representations into canonical formats:

| Category | Raw Buyer / Merchant Value | Normalized Canonical Format | Matching Rule |
| :--- | :--- | :--- | :--- |
| **Storage Capacity** | `"1 TB"`, `"1024GB"`, `"2TB"` | `"1024 GB"`, `"1024 GB"`, `"2048 GB"` | Exact numeric comparison in GB |
| **Monetary Amounts** | `"$1,299.99"`, `"1299.00 USD"` | `129999 USD` (minor cents) | Integer minor unit comparison |
| **Delivery Dates** | `"Nov 3, 2026"`, `"2026-11-03"` | `"2026-11-03"` | ISO 8601 YYYY-MM-DD |
| **SKUs & Serials** | `"SN: AB-123 456-XY"` | `"AB123456XY"` | Uppercase alphanumeric strip |
| **Item Condition** | `"Brand new sealed"`, `"Broken"` | `"BRAND_NEW"`, `"DAMAGED"` | Standardized state enumeration |

---

## 4. Provenance & Verification

Every `ExtractedFact` persisted to the database maintains verifiable provenance back to its primary source artifact:
1. `evidenceId`: Foreign key to the immutable evidence document.
2. `sourceExcerpt`: Verbatim text string quoted from the artifact.
3. `sourceLocatorType`: `TEXT_RANGE`, `PDF_PAGE`, or `IMAGE_REGION`.
4. `pageNumber`: Specific page number in multi-page documents.
5. `characterStart` / `characterEnd`: Substring boundaries for high-precision text highlighting.
6. `boundingBoxJson`: Bounding box coordinates for visual inspection.
7. `extractionConfidenceBand`: `HIGH` (&ge;0.88), `MEDIUM` (0.65–0.87), or `LOW` (<0.65).
8. `reviewStatus`: Human review lifecycle state (`UNREVIEWED`, `CONFIRMED`, `CORRECTED`, `REJECTED`, `INCONCLUSIVE`).
