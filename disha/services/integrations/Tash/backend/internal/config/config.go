package config

import (
	"errors"
	"os"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	DatabaseURL    string
	JWTSecret      string
	Port           string
	AIProvider     string // openai | anthropic | ollama | noop
	OpenAIKey      string
	AnthropicKey   string
	OllamaBaseURL  string
}

// Load reads configuration from environment variables.
func Load() (*Config, error) {
	cfg := &Config{
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		JWTSecret:     os.Getenv("JWT_SECRET"),
		Port:          os.Getenv("PORT"),
		AIProvider:    os.Getenv("AI_PROVIDER"),
		OpenAIKey:     os.Getenv("OPENAI_API_KEY"),
		AnthropicKey:  os.Getenv("ANTHROPIC_API_KEY"),
		OllamaBaseURL: os.Getenv("OLLAMA_BASE_URL"),
	}

	if cfg.DatabaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	if len(cfg.JWTSecret) < 32 {
		return nil, errors.New("JWT_SECRET must be at least 32 characters")
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.AIProvider == "" {
		cfg.AIProvider = "noop"
	}
	if cfg.OllamaBaseURL == "" {
		cfg.OllamaBaseURL = "http://localhost:11434"
	}

	return cfg, nil
}
