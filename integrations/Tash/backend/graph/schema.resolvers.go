package graph

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/graphql-go/graphql"

	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/auth"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/db"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/middleware"
)

var emailRE = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// contextKey is the type used for context keys in this package.
type contextKey string

const resolverKey contextKey = "resolver"

// WithResolver returns a new context carrying the Resolver.
func WithResolver(ctx context.Context, r *Resolver) context.Context {
	return context.WithValue(ctx, resolverKey, r)
}

func resolverFrom(ctx context.Context) (*Resolver, error) {
	r, ok := ctx.Value(resolverKey).(*Resolver)
	if !ok || r == nil {
		return nil, errors.New("resolver not in context")
	}
	return r, nil
}

func requireAuth(ctx context.Context) (string, error) {
	userID, ok := ctx.Value(middleware.ContextKeyUserID).(string)
	if !ok || userID == "" {
		return "", errors.New("authentication required")
	}
	return userID, nil
}

// allowed-value sets
var (
	validChangeTypes = map[string]bool{"modified": true, "inserted": true, "repealed": true}
	validSourceTypes = map[string]bool{"gazette": true, "court": true, "cag": true, "news": true}
	validEntityTypes = map[string]bool{"article": true, "law": true, "case": true}
)

// --- Auth resolvers ---

func resolveRegister(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	email, _ := p.Args["email"].(string)
	password, _ := p.Args["password"].(string)
	if email == "" || password == "" {
		return nil, errors.New("email and password are required")
	}
	if !emailRE.MatchString(email) {
		return nil, errors.New("invalid email format")
	}
	if len(password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("internal error: %w", err)
	}
	var u db.User
	if err := r.DB.QueryRow(p.Context,
		`INSERT INTO users (email, password_hash) VALUES ($1, $2)
		 RETURNING id, email, password_hash, role, created_at`,
		email, hash,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt); err != nil {
		return nil, errors.New("registration failed: email may already be registered")
	}
	token, err := auth.GenerateToken(r.Config.JWTSecret, u.ID, u.Role)
	if err != nil {
		return nil, fmt.Errorf("internal error: %w", err)
	}
	return map[string]any{"token": token, "user": userToMap(&u)}, nil
}

func resolveLogin(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	email, _ := p.Args["email"].(string)
	password, _ := p.Args["password"].(string)
	if email == "" || password == "" {
		return nil, errors.New("email and password are required")
	}
	var u db.User
	if err := r.DB.QueryRow(p.Context,
		`SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt); err != nil {
		return nil, errors.New("invalid credentials")
	}
	if !auth.CheckPassword(u.PasswordHash, password) {
		return nil, errors.New("invalid credentials")
	}
	token, err := auth.GenerateToken(r.Config.JWTSecret, u.ID, u.Role)
	if err != nil {
		return nil, fmt.Errorf("internal error: %w", err)
	}
	return map[string]any{"token": token, "user": userToMap(&u)}, nil
}

// --- AuditCase resolvers ---

func resolveCreateAuditCase(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	userID, err := requireAuth(p.Context)
	if err != nil {
		return nil, err
	}
	title, _ := p.Args["title"].(string)
	description, _ := p.Args["description"].(string)
	if title == "" {
		return nil, errors.New("title is required")
	}
	var c db.AuditCase
	if err := r.DB.QueryRow(p.Context,
		`INSERT INTO audit_cases (title, description, user_id)
		 VALUES ($1, $2, $3)
		 RETURNING id, title, description, user_id, status, created_at, updated_at`,
		title, description, userID,
	).Scan(&c.ID, &c.Title, &c.Description, &c.UserID, &c.Status, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return nil, fmt.Errorf("create audit case: %w", err)
	}
	return auditCaseToMap(&c), nil
}

func resolveListAuditCases(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	userID, err := requireAuth(p.Context)
	if err != nil {
		return nil, err
	}
	rows, err := r.DB.Query(p.Context,
		`SELECT id, title, description, user_id, status, created_at, updated_at
		 FROM audit_cases WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list audit cases: %w", err)
	}
	defer rows.Close()
	var cases []any
	for rows.Next() {
		var c db.AuditCase
		if err := rows.Scan(&c.ID, &c.Title, &c.Description, &c.UserID, &c.Status, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan audit case: %w", err)
		}
		cases = append(cases, auditCaseToMap(&c))
	}
	if cases == nil {
		cases = []any{}
	}
	return cases, nil
}

