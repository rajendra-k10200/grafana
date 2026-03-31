package strategies

import (
	"context"

	"github.com/grafana/grafana/pkg/login/social"
	"github.com/grafana/grafana/pkg/services/ssosettings"
	"github.com/grafana/grafana/pkg/setting"
)

type JWTStrategy struct {
	cfg *setting.Cfg
}

var _ ssosettings.FallbackStrategy = (*JWTStrategy)(nil)

func NewJWTStrategy(cfg *setting.Cfg) *JWTStrategy {
	return &JWTStrategy{cfg: cfg}
}

func (s *JWTStrategy) IsMatch(provider string) bool {
	return provider == social.JWTProviderName
}

func (s *JWTStrategy) GetProviderConfig(_ context.Context, _ string) (map[string]any, error) {
	section := s.cfg.Raw.Section("auth.jwt")
	return map[string]any{
		"enabled":                    section.Key("enabled").MustBool(false),
		"header_name":                section.Key("header_name").Value(),
		"url_login":                  section.Key("url_login").MustBool(false),
		"email_claim":                section.Key("email_claim").Value(),
		"username_claim":             section.Key("username_claim").Value(),
		"jwk_set_url":                section.Key("jwk_set_url").Value(),
		"jwk_set_file":               section.Key("jwk_set_file").Value(),
		"jwk_set_bearer_token_file":  section.Key("jwk_set_bearer_token_file").Value(),
		"key_file":                   section.Key("key_file").Value(),
		"key_id":                     section.Key("key_id").Value(),
		"cache_ttl":                  section.Key("cache_ttl").Value(),
		"expect_claims":              section.Key("expect_claims").MustString("{}"),
		"role_attribute_path":        section.Key("role_attribute_path").Value(),
		"role_attribute_strict":      section.Key("role_attribute_strict").MustBool(false),
		"allow_assign_grafana_admin": section.Key("allow_assign_grafana_admin").MustBool(false),
		"skip_org_role_sync":         section.Key("skip_org_role_sync").MustBool(false),
		"groups_attribute_path":      section.Key("groups_attribute_path").Value(),
		"email_attribute_path":       section.Key("email_attribute_path").Value(),
		"username_attribute_path":    section.Key("username_attribute_path").Value(),
		"org_attribute_path":         section.Key("org_attribute_path").Value(),
		"org_mapping":                section.Key("org_mapping").Value(),
		"tls_client_ca":              section.Key("tls_client_ca").Value(),
		"tls_skip_verify_insecure":   section.Key("tls_skip_verify_insecure").MustBool(false),
		"auto_sign_up":               section.Key("auto_sign_up").MustBool(false),
	}, nil
}
