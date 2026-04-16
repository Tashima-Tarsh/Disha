package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool wraps pgxpool.Pool to provide database access.
type Pool struct {
	*pgxpool.Pool
}

// Connect creates a new database connection pool and pings the server.
func Connect(ctx context.Context, dsn string) (*Pool, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("connect to database: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return &Pool{pool}, nil
}

// RunMigrations executes all DDL migrations in order.
func (p *Pool) RunMigrations(ctx context.Context) error {
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

		// Core tables
		`CREATE TABLE IF NOT EXISTS users (
			id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
			email         TEXT        NOT NULL UNIQUE,
			password_hash TEXT        NOT NULL,
			role          TEXT        NOT NULL DEFAULT 'user',
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS audit_cases (
			id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
			title       TEXT        NOT NULL,
			description TEXT        NOT NULL DEFAULT '',
			user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			status      TEXT        NOT NULL DEFAULT 'open',
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS audit_cases_user_id_idx ON audit_cases(user_id)`,

		// Legal tables
		`CREATE TABLE IF NOT EXISTS constitution_articles (
			id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
			article_number TEXT        NOT NULL UNIQUE,
			title          TEXT        NOT NULL,
			content        TEXT        NOT NULL DEFAULT '',
			part           TEXT        NOT NULL DEFAULT '',
			is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
			created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS amendments (
			id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
			amendment_number TEXT        NOT NULL UNIQUE,
			date             DATE        NOT NULL,
			description      TEXT        NOT NULL DEFAULT '',
			created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS amendment_article_maps (
			id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			amendment_id UUID NOT NULL REFERENCES amendments(id) ON DELETE CASCADE,
			article_id   UUID NOT NULL REFERENCES constitution_articles(id) ON DELETE CASCADE,
			change_type  TEXT NOT NULL DEFAULT 'modified',
			UNIQUE (amendment_id, article_id)
		)`,
		`CREATE TABLE IF NOT EXISTS legal_cases (
			id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
			case_name     TEXT        NOT NULL,
			court         TEXT        NOT NULL DEFAULT '',
			judgment_date DATE        NOT NULL,
			summary       TEXT        NOT NULL DEFAULT '',
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS case_article_maps (
			id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			case_id    UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
			article_id UUID NOT NULL REFERENCES constitution_articles(id) ON DELETE CASCADE,
			UNIQUE (case_id, article_id)
		)`,
		`CREATE TABLE IF NOT EXISTS laws (
			id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
			name        TEXT        NOT NULL,
			section     TEXT        NOT NULL DEFAULT '',
			ministry    TEXT        NOT NULL DEFAULT '',
			description TEXT        NOT NULL DEFAULT '',
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS evidence_sources (
			id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
			source_type       TEXT        NOT NULL DEFAULT 'news',
			title             TEXT        NOT NULL,
			url               TEXT        NOT NULL DEFAULT '',
			published_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			credibility_score FLOAT8      NOT NULL DEFAULT 0.5,
			created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS evidence_links (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			evidence_id UUID NOT NULL REFERENCES evidence_sources(id) ON DELETE CASCADE,
			entity_type TEXT NOT NULL,
			entity_id   UUID NOT NULL,
			UNIQUE (evidence_id, entity_type, entity_id)
		)`,
		`CREATE INDEX IF NOT EXISTS amendment_article_maps_article_idx ON amendment_article_maps(article_id)`,
		`CREATE INDEX IF NOT EXISTS case_article_maps_article_idx ON case_article_maps(article_id)`,
		`CREATE INDEX IF NOT EXISTS evidence_links_entity_idx ON evidence_links(entity_type, entity_id)`,
	}

	for _, q := range queries {
		if _, err := p.Exec(ctx, q); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}
	return nil
}