func resolveMe(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	userID, err := requireAuth(p.Context)
	if err != nil {
		return nil, err
	}
	var u db.User
	if err := r.DB.QueryRow(p.Context,
		`SELECT id, email, password_hash, role, created_at FROM users WHERE id = $1`, userID,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt); err != nil {
		return nil, errors.New("user not found")
	}
	return userToMap(&u), nil
}

// --- Legal resolvers ---

func resolveCreateArticle(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	articleNumber, _ := p.Args["articleNumber"].(string)
	title, _ := p.Args["title"].(string)
	content, _ := p.Args["content"].(string)
	part, _ := p.Args["part"].(string)
	if articleNumber == "" || title == "" {
		return nil, errors.New("articleNumber and title are required")
	}
	art, err := r.LegalRepo.CreateArticle(p.Context, articleNumber, title, content, part)
	if err != nil {
		return nil, fmt.Errorf("create article: %w", err)
	}
	return articleToMap(art), nil
}

func resolveListArticles(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	articles, err := r.LegalRepo.ListArticles(p.Context)
	if err != nil {
		return nil, err
	}
	out := make([]any, 0, len(articles))
	for _, a := range articles {
		out = append(out, articleToMap(a))
	}
	return out, nil
}

func resolveGetArticle(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	id, _ := p.Args["id"].(string)
	if id == "" {
		return nil, errors.New("id is required")
	}
	art, err := r.LegalRepo.GetArticle(p.Context, id)
	if err != nil {
		return nil, err
	}
	return articleToMap(art), nil
}

func resolveCreateAmendment(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	amendmentNumber, _ := p.Args["amendmentNumber"].(string)
	dateStr, _ := p.Args["date"].(string)
	description, _ := p.Args["description"].(string)
	if amendmentNumber == "" || dateStr == "" {
		return nil, errors.New("amendmentNumber and date are required")
	}
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, errors.New("date must be in YYYY-MM-DD format")
	}
	amendment, err := r.LegalRepo.CreateAmendment(p.Context, amendmentNumber, date, description)
	if err != nil {
		return nil, fmt.Errorf("create amendment: %w", err)
	}
	return amendmentToMap(amendment), nil
}

func resolveListAmendments(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	amendments, err := r.LegalRepo.ListAmendments(p.Context)
	if err != nil {
		return nil, err
	}
	out := make([]any, 0, len(amendments))
	for _, a := range amendments {
		out = append(out, amendmentToMap(a))
	}
	return out, nil
}

func resolveLinkAmendmentToArticle(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	amendmentID, _ := p.Args["amendmentId"].(string)
	articleID, _ := p.Args["articleId"].(string)
	changeType, _ := p.Args["changeType"].(string)
	if changeType == "" {
		changeType = "modified"
	}
	if !validChangeTypes[changeType] {
		return nil, errors.New("changeType must be one of: modified, inserted, repealed")
	}
	m, err := r.LegalRepo.LinkAmendmentToArticle(p.Context, amendmentID, articleID, changeType)
	if err != nil {
		return nil, fmt.Errorf("link amendment: %w", err)
	}
	return amendmentMapToMap(m), nil
}

func resolveCreateCase(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	caseName, _ := p.Args["caseName"].(string)
	court, _ := p.Args["court"].(string)
	dateStr, _ := p.Args["judgmentDate"].(string)
	summary, _ := p.Args["summary"].(string)
	if caseName == "" || dateStr == "" {
		return nil, errors.New("caseName and judgmentDate are required")
	}
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, errors.New("judgmentDate must be in YYYY-MM-DD format")
	}
	lcase, err := r.LegalRepo.CreateCase(p.Context, caseName, court, date, summary)
	if err != nil {
		return nil, fmt.Errorf("create case: %w", err)
	}
	return legalCaseToMap(lcase), nil
}

