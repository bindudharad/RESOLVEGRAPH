/**
 * RESOLVEGRAPH — Complaint-Specific Seller Evidence Requirements Generator
 *
 * Maps complaint category + case metadata to relevant, non-coercive seller
 * evidence requests. Never makes unavailable carrier/settlement files mandatory.
 */

import type {
  DynamicSellerFormConfig,
  RequestedEvidenceRequirement,
} from './seller.types';

export interface BuildSellerRequirementsInput {
  category: string;
  originalCategory?: string | null;
  productName?: string | null;
  orderId?: string | null;
}

function normalizeCategoryKey(category: string, originalCategory?: string | null): string {
  const normOriginal = (originalCategory || '').replace(/[_-]+/g, ' ');
  const normCategory = (category || '').replace(/[_-]+/g, ' ');
  const combined = `${normOriginal} ${normCategory}`.toLowerCase();
  if (combined.includes('wrong product') || combined.includes('wrong item')) {
    return 'WRONG_PRODUCT';
  }
  if (combined.includes('damaged') || combined.includes('broken') || combined.includes('defective')) {
    return 'DAMAGED_PRODUCT';
  }
  if (combined.includes('missing') || combined.includes('non delivery') || combined.includes('not received')) {
    if (combined.includes('refund')) return 'REFUND_NOT_RECEIVED';
    return 'MISSING_ITEM';
  }
  if (
    combined.includes('specification') ||
    combined.includes('specs differ') ||
    combined.includes('not as described')
  ) {
    return 'SPECS_DIFFER';
  }
  if (
    combined.includes('payment') ||
    combined.includes('billing error') ||
    combined.includes('unauthorized')
  ) {
    return 'PAYMENT_PROBLEM';
  }
  if (combined.includes('refund')) {
    return 'REFUND_NOT_RECEIVED';
  }
  return 'OTHER';
}

