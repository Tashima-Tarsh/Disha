export type FinanceDocumentKind =
  | "budget_index"
  | "budget_at_a_glance_receipts"
  | "budget_at_a_glance_state_transfers"
  | "receipt_budget_full"
  | "tax_revenue"
  | "state_tax_devolution_be"
  | "state_tax_devolution_re"
  | "state_tax_devolution_actual"
  | "department_revenue"
  | "direct_taxes"
  | "indirect_taxes"
  | "transfers_to_states";

export type FinanceDocumentRecord = {
  id: string;
  fiscalYear: string;
  budgetYear: number;
  kind: FinanceDocumentKind;
  title: string;
  authority: "Ministry of Finance, Government of India";
  sourceUrl: string;
  expectedFormat: "html" | "pdf";
  dataNeed: "tax_collected" | "state_devolution" | "department_finance_audit" | "transfer_to_states";
  extractionStatus: "source_manifest" | "requires_pdf_table_extraction" | "requires_source_publication";
  provenanceKeys: string[];
};

export type FinanceProbe = {
  id: string;
  ok: boolean;
  status: number | null;
  checkedAt: string;
  sourceUrl: string;
  contentType?: string | null;
  contentLength?: string | null;
  error?: string;
};

export type FinanceBudgetResult = {
  generatedAt: string;
  sourceNotice: string;
  query: {
    yearFrom: number;
    yearTo: number;
    probe: boolean;
  };
  coverage: {
    fiscalYears: number;
    documentRecords: number;
    taxCollectionDocuments: number;
    stateDevolutionDocuments: number;
    departmentDocuments: number;
    extraction: "requires_pdf_table_extraction_with_page_and_table_provenance";
  };
  records: FinanceDocumentRecord[];
  probes: FinanceProbe[];
};

const AUTHORITY = "Ministry of Finance, Government of India" as const;
const BASE_URL = "https://www.indiabudget.gov.in";

const DOCUMENT_TEMPLATES: Array<{
  kind: FinanceDocumentKind;
  title: string;
  newPath?: string;
  oldPath?: string;
  expectedFormat: "html" | "pdf";
  dataNeed: FinanceDocumentRecord["dataNeed"];
  extractionStatus: FinanceDocumentRecord["extractionStatus"];
  provenanceKeys: string[];
}> = [
  {
    kind: "budget_index",
    title: "Union Budget index",
    expectedFormat: "html",
    dataNeed: "department_finance_audit",
    extractionStatus: "source_manifest",
    provenanceKeys: ["fiscal_year", "budget_url", "published_document_links"],
  },
  {
    kind: "budget_at_a_glance_receipts",
    title: "Budget at a Glance - Receipts",
    newPath: "doc/Budget_at_Glance/bag5.pdf",
    expectedFormat: "pdf",
    dataNeed: "tax_collected",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "receipt_head", "be", "re", "actual", "page_number", "source_pdf"],
  },
  {
    kind: "budget_at_a_glance_state_transfers",
    title: "Budget at a Glance - Transfer of Resources to States and UTs with Legislature",
    newPath: "doc/Budget_at_Glance/bag3.pdf",
    expectedFormat: "pdf",
    dataNeed: "transfer_to_states",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "state_or_ut", "transfer_head", "amount", "page_number", "source_pdf"],
  },
  {
    kind: "receipt_budget_full",
    title: "Receipt Budget full document",
    newPath: "doc/rec/allrec.pdf",
    oldPath: "rec/allrec.pdf",
    expectedFormat: "pdf",
    dataNeed: "tax_collected",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "receipt_head", "amount", "page_number", "source_pdf"],
  },
  {
    kind: "tax_revenue",
    title: "Receipt Budget - Tax Revenue",
    newPath: "doc/rec/tr.pdf",
    oldPath: "rec/tr.pdf",
    expectedFormat: "pdf",
    dataNeed: "tax_collected",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "tax_head", "be", "re", "actual", "page_number", "source_pdf"],
  },
  {
    kind: "state_tax_devolution_be",
    title: "Statement showing State-wise Distribution of Net Proceeds of Union Taxes and Duties - BE",
    newPath: "doc/rec/annex4.pdf",
    oldPath: "rec/annex4.pdf",
    expectedFormat: "pdf",
    dataNeed: "state_devolution",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "state", "tax_head", "be_amount", "page_number", "source_pdf"],
  },
  {
    kind: "state_tax_devolution_re",
    title: "Statement showing State-wise Distribution of Net Proceeds of Union Taxes and Duties - RE",
    newPath: "doc/rec/annex4a.pdf",
    oldPath: "rec/annex4a.pdf",
    expectedFormat: "pdf",
    dataNeed: "state_devolution",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "state", "tax_head", "re_amount", "page_number", "source_pdf"],
  },
  {
    kind: "state_tax_devolution_actual",
    title: "Statement showing State-wise Distribution of Net Proceeds of Union Taxes and Duties - Actual",
    newPath: "doc/rec/annex4b.pdf",
    oldPath: "rec/annex4b.pdf",
    expectedFormat: "pdf",
    dataNeed: "state_devolution",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "state", "tax_head", "actual_amount", "page_number", "source_pdf"],
  },
  {
    kind: "department_revenue",
    title: "Expenditure Budget - Department of Revenue",
    newPath: "doc/eb/sbe35.pdf",
    expectedFormat: "pdf",
    dataNeed: "department_finance_audit",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "demand_number", "scheme_or_head", "amount", "page_number", "source_pdf"],
  },
  {
    kind: "direct_taxes",
    title: "Expenditure Budget - Direct Taxes",
    newPath: "doc/eb/sbe36.pdf",
    expectedFormat: "pdf",
    dataNeed: "department_finance_audit",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "demand_number", "scheme_or_head", "amount", "page_number", "source_pdf"],
  },
  {
    kind: "indirect_taxes",
    title: "Expenditure Budget - Indirect Taxes",
    newPath: "doc/eb/sbe37.pdf",
    expectedFormat: "pdf",
    dataNeed: "department_finance_audit",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "demand_number", "scheme_or_head", "amount", "page_number", "source_pdf"],
  },
  {
    kind: "transfers_to_states",
    title: "Expenditure Budget - Transfers to States",
    newPath: "doc/eb/sbe42.pdf",
    expectedFormat: "pdf",
    dataNeed: "transfer_to_states",
    extractionStatus: "requires_pdf_table_extraction",
    provenanceKeys: ["fiscal_year", "state", "grant_or_transfer_head", "amount", "page_number", "source_pdf"],
  },
];

