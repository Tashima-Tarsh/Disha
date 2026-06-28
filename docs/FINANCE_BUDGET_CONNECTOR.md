# Finance Budget Connector

DISHA must not invent fiscal numbers.

The connector at `/api/dashboard/finance` builds an official Ministry of Finance source manifest for fiscal years 2015-16 through 2026-27.

It covers the documents needed for:

- Union tax collection
- Receipt Budget tax revenue
- state-wise distribution of net proceeds of Union taxes and duties
- Budget at a Glance receipts
- transfer of resources to states and Union Territories with legislature
- Department of Revenue
- Direct Taxes
- Indirect Taxes
- Transfers to States

## API

```text
/api/dashboard/finance?yearFrom=2015&yearTo=2026
```

Probe official URLs:

```text
/api/dashboard/finance?yearFrom=2015&yearTo=2026&probe=1
```

## Source Authority

Authority:

```text
Ministry of Finance, Government of India
```

Source host:

```text
https://www.indiabudget.gov.in/
```

## What The Connector Returns

Each record contains:

- fiscal year
- document kind
- official title
- official source URL
- expected file format
- data need
- extraction status
- required provenance keys

The connector intentionally returns a source manifest first. It does not fabricate extracted numbers.

## Numeric Extraction Required

For complete tax-collected and state-given data, DISHA still needs a PDF/table extraction stage.

Required extracted tables:

- tax revenue by head
- direct tax receipts
- indirect tax receipts
- receipts actual / revised estimate / budget estimate
- state-wise distribution of Union taxes and duties
- transfer of resources to states and Union Territories with legislature
- Department of Revenue demand details
- Direct Taxes demand details
- Indirect Taxes demand details
- Transfers to States demand details

Every extracted row must carry:

- fiscal year
- source document URL
- page number
- table/statement name
- row label
- column label
- amount
- unit
- extraction timestamp
- checksum where available

Until table extraction exists, DISHA may say an official finance source exists. It must not claim the numeric value is ingested.

## 2026-27

The connector includes 2026-27 as a source-publication check. If the Ministry has not published that budget path yet, records remain marked:

```text
requires_source_publication
```

That is correct behavior. Missing official publication must be shown as missing, not guessed.