func resolveListCases(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	cases, err := r.LegalRepo.ListCases(p.Context)
	if err != nil {
		return nil, err
	}
	out := make([]any, 0, len(cases))
	for _, c := range cases {
		out = append(out, legalCaseToMap(c))
	}
	return out, nil
}

func resolveLinkCaseToArticle(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	caseID, _ := p.Args["caseId"].(string)
	articleID, _ := p.Args["articleId"].(string)
	m, err := r.LegalRepo.LinkCaseToArticle(p.Context, caseID, articleID)
	if err != nil {
		return nil, fmt.Errorf("link case: %w", err)
	}
	return caseMapToMap(m), nil
}

func resolveCreateLaw(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	name, _ := p.Args["name"].(string)
	section, _ := p.Args["section"].(string)
	ministry, _ := p.Args["ministry"].(string)
	description, _ := p.Args["description"].(string)
	if name == "" {
		return nil, errors.New("name is required")
	}
	l, err := r.LegalRepo.CreateLaw(p.Context, name, section, ministry, description)
	if err != nil {
		return nil, fmt.Errorf("create law: %w", err)
	}
	return lawToMap(l), nil
}

func resolveListLaws(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	laws, err := r.LegalRepo.ListLaws(p.Context)
	if err != nil {
		return nil, err
	}
	out := make([]any, 0, len(laws))
	for _, l := range laws {
		out = append(out, lawToMap(l))
	}
	return out, nil
}

// --- Evidence resolvers ---

func resolveAddEvidence(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	sourceType, _ := p.Args["sourceType"].(string)
	title, _ := p.Args["title"].(string)
	url, _ := p.Args["url"].(string)
	publishedAtStr, _ := p.Args["publishedAt"].(string)
	score, _ := p.Args["credibilityScore"].(float64)

	if !validSourceTypes[sourceType] {
		return nil, errors.New("sourceType must be one of: gazette, court, cag, news")
	}
	if title == "" {
		return nil, errors.New("title is required")
	}
	if score < 0 || score > 1 {
		return nil, errors.New("credibilityScore must be between 0 and 1")
	}

	publishedAt := time.Now()
	if publishedAtStr != "" {
		if t, err := time.Parse(time.RFC3339, publishedAtStr); err == nil {
			publishedAt = t
		} else if t, err := time.Parse("2006-01-02", publishedAtStr); err == nil {
			publishedAt = t
		} else {
			return nil, errors.New("publishedAt must be RFC3339 or YYYY-MM-DD")
		}
	}

	e, err := r.EvidenceRepo.AddEvidence(p.Context, sourceType, title, url, publishedAt, score)
	if err != nil {
		return nil, fmt.Errorf("add evidence: %w", err)
	}
	return evidenceSourceToMap(e), nil
}

func resolveListEvidence(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	sources, err := r.EvidenceRepo.ListEvidence(p.Context)
	if err != nil {
		return nil, err
	}
	out := make([]any, 0, len(sources))
	for _, e := range sources {
		out = append(out, evidenceSourceToMap(e))
	}
	return out, nil
}

func resolveLinkEvidence(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	evidenceID, _ := p.Args["evidenceId"].(string)
	entityType, _ := p.Args["entityType"].(string)
	entityID, _ := p.Args["entityId"].(string)
	if !validEntityTypes[entityType] {
		return nil, errors.New("entityType must be one of: article, law, case")
	}
	l, err := r.EvidenceRepo.LinkEvidence(p.Context, evidenceID, entityType, entityID)
	if err != nil {
		return nil, fmt.Errorf("link evidence: %w", err)
	}
	return evidenceLinkToMap(l), nil
}

// --- Ingestion resolvers ---

func resolveIngestConstitution(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	data, _ := p.Args["data"].(string)
	result, err := r.IngestionSvc.IngestConstitution(p.Context, data)
	if err != nil {
		return nil, err
	}
	errs := result.Errors
	if errs == nil {
		errs = []string{}
	}
	return map[string]any{"inserted": result.Inserted, "skipped": result.Skipped, "errors": errs}, nil
}

