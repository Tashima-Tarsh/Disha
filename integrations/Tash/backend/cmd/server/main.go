package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	gqlhandler "github.com/graphql-go/handler"
	"github.com/joho/godotenv"
	"go.uber.org/zap"

	"github.com/Tashima-Tarsh/tashu-auditor-core/graph"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/ai"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/config"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/db"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/evidence"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/ingestion"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/legal"
	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/middleware"
)

func main() {
	_ = godotenv.Load()

	log, _ := zap.NewProduction()
	defer log.Sync() //nolint:errcheck

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("load config", zap.Error(err))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("connect to database", zap.Error(err))
	}
	defer pool.Close()

	if err := pool.RunMigrations(ctx); err != nil {
		log.Fatal("run migrations", zap.Error(err))
	}
	log.Info("database ready")

	aiProvider := ai.NewProvider(cfg)
	log.Info("ai provider ready", zap.String("name", aiProvider.Name()))

	legalRepo := legal.NewRepo(pool)
	evidenceRepo := evidence.NewRepo(pool)
	ingestionSvc := ingestion.NewService(legalRepo, evidenceRepo)

	schema, err := graph.NewSchema()
	if err != nil {
		log.Fatal("build graphql schema", zap.Error(err))
	}

	resolver := &graph.Resolver{
		DB:           pool,
		Config:       cfg,
		AIProvider:   aiProvider,
		LegalRepo:    legalRepo,
		EvidenceRepo: evidenceRepo,
		IngestionSvc: ingestionSvc,
	}

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(middleware.Logger(log))
	router.Use(gin.Recovery())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	// TODO: add rate limiting middleware here (e.g. github.com/ulule/limiter)

	gqlH := gqlhandler.New(&gqlhandler.Config{
		Schema:   &schema,
		Pretty:   false,
		GraphiQL: false,
	})

	// bestEffortAuth validates JWT when present but does not block unauthenticated
	// requests — allowing register/login to work without a token.
	bestEffortAuth := func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if len(header) > 7 && header[:7] == "Bearer " {
			middleware.Auth(cfg.JWTSecret)(c)
			return
		}
		c.Next()
	}

	router.POST("/graphql", bestEffortAuth, func(c *gin.Context) {
		reqCtx := c.Request.Context()
		if userID, exists := c.Get(string(middleware.ContextKeyUserID)); exists {
			reqCtx = context.WithValue(reqCtx, middleware.ContextKeyUserID, userID)
		}
		if role, exists := c.Get(string(middleware.ContextKeyRole)); exists {
			reqCtx = context.WithValue(reqCtx, middleware.ContextKeyRole, role)
		}
		reqCtx = graph.WithResolver(reqCtx, resolver)
		gqlH.ServeHTTP(c.Writer, c.Request.WithContext(reqCtx))
	})

	router.GET("/playground", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", graphiQLPage)
	})

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info("server starting", zap.String("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server error", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down server...")
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutCancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Error("server shutdown error", zap.Error(err))
	}
	log.Info("server stopped")
}

var graphiQLPage = []byte(`<!DOCTYPE html>
<html>
<head>
  <title>Tashu Auditor – GraphiQL</title>
  <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
</head>
<body style="margin:0">
  <div id="graphiql" style="height:100vh"></div>
  <script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>
  <script>
    const fetcher = GraphiQL.createFetcher({ url: '/graphql' });
    ReactDOM.render(React.createElement(GraphiQL, { fetcher }), document.getElementById('graphiql'));
  </script>
</body>
</html>`)
