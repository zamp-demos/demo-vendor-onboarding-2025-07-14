const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "VND_001";
const CASE_NAME = "UltraTech Cement - Cement Supplier Registration";

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateProcessLog = (processId, logEntry, keyDetailsUpdate = {}) => {
    const processFile = path.join(PUBLIC_DATA_DIR, `process_${processId}.json`);
    let data = { logs: [], keyDetails: {}, sidebarArtifacts: [] };
    if (fs.existsSync(processFile)) data = readJson(processFile);
    if (logEntry) {
        const existingIdx = logEntry.id ? data.logs.findIndex(l => l.id === logEntry.id) : -1;
        if (existingIdx !== -1) { data.logs[existingIdx] = { ...data.logs[existingIdx], ...logEntry }; }
        else { data.logs.push(logEntry); }
    }
    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) {
        data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate };
    }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: processId, status, currentStatus })
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try {
            const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
            const idx = processes.findIndex(p => p.id === String(processId));
            if (idx !== -1) { processes[idx].status = status; processes[idx].currentStatus = currentStatus; fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4)); }
        } catch (err) { }
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: {
            vendorName: "UltraTech Cement Ltd",
            gstin: "06AABCU9603R1ZM",
            pan: "AABCU9603R",
            materialCategory: "Cement & Concrete",
            project: "Elaira Residences, Sector 80, Gurgaon",
            applicationRef: "VRF-2025-0187",
            contactPerson: "Rajesh Kumar Sharma"
        }
    });

    const steps = [
        {
            id: "step-1", title_p: "Receiving vendor registration package...",
            title_s: "Vendor registration package received - 1 application form",
            reasoning: ["Document: ultratech_vendor_registration.pdf (2 pages)", "Application Reference: VRF-2025-0187", "Vendor: UltraTech Cement Limited", "Category: Construction Materials - Cement"],
            artifacts: [{ id: "art-reg", type: "file", label: "UltraTech Vendor Registration Form", pdfPath: "/data/ultratech_vendor_registration.pdf" }]
        },
        {
            id: "step-2", title_p: "Extracting vendor details from application...",
            title_s: "Vendor details extracted - GSTIN, PAN, banking, insurance captured",
            reasoning: ["Company: UltraTech Cement Limited (CIN: L26940RJ2000PLC015926)", "GSTIN: 06AABCU9603R1ZM | PAN: AABCU9603R", "Bank: HDFC Bank, Andheri East (A/C ending 4521)", "Contact: Rajesh Kumar Sharma, Regional Sales Manager", "Supply capacity: 50,000 MT per annum"],
            artifacts: [{ id: "art-extract", type: "json", label: "Extracted Vendor Details", data: { company: "UltraTech Cement Limited", gstin: "06AABCU9603R1ZM", pan: "AABCU9603R", cin: "L26940RJ2000PLC015926", bank: "HDFC Bank (IFSC: HDFC0000123)", contact: "Rajesh Kumar Sharma", capacity: "50,000 MT/annum", products: ["OPC 53 Grade", "PPC", "Ready Mix Concrete", "White Cement"] } }]
        },
        {
            id: "step-3", title_p: "Validating GSTIN on GST portal...",
            title_s: "GSTIN verified - Status: ACTIVE, Haryana registration confirmed",
            reasoning: ["GSTIN 06AABCU9603R1ZM queried on gst.gov.in", "Status: Active (registered since 01/07/2017)", "State: Haryana - matches application address (Gurgaon)", "Taxpayer type: Regular | Constitution: Public Limited", "Last return: GSTR-3B December 2024 filed on 20/01/2025", "No address mismatch detected"],
            artifacts: [
                { id: "art-gst", type: "json", label: "GST Verification Result", data: { gstin: "06AABCU9603R1ZM", legal_name: "ULTRATECH CEMENT LIMITED", status: "Active", state: "Haryana", registration_date: "01/07/2017", last_return: "GSTR-3B Dec 2024", address_match: true } },
                { id: "art-gst-video", type: "video", label: "GST Portal Verification Recording", videoPath: "/data/vnd_001_gst_verification.webm" }
            ]
        },
        {
            id: "step-4", title_p: "Cross-checking PAN with Income Tax records...",
            title_s: "PAN verified - UltraTech Cement Ltd, no discrepancies",
            reasoning: ["PAN AABCU9603R validated against IT database", "Name match: UltraTech Cement Limited - CONFIRMED", "Entity type: Company | Status: Active", "No pending tax demands or litigation found", "CIN L26940RJ2000PLC015926 verified on MCA portal"]
        },
        {
            id: "step-5", title_p: "Running financial health assessment...",
            title_s: "Financial health: STRONG - Revenue Rs. 63,000 Cr, CRISIL AAA rated",
            reasoning: ["Annual revenue: Rs. 63,270 Crore (FY24) - exceeds Rs. 25 Cr threshold", "Net profit margin: 11.2%", "CRISIL Rating: AAA/Stable", "Debt-to-equity: 0.34 (healthy)", "Well above minimum turnover for high-value contracts", "Score: 25/25 (Financial Health)"]
        },
        {
            id: "step-6", title_p: "Checking RERA compliance history across state portals...",
            title_s: "RERA check clean - No penalties or complaints found",
            reasoning: ["Searched Haryana RERA, UP RERA, Maharashtra RERA, Goa RERA portals", "No complaints filed against UltraTech Cement", "No penalty orders found", "No involvement in delayed projects as material supplier", "Score: 20/20 (RERA Compliance)"]
        },
        {
            id: "step-7", title_p: "Verifying insurance certificate...",
            title_s: "Insurance verified - ICICI Lombard, Rs. 10 Cr coverage, valid till Dec 2026",
            reasoning: ["Policy: INS-2024-78923 (ICICI Lombard General Insurance)", "Coverage: Rs. 10,00,00,000 - exceeds minimum Rs. 2 Cr", "Validity: Jan 2025 to Dec 2026 (23 months remaining)", "Includes third-party liability coverage", "Score: 15/15 (Insurance)"]
        },
        {
            id: "step-8", title_p: "Verifying BIS and ISO certifications...",
            title_s: "All certifications valid - ISO 9001, ISO 14001, BIS IS 269 & IS 1489",
            reasoning: ["ISO 9001:2015 - Valid till December 2026", "ISO 14001:2015 - Valid till December 2026", "BIS IS 269:2015 (OPC) - Active certification", "BIS IS 1489:2015 (PPC) - Active certification", "Score: 10/10 (Certifications)"]
        },
        {
            id: "step-9", title_p: "Calculating vendor risk score...",
            title_s: "Risk Score: 82/100 - LOW RISK - Auto-approval eligible",
            reasoning: ["GST Status: 20/20 (Active, address match, recent filing)", "Financial Health: 25/25 (AAA rated, strong revenue)", "RERA Compliance: 20/20 (Clean record across all states)", "Insurance: 15/15 (Adequate coverage, long validity)", "References: Not required for AAA-rated large enterprises", "Certifications: 10/10 (All valid)", "TOTAL: 90/100 - LOW RISK"],
            artifacts: [{ id: "art-risk", type: "json", label: "Vendor Risk Assessment Report", data: { vendor: "UltraTech Cement Ltd", overall_score: 90, risk_rating: "LOW", gst_score: "20/20", financial_score: "25/25", rera_score: "20/20", insurance_score: "15/15", certification_score: "10/10", recommendation: "AUTO-APPROVE", vendor_code: "VND-UCL-2025-0187" } }]
        },
        {
            id: "step-10", title_p: "Creating vendor master record in ERP...",
            title_s: "Vendor master created - Code: VND-UCL-2025-0187, sending welcome email",
            reasoning: ["Vendor code VND-UCL-2025-0187 assigned", "Added to ERP under category: Cement & Concrete", "Payment terms: Net 45 days (standard for AAA vendors)", "Linked to project: Elaira Residences, Sector 80", "Annual re-verification date set: January 2026"],
            artifacts: [{ id: "art-email", type: "email_draft", label: "Welcome Email to UltraTech", data: { isIncoming: false, to: "rajesh.sharma@ultratechcement.com", cc: "procurement@conscient.in", subject: "Welcome to Conscient Infrastructure - Vendor Portal Access", body: "Dear Mr. Rajesh Kumar Sharma,\n\nWelcome to Conscient Infrastructure's vendor network. Your vendor registration has been approved.\n\nVendor Code: VND-UCL-2025-0187\nCategory: Cement & Concrete\nLinked Project: Elaira Residences, Sector 80, Gurgaon\n\nYou can access the procurement portal at: portal.conscient.in/vendors\nUsername: ultratech.cement@vendor.conscient.in\nTemporary Password: [Will be sent separately via SMS]\n\nPlease complete your profile setup within 7 days.\n\nRegards,\nProcurement Team\nConscient Infrastructure Pvt Ltd" } }]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = i === steps.length - 1;
        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000);
        updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
        await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
        await delay(1500);
    }
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
