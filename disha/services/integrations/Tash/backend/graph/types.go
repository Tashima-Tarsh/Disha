package graph

import (
	"time"

	"github.com/graphql-go/graphql"

	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/db"
)

// --- Core GraphQL types ---

var userType = graphql.NewObject(graphql.ObjectConfig{
	Name: "User",
	Fields: graphql.Fields{
		"id":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"email":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"role":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var auditCaseType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AuditCase",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"title":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var authPayloadType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AuthPayload",
	Fields: graphql.Fields{
		"token": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"user":  &graphql.Field{Type: graphql.NewNonNull(userType)},
	},
})

// --- Legal GraphQL types ---

var constitutionArticleType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ConstitutionArticle",
	Fields: graphql.Fields{
		"id":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"articleNumber": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"title":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"content":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"part":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"isActive":      &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"createdAt":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var amendmentType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Amendment",
	Fields: graphql.Fields{
		"id":              &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"amendmentNumber": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"date":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var amendmentArticleMapType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AmendmentArticleMap",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"amendmentId": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"articleId":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"changeType":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var legalCaseType = graphql.NewObject(graphql.ObjectConfig{
	Name: "LegalCase",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"caseName":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"court":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"judgmentDate": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"summary":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var caseArticleMapType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CaseArticleMap",
	Fields: graphql.Fields{
		"id":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"caseId":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"articleId": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var lawType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Law",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"name":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"section":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"ministry":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var evidenceSourceType = graphql.NewObject(graphql.ObjectConfig{
	Name: "EvidenceSource",
	Fields: graphql.Fields{
		"id":               &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"sourceType":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"title":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"url":              &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"publishedAt":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"credibilityScore": &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"createdAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var evidenceLinkType = graphql.NewObject(graphql.ObjectConfig{
	Name: "EvidenceLink",
	Fields: graphql.Fields{
		"id":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"evidenceId": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"entityType": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"entityId":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var ingestResultType = graphql.NewObject(graphql.ObjectConfig{
	Name: "IngestResult",
	Fields: graphql.Fields{
		"inserted": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"skipped":  &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"errors":   &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(graphql.String)))},
	},
})

// --- to-map helpers ---

func userToMap(u *db.User) map[string]any {
	return map[string]any{
		"id":        u.ID,
		"email":     u.Email,
		"role":      u.Role,
		"createdAt": u.CreatedAt.Format(time.RFC3339),
	}
}

func auditCaseToMap(c *db.AuditCase) map[string]any {
	return map[string]any{
		"id":          c.ID,
		"title":       c.Title,
		"description": c.Description,
		"status":      c.Status,
		"createdAt":   c.CreatedAt.Format(time.RFC3339),
		"updatedAt":   c.UpdatedAt.Format(time.RFC3339),
	}
}

func articleToMap(a *db.ConstitutionArticle) map[string]any {
	return map[string]any{
		"id":            a.ID,
		"articleNumber": a.ArticleNumber,
		"title":         a.Title,
		"content":       a.Content,
		"part":          a.Part,
		"isActive":      a.IsActive,
		"createdAt":     a.CreatedAt.Format(time.RFC3339),
	}
}

func amendmentToMap(a *db.Amendment) map[string]any {
	return map[string]any{
		"id":              a.ID,
		"amendmentNumber": a.AmendmentNumber,
		"date":            a.Date.Format("2006-01-02"),
		"description":     a.Description,
		"createdAt":       a.CreatedAt.Format(time.RFC3339),
	}
}

func amendmentMapToMap(m *db.AmendmentArticleMap) map[string]any {
	return map[string]any{
		"id":          m.ID,
		"amendmentId": m.AmendmentID,
		"articleId":   m.ArticleID,
		"changeType":  m.ChangeType,
	}
}

func legalCaseToMap(c *db.LegalCase) map[string]any {
	return map[string]any{
		"id":           c.ID,
		"caseName":     c.CaseName,
		"court":        c.Court,
		"judgmentDate": c.JudgmentDate.Format("2006-01-02"),
		"summary":      c.Summary,
		"createdAt":    c.CreatedAt.Format(time.RFC3339),
	}
}

func caseMapToMap(m *db.CaseArticleMap) map[string]any {
	return map[string]any{
		"id":        m.ID,
		"caseId":    m.CaseID,
		"articleId": m.ArticleID,
	}
}

func lawToMap(l *db.Law) map[string]any {
	return map[string]any{
		"id":          l.ID,
		"name":        l.Name,
		"section":     l.Section,
		"ministry":    l.Ministry,
		"description": l.Description,
		"createdAt":   l.CreatedAt.Format(time.RFC3339),
	}
}

func evidenceSourceToMap(e *db.EvidenceSource) map[string]any {
	return map[string]any{
		"id":               e.ID,
		"sourceType":       e.SourceType,
		"title":            e.Title,
		"url":              e.URL,
		"publishedAt":      e.PublishedAt.Format(time.RFC3339),
		"credibilityScore": e.CredibilityScore,
		"createdAt":        e.CreatedAt.Format(time.RFC3339),
	}
}

func evidenceLinkToMap(l *db.EvidenceLink) map[string]any {
	return map[string]any{
		"id":         l.ID,
		"evidenceId": l.EvidenceID,
		"entityType": l.EntityType,
		"entityId":   l.EntityID,
	}
}