export async function fetchFinanceBudgetRecords({
  yearFrom = 2015,
  yearTo = 2026,
  probe = false,
}: {
  yearFrom?: number;
  yearTo?: number;
  probe?: boolean;
} = {}): Promise<FinanceBudgetResult> {
  const generatedAt = new Date().toISOString();
  const from = Math.min(yearFrom, yearTo);
  const to = Math.max(yearFrom, yearTo);
  const fiscalYears = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  const records = fiscalYears.flatMap((year) => buildYearRecords(year));
  const probes = probe
    ? await Promise.all(records.map((record) => probeFinanceDocument(record, generatedAt)))
    : [];

  return {
    generatedAt,
    sourceNotice:
      "Official Ministry of Finance source manifest for Union Budget, tax receipts, state tax devolution, and transfers to states. Numeric tables require PDF extraction before being treated as complete data.",
    query: {
      yearFrom: from,
      yearTo: to,
      probe,
    },
    coverage: {
      fiscalYears: fiscalYears.length,
      documentRecords: records.length,
      taxCollectionDocuments: records.filter((record) => record.dataNeed === "tax_collected").length,
      stateDevolutionDocuments: records.filter((record) => record.dataNeed === "state_devolution").length,
      departmentDocuments: records.filter((record) => record.dataNeed === "department_finance_audit").length,
      extraction: "requires_pdf_table_extraction_with_page_and_table_provenance",
    },
    records,
    probes,
  };
}

function buildYearRecords(budgetYear: number): FinanceDocumentRecord[] {
  const fiscalYear = `${budgetYear}-${String((budgetYear + 1) % 100).padStart(2, "0")}`;
  const basePath = budgetBasePath(budgetYear);
  const sourcePublished = budgetYear >= 2015 && budgetYear <= 2025;

  return DOCUMENT_TEMPLATES.flatMap((template) => {
    const sourceUrl = template.kind === "budget_index"
      ? budgetIndexUrl(budgetYear)
      : documentUrl(budgetYear, template.newPath, template.oldPath);
    if (!sourceUrl) return [];

    return [{
      id: `finance-${fiscalYear}-${template.kind}`,
      fiscalYear,
      budgetYear,
      kind: template.kind,
      title: template.title,
      authority: AUTHORITY,
      sourceUrl,
      expectedFormat: template.expectedFormat,
      dataNeed: template.dataNeed,
      extractionStatus: sourcePublished
        ? template.extractionStatus
        : "requires_source_publication",
      provenanceKeys: template.provenanceKeys,
    }];
  }).filter((record) => Boolean(basePath) || record.kind === "budget_index");
}

async function probeFinanceDocument(
  record: FinanceDocumentRecord,
  checkedAt: string,
): Promise<FinanceProbe> {
  try {
    const response = await fetch(record.sourceUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        "user-agent": "DISHA-finance-budget-connector/1.0",
        range: "bytes=0-2047",
      },
    });
    return {
      id: record.id,
      ok: response.ok || response.status === 206,
      status: response.status,
      checkedAt,
      sourceUrl: record.sourceUrl,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    };
  } catch (error) {
    return {
      id: record.id,
      ok: false,
      status: null,
      checkedAt,
      sourceUrl: record.sourceUrl,
      error: error instanceof Error ? error.message : "Unknown finance document probe error",
    };
  }
}

function documentUrl(
  budgetYear: number,
  newPath?: string,
  oldPath?: string,
): string | null {
  const basePath = budgetBasePath(budgetYear);
  if (!basePath) return null;
  if (budgetYear <= 2018 && oldPath) return `${BASE_URL}/${basePath}/${oldPath}`;
  if (budgetYear >= 2019 && newPath) return `${BASE_URL}/${basePath}/${newPath}`;
  return null;
}

function budgetIndexUrl(budgetYear: number): string {
  const basePath = budgetBasePath(budgetYear);
  return basePath ? `${BASE_URL}/${basePath}/` : `${BASE_URL}/budget${budgetYear}-${String((budgetYear + 1) % 100).padStart(2, "0")}/`;
}

function budgetBasePath(budgetYear: number): string | null {
  const shortNext = String((budgetYear + 1) % 100).padStart(2, "0");
  if (budgetYear >= 2019 && budgetYear <= 2025) {
    return `budget${budgetYear}-${shortNext}`;
  }
  if (budgetYear >= 2015 && budgetYear <= 2018) {
    return `budget${budgetYear}-${budgetYear + 1}/ub${budgetYear}-${shortNext}`;
  }
  return null;
}
