const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "VND_004";
const CASE_NAME = "DesignCraft Interiors - Interior Fit-out Registration";

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
    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) { data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate }; }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: processId, status, currentStatus }) });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try { const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8')); const idx = processes.findIndex(p => p.id === String(processId)); if (idx !== -1) { processes[idx].status = status; processes[idx].currentStatus = currentStatus; fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4)); } } catch (err) { }
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);
    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: {
            vendorName: "DesignCraft Interiors Pvt Ltd",
            gstin: "07AABCD8901R1ZQ",
            pan: "AABCD8901R",
            materialCategory: "Interior Design & Fit-out",
            project: "Goa Luxury Villas, Candolim",
            applicationRef: "VRF-2025-0215",
            contactPerson: "Neha Kapoor",
            annualRevenue: "Rs. 12 Crore"
        }
    });

    const steps = [
        {
            id: "step-1", title_p: "Receiving vendor registration package...",
            title_s: "Vendor application received - DesignCraft Interiors Pvt Ltd",
            reasoning: ["Document: designcraft_vendor_application.pdf", "Application Reference: VRF-2025-0215", "Vendor: DesignCraft Interiors Private Limited", "Category: Interior Design & Fit-out"],
            artifacts: [{ id: "art-reg", type: "file", label: "DesignCraft Vendor Application", pdfPath: "/data/designcraft_vendor_application.pdf" }]
        },
        {
            id: "step-2", title_p: "Extracting firm details from application...",
            title_s: "Firm details extracted - MSME medium enterprise, 85 employees",
            reasoning: ["Company: DesignCraft Interiors Private Limited", "GSTIN: 07AABCD8901R1ZQ | PAN: AABCD8901R", "MSME Registration: UDYAM-DL-07-0045678 (Medium Enterprise)", "Team: 85 employees (45 designers, 40 execution)", "Annual revenue: Rs. 12 Crore", "Proposed project: Conscient Goa Luxury Villas, Candolim"]
        },
        {
            id: "step-3", title_p: "Validating GSTIN on GST portal...",
            title_s: "GSTIN verified - Active status, Delhi registration",
            reasoning: ["GSTIN 07AABCD8901R1ZQ queried on gst.gov.in", "Status: Active", "State: Delhi - matches registered address", "Last return: GSTR-3B December 2024 (filed on time)", "No discrepancies"]
        },
        {
            id: "step-4", title_p: "Verifying PAN and company incorporation records...",
            title_s: "PAN and CIN verified - Incorporated 2015, active company",
            reasoning: ["PAN AABCD8901R validated", "CIN U74999DL2015PTC280456 verified on MCA portal", "Incorporated: 2015 in Delhi", "Status: Active", "No pending NCLT cases"]
        },
        {
            id: "step-5", title_p: "Running financial health assessment...",
            title_s: "Financial health: MODERATE - Revenue Rs. 12 Cr, thin margins (8.3%)",
            reasoning: ["Annual revenue: Rs. 12 Crore (FY24) - meets minimum threshold", "Net profit margin: 8.3% (industry average: 12%)", "No external credit rating available (MSME)", "Debt-to-equity: 0.78 (moderate leverage)", "Revenue growth: 14% YoY (positive trend)", "Score: 15/25 (Financial Health - below average margins)"]
        },
        {
            id: "step-6", title_p: "Running RERA compliance check across state portals...",
            title_s: "WARNING: RERA PENALTY FOUND - UP RERA penalty of Rs. 8 Lakh (2023)",
            reasoning: ["Searched UP RERA, Haryana RERA, Goa RERA, Delhi RERA portals", "PENALTY FOUND on UP RERA portal", "Complaint: UPRERA/C-2023/4421", "Project: Supertech Cape Town, Sector 74, Noida", "Issue: Quality defects in interior work for 120 units", "Details: Paint peeling, improper flooring, non-compliant electrical fittings", "Penalty: Rs. 8,00,000 (paid August 2023)", "Project delayed: 6 months due to rework requirements", "Score: 8/20 (RERA Compliance - major penalty in history)"],
            artifacts: [
                { id: "art-rera", type: "json", label: "RERA Penalty Details", data: { portal: "UP RERA (rera.up.gov.in)", complaint_number: "UPRERA/C-2023/4421", project: "Supertech Cape Town, Sector 74, Noida", respondent: "DesignCraft Interiors Pvt Ltd", category: "Quality Defects + Project Delay", description: "Interior fit-out work in 120 units showed quality defects - paint peeling, improper flooring, non-compliant electrical fittings. Project delayed 6 months.", penalty: "Rs. 8,00,000", order_date: "18/07/2023", compliance: "Penalty paid on 22/08/2023", adjudicating_officer: "Shri R.K. Verma, Member, UP RERA" } },
                { id: "art-rera-video", type: "video", label: "UP RERA Portal - Penalty Search Recording", videoPath: "/data/vnd_004_rera_penalty.webm" }
            ]
        },
        {
            id: "step-7", title_p: "Analyzing penalty details and impact...",
            title_s: "Penalty analysis: Quality issues on 120-unit project, 6-month delay, Rs. 8L fine",
            reasoning: ["Penalty is from July 2023 (18 months ago)", "Issue was quality-related, not fraud or non-compliance", "Vendor paid the penalty promptly (within 35 days)", "120-unit project is comparable scale to Goa villas project", "Quality defects included: paint, flooring, electrical - core interior work", "6-month delay is significant for a residential project", "Risk: Similar quality issues could affect Goa luxury villas"]
        },
        {
            id: "step-8", title_p: "Cross-referencing client references...",
            title_s: "References: 2 of 3 report 'Satisfactory' (not 'Excellent') - lukewarm feedback",
            reasoning: ["Reference 1: Supertech Ltd - 'Satisfactory work but timeline overruns'", "Reference 2: DLF Ltd - 'Good quality, on-time delivery'", "Reference 3: Godrej Properties - 'Satisfactory, work in progress'", "Only 1 of 3 references is strongly positive (DLF)", "Supertech reference aligns with RERA penalty findings", "Score: 5/10 (References - below expectation for luxury project)"]
        },
        {
            id: "step-9", title_p: "Calculating comprehensive vendor risk score...",
            title_s: "Risk Score: 54/100 - MEDIUM-HIGH - Flagged for senior procurement review",
            reasoning: ["GST Status: 20/20 (Active, no issues)", "Financial Health: 15/25 (Thin margins, no credit rating)", "RERA Compliance: 8/20 (Rs. 8L penalty, quality defects)", "Insurance: 0/15 (ISO pending, no specific COI submitted yet)", "References: 5/10 (Lukewarm - 2/3 only 'Satisfactory')", "Certifications: 6/10 (ISO 9001 application pending, not certified)", "TOTAL: 54/100 - MEDIUM-HIGH RISK", "Auto-escalated to senior procurement review queue"],
            artifacts: [{ id: "art-risk", type: "json", label: "Complete Vendor Risk Assessment", data: { vendor: "DesignCraft Interiors Pvt Ltd", overall_score: 54, risk_rating: "MEDIUM-HIGH", breakdown: { gst_status: "20/20", financial_health: "15/25", rera_compliance: "8/20", insurance: "0/15", references: "5/10", certifications: "6/10" }, flags: ["RERA penalty (2023) - quality defects", "Thin margins (8.3% vs 12% industry avg)", "No ISO 9001 certification yet", "Lukewarm references (2/3 satisfactory only)"], recommendation: "SENIOR_REVIEW_REQUIRED", reviewer: "VP Procurement - Conscient Infrastructure" } }]
        },
        {
            id: "step-10", title_p: "Flagging for senior procurement review with complete findings...",
            title_s: "Escalated to Needs Review - Full findings submitted to senior procurement",
            reasoning: ["Case escalated to VP Procurement review queue", "Complete package includes:", "- Vendor application and all documents", "- GST, PAN, CIN verification results", "- RERA penalty details with UP RERA recording", "- Financial health assessment", "- Reference check summary", "- Risk score breakdown (54/100)", "Decision options for reviewer:", "A) Approve with enhanced monitoring", "B) Request additional due diligence", "C) Reject vendor application"]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = i === steps.length - 1;
        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2200);
        updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
        await updateProcessListStatus(PROCESS_ID, isFinal ? "Needs Review" : "In Progress", step.title_s);
        await delay(1500);
    }
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
