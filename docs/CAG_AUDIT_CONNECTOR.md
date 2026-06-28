# CAG Audit Connector

DISHA must treat CAG material as official audit evidence, not as dashboard decoration.

The connector at `/api/dashboard/cag` fetches the public CAG audit-report index and returns source-backed report metadata:

- report date
- report year
- government/state/UT label where present
- report type
- title
- official detail URL
- official PDF URL
- summary snippet from CAG
- sector labels
- DISHA topic tags

The connector covers report-level metadata first. It does not invent audit findings.

## Topics

Current topic tags are keyword-based and conservative:

- `digital_governance`
- `ai_data_systems`
- `disaster_ndma_flood`
- `security_terror_border`
- `infrastructure_collapse`
- `financial_audit`
- `health_welfare_education`
- `local_bodies`

These are routing tags, not final findings.

## API

Example:

```text
/api/dashboard/cag?yearFrom=2015&yearTo=2026&topics=financial_audit,disaster_ndma_flood&startPage=1&maxPages=5
```

`maxPages` is capped at 25 per request so the application does not overload the public site. Use `startPage` to walk the CAG index in batches. A full backfill from 2015 onward should run as a scheduled ingest job that stores checksums and source timestamps.

## Finding Discipline

Every record currently has:

```text
extractionStatus: requires_pdf_extraction
```

That is intentional.

Department-wise CAG flags, audit objections, losses, irregularities, disaster gaps, Digital India failures, cyber/data issues, infrastructure failures, and financial audit findings must come from PDF text extraction with:

- report title
- report URL
- PDF URL
- page number
- quoted finding excerpt within copyright limits
- extracted table/paragraph reference where available
- verification timestamp

Until that exists, DISHA may show that a relevant CAG report exists. It must not claim that a specific finding has been proven.

## Production Path

1. Fetch index metadata from CAG.
2. Store report identity, date, sector, type, detail URL, and PDF URL.
3. Download PDF as a versioned artifact.
4. Extract text and tables.
5. Produce finding records with page provenance.
6. Classify finding domain: finance, disaster, digital governance, infrastructure, HSE, security, local body.
7. Attach each finding to the Constitutional Action Ledger.
8. Expose only source-linked findings in dashboard/API.

This keeps DISHA evidence-first and prevents false audit claims.
