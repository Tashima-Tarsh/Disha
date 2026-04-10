package graph

import (
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/ai"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/config"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/db"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/evidence"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/ingestion"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/legal"
)

// Resolver is the root dependency container injected into every GraphQL resolver.
type Resolver struct {
	DB           *db.Pool
	Config       *config.Config
	AIProvider   ai.Provider
	LegalRepo    *legal.Repo
	EvidenceRepo *evidence.Repo
	IngestionSvc *ingestion.Service
}
