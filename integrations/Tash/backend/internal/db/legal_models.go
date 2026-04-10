package db

import "time"

// ConstitutionArticle represents an article of the Indian Constitution.
type ConstitutionArticle struct {
	ID            string    `json:"id"`
	ArticleNumber string    `json:"articleNumber"`
	Title         string    `json:"title"`
	Content       string    `json:"content"`
	Part          string    `json:"part"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
}

// Amendment represents a constitutional amendment.
type Amendment struct {
	ID              string    `json:"id"`
	AmendmentNumber string    `json:"amendmentNumber"`
	Date            time.Time `json:"date"`
	Description     string    `json:"description"`
	CreatedAt       time.Time `json:"createdAt"`
}

// AmendmentArticleMap links an amendment to the articles it modifies.
type AmendmentArticleMap struct {
	ID          string `json:"id"`
	AmendmentID string `json:"amendmentId"`
	ArticleID   string `json:"articleId"`
	ChangeType  string `json:"changeType"` // modified | inserted | repealed
}

// LegalCase represents a court judgment.
type LegalCase struct {
	ID           string    `json:"id"`
	CaseName     string    `json:"caseName"`
	Court        string    `json:"court"`
	JudgmentDate time.Time `json:"judgmentDate"`
	Summary      string    `json:"summary"`
	CreatedAt    time.Time `json:"createdAt"`
}

// CaseArticleMap links a legal case to the articles it interprets.
type CaseArticleMap struct {
	ID        string `json:"id"`
	CaseID    string `json:"caseId"`
	ArticleID string `json:"articleId"`
}

// Law represents a statute or regulation.
type Law struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Section     string    `json:"section"`
	Ministry    string    `json:"ministry"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
}

// EvidenceSource represents a verifiable evidence document.
type EvidenceSource struct {
	ID               string    `json:"id"`
	SourceType       string    `json:"sourceType"` // gazette | court | cag | news
	Title            string    `json:"title"`
	URL              string    `json:"url"`
	PublishedAt      time.Time `json:"publishedAt"`
	CredibilityScore float64   `json:"credibilityScore"`
	CreatedAt        time.Time `json:"createdAt"`
}

// EvidenceLink links an evidence source to any domain entity.
type EvidenceLink struct {
	ID         string `json:"id"`
	EvidenceID string `json:"evidenceId"`
	EntityType string `json:"entityType"` // article | law | case
	EntityID   string `json:"entityId"`
}
