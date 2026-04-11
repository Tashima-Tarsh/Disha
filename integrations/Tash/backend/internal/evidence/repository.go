package evidence

import (
	"context"
	"fmt"
	"time"

	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/db"
)

// Repo handles evidence database operations.
type Repo struct {
	db *db.Pool
}

// NewRepo creates a new evidence repository.
func NewRepo(pool *db.Pool) *Repo {
	return &Repo{db: pool}
}

// AddEvidence inserts a new evidence source record.
func (r *Repo) AddEvidence(ctx context.Context, sourceType, title, url string, publishedAt time.Time, credibilityScore float64) (*db.EvidenceSource, error) {
	var e db.EvidenceSource
	err := r.db.QueryRow(ctx,
		`INSERT INTO evidence_sources (source_type, title, url, published_at, credibility_score)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, source_type, title, url, published_at, credibility_score, created_at`,
		sourceType, title, url, publishedAt, credibilityScore,
	).Scan(&e.ID, &e.SourceType, &e.Title, &e.URL, &e.PublishedAt, &e.CredibilityScore, &e.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("add evidence: %w", err)
	}
	return &e, nil
}

// ListEvidence returns all evidence sources ordered by credibility descending.
func (r *Repo) ListEvidence(ctx context.Context) ([]*db.EvidenceSource, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, source_type, title, url, published_at, credibility_score, created_at
		 FROM evidence_sources ORDER BY credibility_score DESC, created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list evidence: %w", err)
	}
	defer rows.Close()

	var sources []*db.EvidenceSource
	for rows.Next() {
		var e db.EvidenceSource
		if err := rows.Scan(&e.ID, &e.SourceType, &e.Title, &e.URL, &e.PublishedAt, &e.CredibilityScore, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan evidence: %w", err)
		}
		sources = append(sources, &e)
	}
	return sources, nil
}

// LinkEvidence links an evidence source to a domain entity.
func (r *Repo) LinkEvidence(ctx context.Context, evidenceID, entityType, entityID string) (*db.EvidenceLink, error) {
	var l db.EvidenceLink
	err := r.db.QueryRow(ctx,
		`INSERT INTO evidence_links (evidence_id, entity_type, entity_id)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (evidence_id, entity_type, entity_id) DO UPDATE SET evidence_id = EXCLUDED.evidence_id
		 RETURNING id, evidence_id, entity_type, entity_id`,
		evidenceID, entityType, entityID,
	).Scan(&l.ID, &l.EvidenceID, &l.EntityType, &l.EntityID)
	if err != nil {
		return nil, fmt.Errorf("link evidence: %w", err)
	}
	return &l, nil
}

// ListLinksForEntity returns all evidence links for a given entity.
func (r *Repo) ListLinksForEntity(ctx context.Context, entityType, entityID string) ([]*db.EvidenceLink, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, evidence_id, entity_type, entity_id FROM evidence_links
		 WHERE entity_type = $1 AND entity_id = $2`,
		entityType, entityID,
	)
	if err != nil {
		return nil, fmt.Errorf("list evidence links: %w", err)
	}
	defer rows.Close()

	var links []*db.EvidenceLink
	for rows.Next() {
		var l db.EvidenceLink
		if err := rows.Scan(&l.ID, &l.EvidenceID, &l.EntityType, &l.EntityID); err != nil {
			return nil, fmt.Errorf("scan evidence link: %w", err)
		}
		links = append(links, &l)
	}
	return links, nil
}
