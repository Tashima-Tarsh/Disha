package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/auth"
)

// ContextKey is the type used for context keys in this package.
type ContextKey string

const (
	ContextKeyUserID ContextKey = "userID"
	ContextKeyRole   ContextKey = "role"
)

// Auth returns a Gin middleware that validates JWT Bearer tokens.
// It aborts with 401 if the token is missing or invalid.
func Auth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		userID, role, err := auth.ValidateToken(secret, tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		c.Set(string(ContextKeyUserID), userID)
		c.Set(string(ContextKeyRole), role)
		c.Next()
	}
}