export class SellerEvidenceRequirementsService {
  /**
   * Builds a configurable, complaint-specific checklist of evidence items
   * requested from the seller.
   */
  public static generateRequirements(
    input: BuildSellerRequirementsInput
  ): {
    categoryKey: string;
    requestDescription: string;
    items: RequestedEvidenceRequirement[];
  } {
    const categoryKey = normalizeCategoryKey(input.category, input.originalCategory);
    const productRef = input.productName?.trim() || 'the ordered product';
    const orderRef = input.orderId?.trim() || 'this order';

    switch (categoryKey) {
      case 'WRONG_PRODUCT':
        return {
          categoryKey,
          requestDescription: `Customer reports receiving a different product than ${productRef} for order ${orderRef}. Please provide available fulfillment, packing, and SKU verification records.`,
          items: [
            {
              key: 'packing_photograph',
              label: 'Product packing photograph',
              description: 'Photograph of the packed product or outbound parcel before sealing, if available.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'product_sku_info',
              label: 'Original product / SKU information',
              description: 'Catalog SKU, EAN/UPC, or variant identifier actually picked for this order.',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'packing_declaration',
              label: 'Packing declaration',
              description: 'Confirmation of item inspected and placed in the outbound shipment.',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'picking_packing_records',
              label: 'Picking and packing records',
              description: 'Warehouse pick list, barcode scan log, or packing slip.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'dispatch_details',
              label: 'Dispatch details',
              description: 'Carrier name, tracking reference, and dispatch timestamp.',
              mandatory: false,
              status: 'PENDING',
            },
          ],
        };

      case 'DAMAGED_PRODUCT':
        return {
          categoryKey,
          requestDescription: `Customer reports ${productRef} arrived physically damaged for order ${orderRef}. Please share pre-dispatch condition, inspection, and packaging records if available.`,
          items: [
            {
              key: 'pre_pack_condition_photo',
              label: 'Product condition photograph before packing',
              description: 'Pre-dispatch image showing intact product surface/seals, if captured.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'quality_inspection_records',
              label: 'Quality inspection records',
              description: 'Pre-dispatch QC checklist or seal verification record.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'packing_photographs',
              label: 'Packing photographs',
              description: 'Photographs showing protective cushioning and outer packaging prior to handover.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'packaging_condition_records',
              label: 'Packaging-condition records',
              description: 'Warehouse or courier handover packaging condition notes.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'dispatch_information',
              label: 'Dispatch information',
              description: 'Carrier handover receipt, tracking number, and dispatch date.',
              mandatory: true,
              status: 'PENDING',
            },
          ],
        };

      case 'MISSING_ITEM':
        return {
          categoryKey,
          requestDescription: `Customer reports missing item(s) or incomplete contents for ${productRef} (order ${orderRef}). Please share packing list, quantity, weight, and shipment records if available.`,
          items: [
            {
              key: 'original_packing_list',
              label: 'Original packing list',
              description: 'Itemized packing manifest for the outbound shipment.',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'item_quantity_records',
              label: 'Item quantity records',
              description: 'Picked quantity / multi-box fulfillment confirmation.',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'package_weight_info',
              label: 'Package weight information (if available)',
              description: 'Recorded parcel weight at packing or carrier manifest handover.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'packing_photographs',
              label: 'Packing photographs',
              description: 'Photographs of open parcel contents before sealing, if captured.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'shipment_documentation',
              label: 'Shipment documentation',
              description: 'Waybill, tracking reference, and carrier acceptance scan.',
              mandatory: false,
              status: 'PENDING',
            },
          ],
        };

      case 'SPECS_DIFFER':
        return {
          categoryKey,
          requestDescription: `Customer reports delivered product specifications differ from the listing for ${productRef} (order ${orderRef}). Please provide SKU, model number, original specification, and packing records.`,
          items: [
            {
              key: 'product_sku',
              label: 'Product SKU',
              description: 'Exact SKU listed and fulfilled for this order.',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'model_number',
              label: 'Model number',
              description: 'Manufacturer model number / part number of the dispatched unit.',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'original_product_specifications',
              label: 'Original product specifications',
              description: 'Listing spec sheet (capacity, RAM, variant, edition) active at purchase time.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'packing_declaration',
              label: 'Packing declaration',
              description: 'Statement confirming the exact variant packed and shipped.',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'available_product_photographs',
              label: 'Available product photographs',
              description: 'Photographs of box label, barcode, or variant sticker, if available.',
              mandatory: false,
              status: 'PENDING',
            },
          ],
        };

      case 'PAYMENT_PROBLEM':
        return {
          categoryKey,
          requestDescription: `Customer reports a payment or billing issue for ${productRef} (order ${orderRef}). Please share order-payment mapping, confirmation, and settlement references where available.`,
          items: [
            {
              key: 'order_payment_mapping',
              label: 'Merchant order-payment mapping',
              description: 'Record linking order reference to captured payment transaction(s).',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'payment_confirmation_details',
              label: 'Payment confirmation details',
              description: 'Gateway capture ID, payment status, and charged amount.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'settlement_information',
              label: 'Settlement information (where available)',
              description: 'Merchant settlement batch or marketplace payout ledger excerpt.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'transaction_references',
              label: 'Relevant transaction references',
              description: 'UTR / RRN / gateway reference IDs associated with this order.',
              mandatory: false,
              status: 'PENDING',
            },
          ],
        };

      case 'REFUND_NOT_RECEIVED':
        return {
          categoryKey,
          requestDescription: `Customer reports an expected refund has not been received for ${productRef} (order ${orderRef}). Please share payment reference, refund initiation reference, and processing status.`,
          items: [
            {
              key: 'original_payment_reference',
              label: 'Original payment reference',
              description: 'Original captured transaction ID / payment reference for the order.',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'refund_request_reference',
              label: 'Refund request reference',
              description: 'Cancellation/return approval ID or refund credit note reference.',
              mandatory: false,
              status: 'PENDING',
            },
            {
              key: 'refund_processing_status',
              label: 'Refund processing status',
              description: 'Current refund state (pending, initiated, settled, or rejected with reason).',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'provider_confirmation',
              label: 'Relevant provider confirmation',
              description: 'Payment gateway / marketplace ARN or UTR refund confirmation if issued.',
              mandatory: false,
              status: 'PENDING',
            },
          ],
        };

      default:
        return {
          categoryKey: 'OTHER',
          requestDescription: `Customer submitted a purchase complaint regarding ${productRef} (order ${orderRef}). Please review and share relevant order, fulfillment, or support records.`,
          items: [
            {
              key: 'order_fulfillment_record',
              label: 'Order & fulfillment record',
              description: 'Merchant order summary and fulfillment timeline for this order.',
              mandatory: true,
              status: 'PENDING',
            },
            {
              key: 'supporting_documentation',
              label: 'Relevant supporting documentation',
              description: 'Any packing, invoice, or communication records relevant to the complaint.',
              mandatory: false,
              status: 'PENDING',
            },
          ],
        };
    }
  }

