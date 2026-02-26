const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "VND_003";
const CASE_NAME = "Daikin India - HVAC Contractor Registration";

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

const waitForEmail = async () => {
    console.log("Waiting for user to send email...");
    const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
    try { await fetch(`${API_URL}/email-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sent: false }) }); } catch (e) { }
    while (true) {
        try {
            const response = await fetch(`${API_URL}/email-status`);
            if (response.ok) { const { sent } = await response.json(); if (sent) { console.log("Email Sent!"); return true; } }
        } catch (e) { }
        await delay(2000);
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);
    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: {
            vendorName: "Daikin Airconditioning India Pvt Ltd",
            gstin: "06AABCD4567R1ZK",
            pan: "AABCD4567R",
            materialCategory: "HVAC Systems",
            project: "PARQ, Sector 80, Gurgaon",
            applicationRef: "CRF-2025-0089",
            contactPerson: "Amit Deshmukh",
            contractValue: "Rs. 15 Crore"
        }
    });

    const steps = [
        {
            id: "step-1", title_p: "Receiving contractor registration package...",
            title_s: "Contractor registration received - Daikin Airconditioning India",
            reasoning: ["Document: daikin_contractor_application.pdf", "Application Reference: CRF-2025-0089", "Contractor: Daikin Airconditioning India Pvt Ltd", "Category: HVAC Systems (Safety-Critical)"],
            artifacts: [{ id: "art-reg", type: "file", label: "Daikin Contractor Application Form", pdfPath: "/data/daikin_contractor_application.pdf" }]
        },
        {
            id: "step-2", title_p: "Extracting contractor details from application...",
            title_s: "Contractor details extracted - License, insurance, capacity captured",
            reasoning: ["Company: Daikin Airconditioning India Pvt Ltd", "GSTIN: 06AABCD4567R1ZK | PAN: AABCD4567R", "License: Class A HVAC Contractor (Haryana PWD)", "Project capacity: Up to 500 TR per project", "Estimated contract value: Rs. 15 Crore", "Services: VRV/VRF, Central AC, Chiller Plants, AMC"]
        },
        {
            id: "step-3", title_p: "Validating GSTIN on GST portal...",
            title_s: "GSTIN verified - Status: ACTIVE, Haryana registration confirmed",
            reasoning: ["GSTIN 06AABCD4567R1ZK queried on gst.gov.in", "Status: Active (registered since 01/07/2017)", "State: Haryana - matches application", "Last return: GSTR-3B December 2024 (filed on time)", "No discrepancies found"]
        },
        {
            id: "step-4", title_p: "Verifying contractor license...",
            title_s: "License verified - Class A HVAC Contractor, valid Haryana PWD license",
            reasoning: ["License type: Class A HVAC Contractor", "Issuing authority: Haryana Public Works Department", "Valid for projects up to Rs. 50 Crore", "Current project (Rs. 15 Cr) within licensed capacity", "License renewal due: March 2026"]
        },
        {
            id: "step-5", title_p: "Checking Certificate of Insurance...",
            title_s: "CRITICAL: Insurance EXPIRED - COI lapsed 3 months ago (Sep 30, 2024)",
            reasoning: ["Policy: INS-2023-34521 (Bajaj Allianz General Insurance)", "Coverage: Rs. 5 Crore - meets minimum for safety-critical", "BUT: Policy expired September 30, 2024", "Current date: January 15, 2025 - GAP OF 3+ MONTHS", "No coverage during gap period = liability exposure", "Rs. 15 Crore HVAC contract CANNOT proceed without valid insurance", "HVAC is safety-critical category - insurance is mandatory"],
            artifacts: [{ id: "art-ins", type: "json", label: "Insurance Verification - EXPIRED", data: { policy_number: "INS-2023-34521", insurer: "Bajaj Allianz General Insurance", coverage: "Rs. 5,00,00,000", start_date: "01/10/2023", end_date: "30/09/2024", status: "EXPIRED", gap_days: 107, minimum_required: "Rs. 5 Crore (safety-critical)", risk: "No third-party liability coverage active", action_required: "Request updated COI before proceeding" } }]
        },
        {
            id: "step-6", title_p: "Assessing risk exposure from insurance gap...",
            title_s: "Risk assessment: High liability exposure on Rs. 15 Cr contract without insurance",
            reasoning: ["Contract value: Rs. 15,00,00,000", "Insurance gap: 107 days (Oct 1, 2024 - Jan 15, 2025)", "HVAC installation involves: electrical work, refrigerant handling, height work", "Without valid COI, Conscient bears full liability for:", "- Worker injury claims", "- Third-party property damage", "- Equipment malfunction claims", "Recommendation: Draft email requesting updated COI with min Rs. 5 Cr coverage"]
        },
        {
            id: "step-7", title_p: "Drafting email to vendor requesting updated insurance...",
            title_s: "Email drafted - Review and send request for updated Certificate of Insurance",
            reasoning: ["Drafted formal request to Daikin India", "Requesting: Updated COI with minimum Rs. 5 Crore coverage", "Must include: Third-party liability, workmen compensation", "SLA: 7 business days to provide updated certificate", "Vendor onboarding paused until insurance received"],
            artifacts: [{ id: "art-email", type: "email_draft", label: "Insurance Update Request to Daikin", data: { isIncoming: false, to: "amit.deshmukh@daikinindia.com", cc: "insurance@daikinindia.com, procurement@conscient.in", subject: "URGENT: Updated Certificate of Insurance Required - Vendor Registration CRF-2025-0089", body: "Dear Mr. Amit Deshmukh,\n\nDuring the vendor registration review for Daikin Airconditioning India (Application: CRF-2025-0089), we identified that your Certificate of Insurance (Policy INS-2023-34521, Bajaj Allianz) expired on September 30, 2024.\n\nAs the HVAC contract for Conscient PARQ (Sector 80, Gurgaon) is classified as safety-critical with a value of Rs. 15 Crore, we require a valid Certificate of Insurance before we can proceed.\n\nRequirements:\n- Minimum coverage: Rs. 5,00,00,000 (Five Crore)\n- Must include: Third-party liability & workmen compensation\n- Policy must be current and valid for at least 12 months\n\nPlease provide the updated COI within 7 business days. Your vendor registration is on hold pending this document.\n\nRegards,\nProcurement Team\nConscient Infrastructure Pvt Ltd\nTel: +91 124 456 7890" } }]
        },
        {
            id: "step-8", title_p: "Logging follow-up task with 7-day SLA...",
            title_s: "Follow-up task created - SLA: January 24, 2025, vendor status: Pending Documents",
            reasoning: ["Follow-up task ID: FU-2025-0089-INS", "Assigned to: Procurement Team", "SLA deadline: January 24, 2025 (7 business days)", "Auto-reminder set for: January 22, 2025", "If no response: Escalate to VP Procurement"],
            artifacts: [{ id: "art-status", type: "json", label: "Vendor Registration Status", data: { vendor: "Daikin Airconditioning India Pvt Ltd", vendor_code: "VND-DAI-2025-0089", status: "PENDING_DOCUMENTS", pending_item: "Certificate of Insurance (COI)", sla_deadline: "2025-01-24", reminder_date: "2025-01-22", escalation: "VP Procurement if no response by SLA", project_impact: "PARQ HVAC installation delayed until insurance verified" } }]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = i === steps.length - 1;
        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000);

        if (step.id === "step-7") {
            updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_s, status: "warning", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", "Draft Review: Email Pending");
            await waitForEmail();
            updateProcessLog(PROCESS_ID, { id: step.id, title: "Email sent to Daikin requesting updated insurance", status: "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Email sent to vendor");
            await delay(1500);
        } else {
            updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
            await delay(1500);
        }
    }
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
