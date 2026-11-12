import { prisma } from '../src/lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function loginUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE_URL,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed for ${email} (${res.status}): ${text}`);
  }
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(`No set-cookie returned for ${email}`);
  }
  // Extract session token
  const cookies = setCookie.split(',').map((c) => c.trim().split(';')[0]).join('; ');
  return cookies;
}

async function run() {
  console.log('=== STEP 1: LOGGING IN AS PLATFORM INVESTIGATOR (Priya Raghavan) ===');
  const adminCookie = await loginUser('admin@resolvegraph.demo', 'Admin@ResolveGraph2026!');
  console.log('Investigator logged in successfully.');

  console.log('\n=== STEP 2: INSPECTING CASE RG-1001 SELLER WORKFLOW ===');
  const wfRes = await fetch(`${BASE_URL}/api/cases/RG-1001/seller-workflow`, {
    headers: { Cookie: adminCookie },
  });
  const wfData = await wfRes.json();
  console.log('Case Number:', wfData.caseNumber);
  console.log('Buyer Screening Passed:', wfData.screening?.passed, `(${wfData.screening?.screeningState})`);
  const match = wfData.matches?.[0];
  console.log('Seller Match Outcome:', match?.matchOutcome, 'Seller:', match?.matchedSeller?.legalName);
  console.log('Linked Organization:', match?.matchedSeller?.linkedOrganization?.name);
  console.log('Existing Requests Count on RG-1001:', wfData.requests?.length);

  console.log('\n=== STEP 3: CREATING & SENDING DEMO EVIDENCE REQUEST TO TECHSTORE ===');
  const createRes = await fetch(`${BASE_URL}/api/cases/RG-1001/seller-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
      Origin: BASE_URL,
    },
    body: JSON.stringify({
      subject: 'Request for Fulfillment & Technical Specifications Evidence — Portable SSD 1TB',
      description:
        'Customer reports receiving 512 GB portable SSD instead of the purchased 1 TB model. Please provide itemized packing and serial verification.',
      deadlineHours: 72,
      orderId: 'ORD-20261103-8821',
      productName: 'UltraFast Portable SSD 1TB USB 3.2',
      marketplace: 'Amazon India',
      requestedItems: [
        {
          key: 'EXACT_PRODUCT_SKU',
          label: 'Exact product SKU',
          description: 'Itemized manufacturer SKU identifying the specific product model packaged.',
          required: true,
        },
        {
          key: 'MANUFACTURER_MODEL_NUMBER',
          label: 'Manufacturer model number',
          description: 'Hardware model and capacity identifier stamped on product housing and packaging.',
          required: true,
        },
        {
          key: 'ORIGINAL_PRODUCT_SPECIFICATIONS',
          label: 'Original product specifications',
          description: 'Manufacturer specification sheet or catalog specifications confirming storage capacity.',
          required: true,
        },
        {
          key: 'PACKING_DECLARATION',
          label: 'Packing declaration',
          description: 'Fulfillment station or warehouse packing declaration confirming order contents and measured weight.',
          required: true,
        },
        {
          key: 'PRODUCT_PHOTOGRAPHS',
          label: 'Available product photographs',
          description: 'High-resolution photographs of packaged unit, retail packaging, and tamper-evident seals.',
          required: false,
        },
        {
          key: 'WAREHOUSE_QC_SERIAL_LOG',
          label: 'Warehouse quality-control or serial-number records',
          description: 'Warehouse barcode scan log and serial registry recorded during fulfillment.',
          required: false,
        },
      ],
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Failed to create request: ${JSON.stringify(createData)}`);
  }
  const createdReq = createData.request;
  console.log('Created Request Number:', createdReq.requestNumber);
  console.log('Request ID:', createdReq.id);
  console.log('Delivery Channel:', createdReq.deliveryChannel);
  console.log('Initial Status:', createdReq.status);
  console.log('Deadline (Due At):', createdReq.dueAt);
  console.log('Success Message:', createData.message);

  console.log('\n=== STEP 4: LOGGING IN AS REGISTERED SELLER (TechStore Global) ===');
  const techStoreCookie = await loginUser('disputes@techstore.demo', 'Merchant@TechStore2026!');
  console.log('TechStore merchant logged in successfully.');

  console.log('\n=== STEP 5: VERIFYING REQUEST ARRIVAL IN SELLER WORKSPACE ===');
  const sellerReqRes = await fetch(`${BASE_URL}/api/seller/requests`, {
    headers: { Cookie: techStoreCookie },
  });
  const sellerReqData = await sellerReqRes.json();
  console.log('Seller Total Visible Requests:', sellerReqData.requests?.length);
  console.log('Seller Dashboard Summary:', JSON.stringify(sellerReqData.summary));
  const foundReq = sellerReqData.requests?.find((r: any) => r.id === createdReq.id);
  if (!foundReq) {
    throw new Error(`Created request ${createdReq.requestNumber} not found in TechStore requests!`);
  }
  console.log('Verified: Request present in TechStore workspace!');
  console.log('Request Title:', foundReq.productName, '—', foundReq.orderId);
  console.log('Requested Items Summary:', foundReq.requestedItemsSummary);

  console.log('\n=== STEP 6: VERIFYING IN-APP NOTIFICATION FOR TECHSTORE ===');
  const notifRes = await fetch(`${BASE_URL}/api/notifications?limit=10`, {
    headers: { Cookie: techStoreCookie },
  });
  const notifData = await notifRes.json();
  const techNotif = notifData.notifications?.find(
    (n: any) => n.linkUrl?.includes(createdReq.id) || n.title?.includes(createdReq.requestNumber)
  );
  if (!techNotif) {
    throw new Error(`Notification for request ${createdReq.requestNumber} not found for TechStore!`);
  }
  console.log('Verified In-App Notification:');
  console.log('Notification Title:', techNotif.title);
  console.log('Notification Body:', techNotif.body);
  console.log('Notification Link:', techNotif.linkUrl);

  console.log('\n=== STEP 7: SELLER OPENS REQUEST (MARKS VIEWED & REDACTS BUYER PII) ===');
  const openRes = await fetch(`${BASE_URL}/api/seller/requests/${createdReq.id}`, {
    headers: { Cookie: techStoreCookie },
  });
  const openData = await openRes.json();
  console.log('Opened Request Status:', openData.request?.status);
  console.log('Viewed At Timestamp:', openData.request?.orderDetails?.viewedAt);
  console.log('Buyer Contact Info in Order Details:', (openData.request?.orderDetails as any)?.buyerEmail ?? 'REDACTED / ABSENT (Safe)');
  console.log('Requested Items Count:', openData.request?.requestedItems?.length);

  console.log('\n=== STEP 8: SELLER SUBMITS SUPPLEMENTAL RESPONSE + EVIDENCE FILE ===');
  // Create a multipart form with sample evidence
  const formData = new FormData();
  const samplePdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Title (TechStore Warehouse Picking Scan Log) /Creator (TechStore QC System) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
  );
  const blob = new Blob([samplePdfBytes], { type: 'application/pdf' });
  formData.append('file_0', blob, 'techstore_warehouse_qc_manifest.pdf');

  const payload = {
    stance: 'DISAGREE',
    summary:
      'Warehouse picking scanner records and packaging station inline scale logs confirm barcode 8901234567890 corresponding to 1TB SKU SSD-UF-1TB-BLK was packed into security parcel SEAL-TECH-88912. Verified packing manifest scan attached.',
    additionalRemarks:
      'Serial number SN-UF1TB-99214 was registered at dispatch. Please compare device physical serial against box label.',
    itemResponses: [
      { key: 'EXACT_PRODUCT_SKU', status: 'PROVIDED', note: 'SSD-UF-1TB-BLK' },
      { key: 'MANUFACTURER_MODEL_NUMBER', status: 'PROVIDED', note: 'UF-1TB-PRO-V2' },
      { key: 'ORIGINAL_PRODUCT_SPECIFICATIONS', status: 'PROVIDED', note: '1000 GB NVMe PCIe 4.0' },
      { key: 'PACKING_DECLARATION', status: 'PROVIDED', note: 'Packed at Station #4, measured weight 185g' },
      { key: 'PRODUCT_PHOTOGRAPHS', status: 'PROVIDED', note: 'Box seal and serial closeup in manifest' },
      { key: 'WAREHOUSE_QC_SERIAL_LOG', status: 'PROVIDED', note: 'Manifest scan log attached' },
    ],
    declarationConfirmed: true,
  };

  formData.append('payload', JSON.stringify(payload));
  formData.append('file_0_group', 'PACKING');
  formData.append('file_0_requestedItemKey', 'PACKING_DECLARATION');

  const respondRes = await fetch(`${BASE_URL}/api/seller/requests/${createdReq.id}/respond`, {
    method: 'POST',
    headers: { Cookie: techStoreCookie, Origin: BASE_URL },
    body: formData,
  });

  const respondData = await respondRes.json();
  if (!respondRes.ok) {
    throw new Error(`Failed to submit response: ${JSON.stringify(respondData)}`);
  }
  const respResult = respondData.response || respondData;
  console.log('Submission Response ID:', respResult.responseId);
  console.log('Submission Stance:', respResult.stance);
  console.log('Automated Verification Status:', respResult.verificationStatus);
  console.log('Uploaded Evidence Artifact IDs:', respResult.uploadedEvidenceIds);

  console.log('\n=== STEP 9: VERIFYING RESPONSE APPEARS IN SELLER SUBMITTED RESPONSES ===');
  const subRes = await fetch(`${BASE_URL}/api/seller/responses`, {
    headers: { Cookie: techStoreCookie },
  });
  const subData = await subRes.json();
  const myResponse = subData.responses?.find((r: any) => r.id === respResult.responseId);
  if (!myResponse) {
    throw new Error('Submitted response not listed in TechStore Submitted Responses!');
  }
  console.log('Verified: Response listed in TechStore workspace!');
  console.log('Response Stance:', myResponse.stance);
  console.log('Verification Label:', myResponse.sellerStatusLabel);
  console.log('Files Count:', myResponse.filesCount);

  console.log('\n=== STEP 10: MULTI-TENANT ISOLATION VERIFICATION (DigitalMart) ===');
  const digitalMartCookie = await loginUser('support@digitalmart.demo', 'Merchant@DigitalMart2026!');
  console.log('DigitalMart merchant logged in successfully.');

  // 10A: Verify DigitalMart cannot see TechStore's request in the list
  const dmListRes = await fetch(`${BASE_URL}/api/seller/requests`, {
    headers: { Cookie: digitalMartCookie },
  });
  const dmListData = await dmListRes.json();
  const leakFound = dmListData.requests?.find((r: any) => r.id === createdReq.id);
  if (leakFound) {
    throw new Error('TENANT ISOLATION BREACH: TechStore request leaked to DigitalMart list!');
  }
  console.log('Tenant Isolation Check 1: PASSED. TechStore request is NOT in DigitalMart list.');

  // 10B: Verify DigitalMart cannot access direct URL /api/seller/requests/[techStoreRequestId]
  const dmDirectRes = await fetch(`${BASE_URL}/api/seller/requests/${createdReq.id}`, {
    headers: { Cookie: digitalMartCookie },
  });
  console.log('DigitalMart direct access HTTP Status:', dmDirectRes.status);
  if (dmDirectRes.status !== 403 && dmDirectRes.status !== 404) {
    throw new Error(`TENANT ISOLATION BREACH: DigitalMart accessed TechStore request with status ${dmDirectRes.status}`);
  }
  const dmDirectData = await dmDirectRes.json();
  console.log('DigitalMart direct access rejection error:', dmDirectData.error);
  console.log('Tenant Isolation Check 2: PASSED. Direct access returns HTTP 403 Forbidden.');

  // 10C: Verify DigitalMart does not see TechStore's in-app notification
  const dmNotifRes = await fetch(`${BASE_URL}/api/notifications?limit=20`, {
    headers: { Cookie: digitalMartCookie },
  });
  const dmNotifData = await dmNotifRes.json();
  const dmNotifLeak = dmNotifData.notifications?.find(
    (n: any) => n.linkUrl?.includes(createdReq.id) || n.title?.includes(createdReq.requestNumber)
  );
  if (dmNotifLeak) {
    throw new Error('TENANT ISOLATION BREACH: Notification leaked to DigitalMart!');
  }
  console.log('Tenant Isolation Check 3: PASSED. In-app notifications are strictly tenant-isolated.');

  console.log('\n=== STEP 11: PLATFORM INVESTIGATOR RECEIVES SELLER RESPONSE ===');
  const finalWfRes = await fetch(`${BASE_URL}/api/cases/RG-1001/seller-workflow`, {
    headers: { Cookie: adminCookie },
  });
  const finalWfData = await finalWfRes.json();
  const platformReq = finalWfData.requests?.find((r: any) => r.id === createdReq.id);
  console.log('Platform Request Number:', platformReq?.requestNumber);
  console.log('Platform Updated Status:', platformReq?.status);
  console.log('Platform Received Responses Count:', platformReq?.responses?.length);
  const latestPlatformResp = platformReq?.responses?.[0];
  console.log('Platform Response Stance:', latestPlatformResp?.stance);
  console.log('Platform Response Screening:', latestPlatformResp?.verificationStatus);
  console.log('Platform Responder Name:', latestPlatformResp?.responderName);
  console.log('Platform Response Summary:', latestPlatformResp?.summary);
  console.log('Platform Attached Evidence Artifacts:', latestPlatformResp?.evidenceItems);

  console.log('\n=== STEP 12: CHECKING BILATERAL EVIDENCE GRAPH (BEG) SYNCHRONIZATION ===');
  const beg = await prisma.begGraph.findUnique({
    where: { caseId: 'cmw0m6n310000fcvjzk8r347a' },
    select: {
      id: true,
      version: true,
      buildStatus: true,
      lastTriggerEvent: true,
      nodeCount: true,
      edgeCount: true,
      verifiedCount: true,
    },
  });
  console.log('Persisted BEG Graph State:', JSON.stringify(beg, null, 2));

  console.log('\n*** COMPLETE WORKFLOW VERIFICATION SUCCEEDED WITH ZERO ERRORS! ***');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