func resolveIngestAmendments(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	data, _ := p.Args["data"].(string)
	result, err := r.IngestionSvc.IngestAmendments(p.Context, data)
	if err != nil {
		return nil, err
	}
	errs := result.Errors
	if errs == nil {
		errs = []string{}
	}
	return map[string]any{"inserted": result.Inserted, "skipped": result.Skipped, "errors": errs}, nil
}

func resolveIngestCases(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	data, _ := p.Args["data"].(string)
	result, err := r.IngestionSvc.IngestCases(p.Context, data)
	if err != nil {
		return nil, err
	}
	errs := result.Errors
	if errs == nil {
		errs = []string{}
	}
	return map[string]any{"inserted": result.Inserted, "skipped": result.Skipped, "errors": errs}, nil
}

func resolveIngestEvidenceSources(p graphql.ResolveParams) (any, error) {
	r, err := resolverFrom(p.Context)
	if err != nil {
		return nil, err
	}
	if _, err := requireAuth(p.Context); err != nil {
		return nil, err
	}
	data, _ := p.Args["data"].(string)
	result, err := r.IngestionSvc.IngestEvidenceSources(p.Context, data)
	if err != nil {
		return nil, err
	}
	errs := result.Errors
	if errs == nil {
		errs = []string{}
	}
	return map[string]any{"inserted": result.Inserted, "skipped": result.Skipped, "errors": errs}, nil
}

// --- Schema ---