  /**
   * Returns complaint-specific dynamic Step 2 (Product & Packing / Payment) and
   * Step 3 (Dispatch / Settlement) form field schemas so sellers are only asked
   * for relevant information.
   */
  public static getDynamicFormConfig(input: BuildSellerRequirementsInput): DynamicSellerFormConfig {
    const categoryKey = normalizeCategoryKey(input.category, input.originalCategory);
    const productRef = input.productName?.trim() || 'Purchased Product';

    switch (categoryKey) {
      case 'WRONG_PRODUCT':
        return {
          categoryKey,
          step2Title: 'Provide product and packing information',
          step2Subtitle: `Share the exact SKU, variant details, and packing records for ${productRef}.`,
          step2Fields: [
            { key: 'productName', label: 'Packed Product Name', type: 'text', required: true, placeholder: productRef },
            { key: 'sku', label: 'SKU / Variant Identifier', type: 'text', required: true, placeholder: 'e.g., SKU-1TB-NVME' },
            { key: 'productModel', label: 'Product Model / Edition', type: 'text', placeholder: 'e.g., Model X200' },
            { key: 'quantityPacked', label: 'Quantity Packed', type: 'number', placeholder: '1' },
            { key: 'packingProcessInfo', label: 'Packing & Verification Notes', type: 'textarea', placeholder: 'Describe barcode scan or bench check used while packing...' },
          ],
          step2UploadTitle: 'Product & Packing Evidence',
          step2UploadHints: ['Packed product photographs', 'Packing slip or pick list', 'Quality inspection record'],
          step3Title: 'Provide dispatch information',
          step3Subtitle: 'Provide carrier and shipment records where available.',
          step3Fields: [
            { key: 'logisticsProvider', label: 'Logistics Provider', type: 'text', placeholder: 'e.g., Delhivery, BlueDart, Ekart' },
            { key: 'dispatchReference', label: 'Dispatch Reference', type: 'text', placeholder: 'Internal manifest or handover reference' },
            { key: 'trackingId', label: 'Tracking ID / AWB', type: 'text', placeholder: 'Carrier tracking number' },
            { key: 'dispatchDate', label: 'Dispatch Date', type: 'date' },
            { key: 'packageWeight', label: 'Recorded Package Weight (if recorded)', type: 'text', placeholder: 'e.g., 420 g' },
            { key: 'shipmentStatus', label: 'Shipment Status (where available)', type: 'select', options: ['Delivered', 'In Transit', 'Out for Delivery', 'Returned to Origin', 'Unavailable'] },
          ],
          step3UploadTitle: 'Dispatch & Carrier Documents',
          step3UploadHints: ['Dispatch receipt', 'Shipment confirmation', 'Packing list or delivery confirmation'],
        };

      case 'DAMAGED_PRODUCT':
        return {
          categoryKey,
          step2Title: 'Provide pre-dispatch product and packaging details',
          step2Subtitle: `Share pre-dispatch condition checks and protective packaging used for ${productRef}.`,
          step2Fields: [
            { key: 'productName', label: 'Product Name', type: 'text', required: true, placeholder: productRef },
            { key: 'productConditionBeforePacking', label: 'Product Condition Before Packing', type: 'select', options: ['Intact / Factory Sealed', 'Inspected Open-Box', 'Refurbished Grade-A', 'Unavailable'] },
            { key: 'qualityInspectionCompleted', label: 'Quality Inspection Completed', type: 'select', options: ['Yes — Passed QC', 'Partial Check', 'No / Not Applicable'] },
            { key: 'packingProcessInfo', label: 'Protective Packaging Details', type: 'textarea', placeholder: 'e.g., Bubble wrap, corner foam, tamper-evident outer tape...' },
          ],
          step2UploadTitle: 'Pre-Dispatch & Packaging Evidence',
          step2UploadHints: ['Product photo before packing', 'Protective packaging photographs', 'QC inspection checklist'],
          step3Title: 'Provide dispatch information',
          step3Subtitle: 'Share courier handover and delivery details if recorded.',
          step3Fields: [
            { key: 'logisticsProvider', label: 'Logistics Provider', type: 'text', placeholder: 'Courier partner' },
            { key: 'dispatchReference', label: 'Dispatch Reference', type: 'text' },
            { key: 'trackingId', label: 'Tracking ID / AWB', type: 'text' },
            { key: 'dispatchDate', label: 'Dispatch Date', type: 'date' },
            { key: 'shipmentStatus', label: 'Shipment Status', type: 'select', options: ['Delivered', 'Damaged in Transit', 'In Transit', 'Unavailable'] },
          ],
          step3UploadTitle: 'Dispatch & Handover Records',
          step3UploadHints: ['Dispatch receipt', 'Handover manifest', 'Delivery confirmation'],
        };

      case 'MISSING_ITEM':
        return {
          categoryKey,
          step2Title: 'Provide packing list and quantity information',
          step2Subtitle: 'Help confirm the exact items and quantity packed into the shipment.',
          step2Fields: [
            { key: 'productName', label: 'Product Name', type: 'text', required: true, placeholder: productRef },
            { key: 'sku', label: 'SKU / Item Codes', type: 'text' },
            { key: 'quantityPacked', label: 'Total Quantity Packed', type: 'number', placeholder: '1' },
            { key: 'packingProcessInfo', label: 'Included Accessories / Box Contents', type: 'textarea', placeholder: 'List accessories or multi-box components packed...' },
          ],
          step2UploadTitle: 'Packing List & Contents Evidence',
          step2UploadHints: ['Itemized packing list', 'Open-box packing photographs', 'Quantity scan log'],
          step3Title: 'Provide dispatch and weight information',
          step3Subtitle: 'Provide shipment reference and parcel weight if recorded at dispatch.',
          step3Fields: [
            { key: 'logisticsProvider', label: 'Logistics Provider', type: 'text' },
            { key: 'trackingId', label: 'Tracking ID / AWB', type: 'text' },
            { key: 'dispatchDate', label: 'Dispatch Date', type: 'date' },
            { key: 'packageWeight', label: 'Package Weight (if recorded)', type: 'text', placeholder: 'e.g., 1.25 kg' },
            { key: 'shipmentStatus', label: 'Shipment Status', type: 'select', options: ['Delivered', 'Partial Delivery', 'In Transit', 'Unavailable'] },
          ],
          step3UploadTitle: 'Shipment & Weight Records',
          step3UploadHints: ['Weight slip or courier manifest', 'Dispatch receipt', 'Delivery confirmation'],
        };

      case 'SPECS_DIFFER':
        return {
          categoryKey,
          step2Title: 'Provide model, SKU, and specification details',
          step2Subtitle: `Confirm the listing specifications and packed variant for ${productRef}.`,
          step2Fields: [
            { key: 'productName', label: 'Product Name', type: 'text', required: true, placeholder: productRef },
            { key: 'productModel', label: 'Model Number / Version', type: 'text', required: true, placeholder: 'e.g., M240-PRO-256' },
            { key: 'sku', label: 'SKU / Part Number', type: 'text', required: true },
            { key: 'productSpecifications', label: 'Shipped Product Specifications', type: 'textarea', placeholder: 'Size, capacity, wattage, material, edition...' },
            { key: 'packingProcessInfo', label: 'Packing Verification Notes', type: 'textarea' },
          ],
          step2UploadTitle: 'Specification & Label Evidence',
          step2UploadHints: ['Product specification sheet', 'Box label / spec sticker photograph', 'Packing slip'],
          step3Title: 'Provide dispatch information',
          step3Subtitle: 'Optional carrier and dispatch confirmation details.',
          step3Fields: [
            { key: 'logisticsProvider', label: 'Logistics Provider', type: 'text' },
            { key: 'dispatchReference', label: 'Dispatch Reference', type: 'text' },
            { key: 'trackingId', label: 'Tracking ID / AWB', type: 'text' },
            { key: 'dispatchDate', label: 'Dispatch Date', type: 'date' },
            { key: 'shipmentStatus', label: 'Shipment Status', type: 'select', options: ['Delivered', 'In Transit', 'Unavailable'] },
          ],
          step3UploadTitle: 'Dispatch Confirmation',
          step3UploadHints: ['Shipment confirmation', 'Invoice / Packing list'],
        };

      case 'PAYMENT_PROBLEM':
        return {
          categoryKey,
          step2Title: 'Provide order-payment verification details',
          step2Subtitle: 'Share merchant-side payment capture and order mapping details.',
          step2Fields: [
            { key: 'productName', label: 'Order Item Reference', type: 'text', placeholder: productRef },
            { key: 'merchantPaymentRef', label: 'Merchant Order-Payment Reference', type: 'text', required: true, placeholder: 'e.g., PAY-MER-90881' },
            { key: 'transactionReference', label: 'Gateway / UTR Transaction Reference', type: 'text', placeholder: 'RRN / Capture ID / UTR' },
            { key: 'paymentConfirmationStatus', label: 'Merchant Payment Confirmation Status', type: 'select', options: ['Captured & Matched', 'Authorized / Pending', 'Failed / Reversed', 'Duplicate Capture Suspected', 'Unavailable'] },
            { key: 'paymentVerificationNotes', label: 'Payment Verification Notes', type: 'textarea', placeholder: 'Explain payment reconciliation status...' },
          ],
          step2UploadTitle: 'Payment & Order Mapping Documents',
          step2UploadHints: ['Merchant payment ledger screenshot', 'Order-payment invoice', 'Gateway capture receipt'],
          step3Title: 'Provide settlement information (where applicable)',
          step3Subtitle: 'Share settlement batch or fulfillment status if applicable to this order.',
          step3Fields: [
            { key: 'settlementReference', label: 'Settlement / Payout Batch ID', type: 'text' },
            { key: 'settlementDate', label: 'Settlement Date', type: 'date' },
            { key: 'dispatchReference', label: 'Order Fulfillment Reference (if shipped)', type: 'text' },
            { key: 'shipmentStatus', label: 'Order Status', type: 'select', options: ['Fulfilled', 'On Hold Pending Payment', 'Cancelled', 'Unavailable'] },
          ],
          step3UploadTitle: 'Settlement & Fulfillment Records',
          step3UploadHints: ['Settlement statement excerpt', 'Order status record'],
        };

      case 'REFUND_NOT_RECEIVED':
        return {
          categoryKey,
          step2Title: 'Provide refund and original payment details',
          step2Subtitle: 'Share the original captured payment reference and refund initiation status.',
          step2Fields: [
            { key: 'productName', label: 'Order Item Reference', type: 'text', placeholder: productRef },
            { key: 'originalPaymentRef', label: 'Original Payment Reference', type: 'text', required: true, placeholder: 'Capture ID / Payment ID' },
            { key: 'refundRequestRef', label: 'Refund Request / Credit Note ID', type: 'text', placeholder: 'e.g., RFD-2026-104' },
            { key: 'refundInitiationStatus', label: 'Refund Initiation Status', type: 'select', options: ['Initiated / Processing', 'Settled to Bank / Source', 'Pending Return Inspection', 'Rejected', 'Not Yet Initiated'] },
            { key: 'refundProcessingNotes', label: 'Refund Processing Notes', type: 'textarea', placeholder: 'Include return verification or refund date details...' },
          ],
          step2UploadTitle: 'Refund & Payment Proof',
          step2UploadHints: ['Refund initiation confirmation', 'Credit note PDF', 'Original payment receipt'],
          step3Title: 'Provide provider confirmation & return tracking',
          step3Subtitle: 'Include ARN/UTR provider confirmation or return receipt status where available.',
          step3Fields: [
            { key: 'providerConfirmationRef', label: 'Provider ARN / UTR Confirmation', type: 'text', placeholder: 'Bank ARN or UPI RRN' },
            { key: 'dispatchDate', label: 'Refund / Return Date', type: 'date' },
            { key: 'trackingId', label: 'Return Pickup Tracking ID (if applicable)', type: 'text' },
            { key: 'shipmentStatus', label: 'Return / Settlement Status', type: 'select', options: ['Settled', 'In Settlement Queue', 'Return Pending', 'Unavailable'] },
          ],
          step3UploadTitle: 'Provider Confirmation & Return Documents',
          step3UploadHints: ['Gateway refund confirmation', 'Return pickup receipt'],
        };

      default:
        return {
          categoryKey: 'OTHER',
          step2Title: 'Provide product and order details',
          step2Subtitle: `Share relevant product, condition, and fulfillment information for ${productRef}.`,
          step2Fields: [
            { key: 'productName', label: 'Product Name', type: 'text', required: true, placeholder: productRef },
            { key: 'productModel', label: 'Model / Variant', type: 'text' },
            { key: 'sku', label: 'SKU / Reference', type: 'text' },
            { key: 'packingProcessInfo', label: 'Product & Fulfillment Notes', type: 'textarea', placeholder: 'Share relevant order, packing, or quality notes...' },
          ],
          step2UploadTitle: 'Supporting Product Documents',
          step2UploadHints: ['Order summary', 'Product or packing photographs'],
          step3Title: 'Provide dispatch information',
          step3Subtitle: 'Share courier and delivery information where available.',
          step3Fields: [
            { key: 'logisticsProvider', label: 'Logistics Provider', type: 'text' },
            { key: 'dispatchReference', label: 'Dispatch Reference', type: 'text' },
            { key: 'trackingId', label: 'Tracking ID', type: 'text' },
            { key: 'dispatchDate', label: 'Dispatch Date', type: 'date' },
            { key: 'shipmentStatus', label: 'Shipment Status', type: 'select', options: ['Delivered', 'In Transit', 'Unavailable'] },
          ],
          step3UploadTitle: 'Dispatch & Delivery Documents',
          step3UploadHints: ['Dispatch receipt', 'Delivery confirmation'],
        };
    }
  }
}
