package legal

import (
	"context"
	"fmt"
	"time"

	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/db"
)

// Repo handles all legal domain database operations.
type Repo struct {
	db *db.Pool
}

// NewRepo creates a new legal repository.
func NewRepo(pool *db.Pool) *Repo {
	return &Repo{db: pool}
}

// --- ConstitutionArticle ---

// CreateArticle inserts a new constitution article.
func (r *Repo) CreateArticle(ctx context.Context, articleNumber, title, content, part string) (*db.ConstitutionArticle, error) {
	var a db.ConstitutionArticle
	err := r.db.QueryRow(ctx,
		`INSERT INTO constitution_articles (article_number, title, content, part)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, article_number, title, content, part, is_active, created_at`,
		articleNumber, title, content, part,
	).Scan(&a.ID, &a.ArticleNumber, &a.Title, &a.Content, &a.Part, &a.IsActive, &a.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create article: %w", err)
	}
	return &a, nil
}

// ListArticles returns all constitution articles ordered by article_number.
func (r *Repo) ListArticles(ctx context.Context) ([]*db.ConstitutionArticle, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, article_number, title, content, part, is_active, created_at
		 FROM constitution_articles ORDER BY article_number`)
	if err != nil {
		return nil, fmt.Errorf("list articles: %w", err)
	}
	defer rows.Close()

	var articles []*db.ConstitutionArticle
	for rows.Next() {
		var a db.ConstitutionArticle
		if err := rows.Scan(&a.ID, &a.ArticleNumber, &a.Title, &a.Content, &a.Part, &a.IsActive, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan article: %w", err)
		}
		articles = append(articles, &a)
	}
	return articles, nil
}

// GetArticle returns a single article by ID.
func (r *Repo) GetArticle(ctx context.Context, id string) (*db.ConstitutionArticle, error) {
	var a db.ConstitutionArticle
	err := r.db.QueryRow(ctx,
		`SELECT id, article_number, title, content, part, is_active, created_at
		 FROM constitution_articles WHERE id = $1`, id,
	).Scan(&a.ID, &a.ArticleNumber, &a.Title, &a.Content, &a.Part, &a.IsActive, &a.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get article: %w", err)
	}
	return &a, nil
}

// --- Amendment ---

// CreateAmendment inserts a new constitutional amendment.
func (r *Repo) CreateAmendment(ctx context.Context, amendmentNumber string, date time.Time, description string) (*db.Amendment, error) {
	var a db.Amendment
	err := r.db.QueryRow(ctx,
		`INSERT INTO amendments (amendment_number, date, description)
		 VALUES ($1, $2, $3)
		 RETURNING id, amendment_number, date, description, created_at`,
		amendmentNumber, date, description,
	).Scan(&a.ID, &a.AmendmentNumber, &a.Date, &a.Description, &a.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create amendment: %w", err)
	}
	return &a, nil
}

// ListAmendments returns all amendments.
func (r *Repo) ListAmendments(ctx context.Context) ([]*db.Amendment, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, amendment_number, date, description, created_at FROM amendments ORDER BY amendment_number`)
	if err != nil {
		return nil, fmt.Errorf("list amendments: %w", err)
	}
	defer rows.Close()

	var amendments []*db.Amendment
	for rows.Next() {
		var a db.Amendment
		if err := rows.Scan(&a.ID, &a.AmendmentNumber, &a.Date, &a.Description, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan amendment: %w", err)
		}
		amendments = append(amendments, &a)
	}
	return amendments, nil
}

// LinkAmendmentToArticle creates or updates an amendment-article mapping.
func (r *Repo) LinkAmendmentToArticle(ctx context.Context, amendmentID, articleID, changeType string) (*db.AmendmentArticleMap, error) {
	var m db.AmendmentArticleMap
	err := r.db.QueryRow(ctx,
		`INSERT INTO amendment_article_maps (amendment_id, article_id, change_type)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (amendment_id, article_id) DO UPDATE SET change_type = EXCLUDED.change_type
		 RETURNING id, amendment_id, article_id, change_type`,
		amendmentID, articleID, changeType,
	).Scan(&m.ID, &m.AmendmentID, &m.ArticleID, &m.ChangeType)
	if err != nil {
		return nil, fmt.Errorf("link amendment to article: %w", err)
	}
	return &m, nil
}

// --- LegalCase ---

// CreateCase inserts a new legal case.
func (r *Repo) CreateCase(ctx context.Context, caseName, court string, judgmentDate time.Time, summary string) (*db.LegalCase, error) {
	var c db.LegalCase
	err := r.db.QueryRow(ctx,
		`INSERT INTO legal_cases (case_name, court, judgment_date, summary)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, case_name, court, judgment_date, summary, created_at`,
		caseName, court, judgmentDate, summary,
	).Scan(&c.ID, &c.CaseName, &c.Court, &c.JudgmentDate, &c.Summary, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create case: %w", err)
	}
	return &c, nil
}

// ListCases returns all legal cases ordered by judgment date descending.
func (r *Repo) ListCases(ctx context.Context) ([]*db.LegalCase, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, case_name, court, judgment_date, summary, created_at
		 FROM legal_cases ORDER BY judgment_date DESC`)
	if err != nil {
		return nil, fmt.Errorf("list cases: %w", err)
	}
	defer rows.Close()

	var cases []*db.LegalCase
	for rows.Next() {
		var c db.LegalCase
		if err := rows.Scan(&c.ID, &c.CaseName, &c.Court, &c.JudgmentDate, &c.Summary, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan case: %w", err)
		}
		cases = append(cases, &c)
	}
	return cases, nil
}

// LinkCaseToArticle creates a case-article mapping.
func (r *Repo) LinkCaseToArticle(ctx context.Context, caseID, articleID string) (*db.CaseArticleMap, error) {
	var m db.CaseArticleMap
	err := r.db.QueryRow(ctx,
		`INSERT INTO case_article_maps (case_id, article_id)
		 VALUES ($1, $2)
		 ON CONFLICT (case_id, article_id) DO UPDATE SET case_id = EXCLUDED.case_id
		 RETURNING id, case_id, article_id`,
		caseID, articleID,
	).Scan(&m.ID, &m.CaseID, &m.ArticleID)
	if err != nil {
		return nil, fmt.Errorf("link case to article: %w", err)
	}
	return &m, nil
}

// --- Law ---

// CreateLaw inserts a new law.
func (r *Repo) CreateLaw(ctx context.Context, name, section, ministry, description string) (*db.Law, error) {
	var l db.Law
	err := r.db.QueryRow(ctx,
		`INSERT INTO laws (name, section, ministry, description)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, name, section, ministry, description, created_at`,
		name, section, ministry, description,
	).Scan(&l.ID, &l.Name, &l.Section, &l.Ministry, &l.Description, &l.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create law: %w", err)
	}
	return &l, nil
}

// ListLaws returns all laws ordered by name.
func (r *Repo) ListLaws(ctx context.Context) ([]*db.Law, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, section, ministry, description, created_at FROM laws ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list laws: %w", err)
	}
	defer rows.Close()

	var laws []*db.Law
	for rows.Next() {
		var l db.Law
		if err := rows.Scan(&l.ID, &l.Name, &l.Section, &l.Ministry, &l.Description, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan law: %w", err)
		}
		laws = append(laws, &l)
	}
	return laws, nil
}
