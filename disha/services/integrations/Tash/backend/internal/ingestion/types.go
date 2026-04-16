package ingestion

import "time"

// ArticleInput is the JSON payload for a single constitution article.
type ArticleInput struct {
	ArticleNumber string `json:"article_number"`
	Title         string `json:"title"`
	Content       string `json:"content"`
	Part          string `json:"part"`
}

// AmendmentInput is the JSON payload for a constitutional amendment.
type AmendmentInput struct {
	AmendmentNumber  string    `json:"amendment_number"`
	Date             time.Time `json:"date"`
	Description      string    `json:"description"`
	AffectedArticles []struct {
		ArticleNumber string `json:"article_number"`
		ChangeType    string `json:"change_type"` // modified | inserted | repealed
	} `json:"affected_articles,omitempty"`
}

// CaseInput is the JSON payload for a legal case/judgment.
type CaseInput struct {
	CaseName       string    `json:"case_name"`
	Court          string    `json:"court"`
	JudgmentDate   time.Time `json:"judgment_date"`
	Summary        string    `json:"summary"`
	ArticleNumbers []string  `json:"article_numbers,omitempty"`
}

// EvidenceInput is the JSON payload for an evidence source.
type EvidenceInput struct {
	SourceType       string    `json:"source_type"`
	Title            string    `json:"title"`
	URL              string    `json:"url"`
	PublishedAt      time.Time `json:"published_at"`
	CredibilityScore float64   `json:"credibility_score"`
}

// IngestResult summarises an ingestion run.
type IngestResult struct {
	Inserted int
	Skipped  int
	Errors   []string
}
