package ingestion

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/evidence"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/legal"
)

// Service handles bulk ingestion of legal data.
type Service struct {
	legal    *legal.Repo
	evidence *evidence.Repo
}

// NewService creates a new ingestion service.
func NewService(legalRepo *legal.Repo, evidenceRepo *evidence.Repo) *Service {
	return &Service{legal: legalRepo, evidence: evidenceRepo}
}

// IngestConstitution inserts a batch of constitution articles from a JSON array.
// Duplicate article_number values are silently skipped (idempotent).
func (s *Service) IngestConstitution(ctx context.Context, rawJSON string) (*IngestResult, error) {
	var inputs []ArticleInput
	if err := json.Unmarshal([]byte(rawJSON), &inputs); err != nil {
		return nil, fmt.Errorf("parse constitution JSON: %w", err)
	}

	result := &IngestResult{}
	for _, inp := range inputs {
		if inp.ArticleNumber == "" || inp.Title == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("skip: article_number and title required (got %q)", inp.ArticleNumber))
			result.Skipped++
			continue
		}
		if _, err := s.legal.CreateArticle(ctx, inp.ArticleNumber, inp.Title, inp.Content, inp.Part); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("skip %s: %v", inp.ArticleNumber, err))
			result.Skipped++
			continue
		}
		result.Inserted++
	}
	return result, nil
}

// IngestAmendments inserts amendments and their article mappings.
func (s *Service) IngestAmendments(ctx context.Context, rawJSON string) (*IngestResult, error) {
	var inputs []AmendmentInput
	if err := json.Unmarshal([]byte(rawJSON), &inputs); err != nil {
		return nil, fmt.Errorf("parse amendments JSON: %w", err)
	}

	result := &IngestResult{}
	for _, inp := range inputs {
		if inp.AmendmentNumber == "" {
			result.Errors = append(result.Errors, "skip: amendment_number required")
			result.Skipped++
			continue
		}
		amendment, err := s.legal.CreateAmendment(ctx, inp.AmendmentNumber, inp.Date, inp.Description)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("skip amendment %s: %v", inp.AmendmentNumber, err))
			result.Skipped++
			continue
		}
		result.Inserted++

		// Link to affected articles by article_number lookup.
		if len(inp.AffectedArticles) > 0 {
			articles, _ := s.legal.ListArticles(ctx)
			articleMap := make(map[string]string, len(articles))
			for _, art := range articles {
				articleMap[art.ArticleNumber] = art.ID
			}
			for _, affected := range inp.AffectedArticles {
				artID, ok := articleMap[affected.ArticleNumber]
				if !ok {
					continue
				}
				changeType := affected.ChangeType
				if changeType == "" {
					changeType = "modified"
				}
				if _, err := s.legal.LinkAmendmentToArticle(ctx, amendment.ID, artID, changeType); err != nil {
					result.Errors = append(result.Errors,
						fmt.Sprintf("link amendment %s -> article %s: %v", inp.AmendmentNumber, affected.ArticleNumber, err))
				}
			}
		}
	}
	return result, nil
}

// IngestCases inserts legal cases and their article mappings.
func (s *Service) IngestCases(ctx context.Context, rawJSON string) (*IngestResult, error) {
	var inputs []CaseInput
	if err := json.Unmarshal([]byte(rawJSON), &inputs); err != nil {
		return nil, fmt.Errorf("parse cases JSON: %w", err)
	}

	result := &IngestResult{}
	for _, inp := range inputs {
		if inp.CaseName == "" {
			result.Errors = append(result.Errors, "skip: case_name required")
			result.Skipped++
			continue
		}
		lcase, err := s.legal.CreateCase(ctx, inp.CaseName, inp.Court, inp.JudgmentDate, inp.Summary)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("skip case %s: %v", inp.CaseName, err))
			result.Skipped++
			continue
		}
		result.Inserted++

		if len(inp.ArticleNumbers) > 0 {
			articles, _ := s.legal.ListArticles(ctx)
			articleMap := make(map[string]string, len(articles))
			for _, art := range articles {
				articleMap[art.ArticleNumber] = art.ID
			}
			for _, num := range inp.ArticleNumbers {
				if artID, ok := articleMap[num]; ok {
					if _, err := s.legal.LinkCaseToArticle(ctx, lcase.ID, artID); err != nil {
						result.Errors = append(result.Errors,
							fmt.Sprintf("link case %s -> article %s: %v", inp.CaseName, num, err))
					}
				}
			}
		}
	}
	return result, nil
}

// IngestEvidenceSources inserts evidence source records.
func (s *Service) IngestEvidenceSources(ctx context.Context, rawJSON string) (*IngestResult, error) {
	var inputs []EvidenceInput
	if err := json.Unmarshal([]byte(rawJSON), &inputs); err != nil {
		return nil, fmt.Errorf("parse evidence JSON: %w", err)
	}

	result := &IngestResult{}
	for _, inp := range inputs {
		if inp.Title == "" {
			result.Errors = append(result.Errors, "skip: title required")
			result.Skipped++
			continue
		}
		score := inp.CredibilityScore
		if score < 0 {
			score = 0
		}
		if score > 1 {
			score = 1
		}
		if _, err := s.evidence.AddEvidence(ctx, inp.SourceType, inp.Title, inp.URL, inp.PublishedAt, score); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("skip evidence %q: %v", inp.Title, err))
			result.Skipped++
			continue
		}
		result.Inserted++
	}
	return result, nil
}