// NewSchema builds and returns the complete executable GraphQL schema.
func NewSchema() (graphql.Schema, error) {
	mutation := graphql.NewObject(graphql.ObjectConfig{
		Name: "Mutation",
		Fields: graphql.Fields{
			// Auth
			"register": {
				Type: graphql.NewNonNull(authPayloadType),
				Args: graphql.FieldConfigArgument{
					"email":    {Type: graphql.NewNonNull(graphql.String)},
					"password": {Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: resolveRegister,
			},
			"login": {
				Type: graphql.NewNonNull(authPayloadType),
				Args: graphql.FieldConfigArgument{
					"email":    {Type: graphql.NewNonNull(graphql.String)},
					"password": {Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: resolveLogin,
			},
			// AuditCase
			"createAuditCase": {
				Type: graphql.NewNonNull(auditCaseType),
				Args: graphql.FieldConfigArgument{
					"title":       {Type: graphql.NewNonNull(graphql.String)},
					"description": {Type: graphql.String},
				},
				Resolve: resolveCreateAuditCase,
			},
			// Legal — articles
			"createArticle": {
				Type: graphql.NewNonNull(constitutionArticleType),
				Args: graphql.FieldConfigArgument{
					"articleNumber": {Type: graphql.NewNonNull(graphql.String)},
					"title":         {Type: graphql.NewNonNull(graphql.String)},
					"content":       {Type: graphql.String},
					"part":          {Type: graphql.String},
				},
				Resolve: resolveCreateArticle,
			},
			// Legal — amendments
			"createAmendment": {
				Type: graphql.NewNonNull(amendmentType),
				Args: graphql.FieldConfigArgument{
					"amendmentNumber": {Type: graphql.NewNonNull(graphql.String)},
					"date":            {Type: graphql.NewNonNull(graphql.String)},
					"description":     {Type: graphql.String},
				},
				Resolve: resolveCreateAmendment,
			},
			"linkAmendmentToArticle": {
				Type: graphql.NewNonNull(amendmentArticleMapType),
				Args: graphql.FieldConfigArgument{
					"amendmentId": {Type: graphql.NewNonNull(graphql.String)},
					"articleId":   {Type: graphql.NewNonNull(graphql.String)},
					"changeType":  {Type: graphql.String},
				},
				Resolve: resolveLinkAmendmentToArticle,
			},
			// Legal — cases
			"createCase": {
				Type: graphql.NewNonNull(legalCaseType),
				Args: graphql.FieldConfigArgument{
					"caseName":     {Type: graphql.NewNonNull(graphql.String)},
					"court":        {Type: graphql.String},
					"judgmentDate": {Type: graphql.NewNonNull(graphql.String)},
					"summary":      {Type: graphql.String},
				},
				Resolve: resolveCreateCase,
			},
			"linkCaseToArticle": {
				Type: graphql.NewNonNull(caseArticleMapType),
				Args: graphql.FieldConfigArgument{
					"caseId":    {Type: graphql.NewNonNull(graphql.String)},
					"articleId": {Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: resolveLinkCaseToArticle,
			},
			// Legal — laws
			"createLaw": {
				Type: graphql.NewNonNull(lawType),
				Args: graphql.FieldConfigArgument{
					"name":        {Type: graphql.NewNonNull(graphql.String)},
					"section":     {Type: graphql.String},
					"ministry":    {Type: graphql.String},
					"description": {Type: graphql.String},
				},
				Resolve: resolveCreateLaw,
			},
			// Evidence
			"addEvidence": {
				Type: graphql.NewNonNull(evidenceSourceType),
				Args: graphql.FieldConfigArgument{
					"sourceType":       {Type: graphql.NewNonNull(graphql.String)},
					"title":            {Type: graphql.NewNonNull(graphql.String)},
					"url":              {Type: graphql.String},
					"publishedAt":      {Type: graphql.String},
					"credibilityScore": {Type: graphql.Float},
				},
				Resolve: resolveAddEvidence,
			},
			"linkEvidence": {
				Type: graphql.NewNonNull(evidenceLinkType),
				Args: graphql.FieldConfigArgument{
					"evidenceId": {Type: graphql.NewNonNull(graphql.String)},
					"entityType": {Type: graphql.NewNonNull(graphql.String)},
					"entityId":   {Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: resolveLinkEvidence,
			},
			// Ingestion
			"ingestConstitution": {
				Type:    graphql.NewNonNull(ingestResultType),
				Args:    graphql.FieldConfigArgument{"data": {Type: graphql.NewNonNull(graphql.String)}},
				Resolve: resolveIngestConstitution,
			},
			"ingestAmendments": {
				Type:    graphql.NewNonNull(ingestResultType),
				Args:    graphql.FieldConfigArgument{"data": {Type: graphql.NewNonNull(graphql.String)}},
				Resolve: resolveIngestAmendments,
			},
			"ingestCases": {
				Type:    graphql.NewNonNull(ingestResultType),
				Args:    graphql.FieldConfigArgument{"data": {Type: graphql.NewNonNull(graphql.String)}},
				Resolve: resolveIngestCases,
			},
			"ingestEvidenceSources": {
				Type:    graphql.NewNonNull(ingestResultType),
				Args:    graphql.FieldConfigArgument{"data": {Type: graphql.NewNonNull(graphql.String)}},
				Resolve: resolveIngestEvidenceSources,
			},
		},
	})

	query := graphql.NewObject(graphql.ObjectConfig{
		Name: "Query",
		Fields: graphql.Fields{
			"me": {
				Type:    graphql.NewNonNull(userType),
				Resolve: resolveMe,
			},
			"listAuditCases": {
				Type:    graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(auditCaseType))),
				Resolve: resolveListAuditCases,
			},
			"listArticles": {
				Type:    graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(constitutionArticleType))),
				Resolve: resolveListArticles,
			},
			"getArticle": {
				Type: constitutionArticleType,
				Args: graphql.FieldConfigArgument{
					"id": {Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: resolveGetArticle,
			},
			"listAmendments": {
				Type:    graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(amendmentType))),
				Resolve: resolveListAmendments,
			},
			"listCases": {
				Type:    graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(legalCaseType))),
				Resolve: resolveListCases,
			},
			"listLaws": {
				Type:    graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(lawType))),
				Resolve: resolveListLaws,
			},
			"listEvidenceSources": {
				Type:    graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(evidenceSourceType))),
				Resolve: resolveListEvidence,
			},
		},
	})

	return graphql.NewSchema(graphql.SchemaConfig{
		Query:    query,
		Mutation: mutation,
	})
}
