package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/Tashima-Tarsh/tashu-auditor-core/internal/config"
)

// Provider defines the unified interface for all AI model providers.
type Provider interface {
	Complete(ctx context.Context, prompt string) (string, error)
	Name() string
}

// NewProvider returns the configured AI provider, falling back to noop.
func NewProvider(cfg *config.Config) Provider {
	switch cfg.AIProvider {
	case "openai":
		return &openAIProvider{apiKey: cfg.OpenAIKey}
	case "anthropic":
		return &anthropicProvider{apiKey: cfg.AnthropicKey}
	case "ollama":
		return &ollamaProvider{baseURL: cfg.OllamaBaseURL}
	default:
		return &noopProvider{}
	}
}

// --- OpenAI ---

type openAIProvider struct{ apiKey string }

func (p *openAIProvider) Name() string { return "openai" }

func (p *openAIProvider) Complete(ctx context.Context, prompt string) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"model":      "gpt-4o-mini",
		"max_tokens": 1024,
		"messages":   []map[string]string{{"role": "user", "content": prompt}},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("openai request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Choices []struct {
			Message struct{ Content string } `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode openai response: %w", err)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("openai: no choices returned")
	}
	return result.Choices[0].Message.Content, nil
}

// --- Anthropic ---

type anthropicProvider struct{ apiKey string }

func (p *anthropicProvider) Name() string { return "anthropic" }

func (p *anthropicProvider) Complete(ctx context.Context, prompt string) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"model":      "claude-3-haiku-20240307",
		"max_tokens": 1024,
		"messages":   []map[string]string{{"role": "user", "content": prompt}},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("x-api-key", p.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("anthropic request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Content []struct{ Text string } `json:"content"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode anthropic response: %w", err)
	}
	if len(result.Content) == 0 {
		return "", fmt.Errorf("anthropic: no content returned")
	}
	return result.Content[0].Text, nil
}

// --- Ollama ---

type ollamaProvider struct{ baseURL string }

func (p *ollamaProvider) Name() string { return "ollama" }

func (p *ollamaProvider) Complete(ctx context.Context, prompt string) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"model":  "llama3",
		"prompt": prompt,
		"stream": false,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		p.baseURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("ollama request: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read ollama response: %w", err)
	}
	var result struct{ Response string `json:"response"` }
	if err := json.Unmarshal(raw, &result); err != nil {
		return "", fmt.Errorf("decode ollama response: %w", err)
	}
	return result.Response, nil
}

// --- Noop ---

type noopProvider struct{}

func (p *noopProvider) Name() string { return "noop" }
func (p *noopProvider) Complete(_ context.Context, _ string) (string, error) {
	return "AI provider not configured.", nil
}
