/// Erreurs structurées pour le frontend (mapping code + message)
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "code", content = "detail")]
pub enum ApiKeyError {
    InvalidFormat(String),
    Unauthorized,
    #[allow(dead_code)]
    Forbidden,
    NetworkTimeout,
    NetworkError(String),
    QuotaExceeded,
    ServiceUnavailable,
    KeychainError(String),
    KeyNotFound,
    UnknownProvider(String),
    Unknown(String),
}

impl ApiKeyError {
    pub fn message(&self) -> String {
        match self {
            ApiKeyError::InvalidFormat(d) => d.clone(),
            ApiKeyError::Unauthorized => "Clé API invalide ou révoquée.".to_string(),
            ApiKeyError::Forbidden => {
                "Accès refusé. Vérifiez les permissions de votre clé.".to_string()
            }
            ApiKeyError::NetworkTimeout => {
                "Timeout: impossible de contacter le service. Vérifiez votre connexion.".to_string()
            }
            ApiKeyError::NetworkError(d) => d.clone(),
            ApiKeyError::QuotaExceeded => {
                "Quota dépassé. Attendez quelques minutes ou vérifiez votre plan.".to_string()
            }
            ApiKeyError::ServiceUnavailable => {
                "Service temporairement indisponible. Réessayez dans quelques instants.".to_string()
            }
            ApiKeyError::KeychainError(d) => d.clone(),
            ApiKeyError::KeyNotFound => "Clé introuvable.".to_string(),
            ApiKeyError::UnknownProvider(d) => d.clone(),
            ApiKeyError::Unknown(d) => d.clone(),
        }
    }
}

impl std::fmt::Display for ApiKeyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message())
    }
}

impl std::error::Error for ApiKeyError {}

/// Parse une erreur String du backend en ApiKeyError pour le frontend
pub fn parse_api_key_error(s: &str) -> ApiKeyError {
    let s_lower = s.to_lowercase();
    if s_lower.contains("format")
        || s_lower.contains("invalide")
        || s_lower.contains("courte")
        || s_lower.contains("caractères")
    {
        ApiKeyError::InvalidFormat(s.to_string())
    } else if s_lower.contains("révoquée") || s_lower.contains("invalid") && s_lower.contains("key")
    {
        ApiKeyError::Unauthorized
    } else if s_lower.contains("timeout") || s_lower.contains("impossible de contacter") {
        ApiKeyError::NetworkTimeout
    } else if s_lower.contains("connexion") || s_lower.contains("réseau") {
        ApiKeyError::NetworkError(s.to_string())
    } else if s_lower.contains("quota") || s_lower.contains("dépassé") {
        ApiKeyError::QuotaExceeded
    } else if s_lower.contains("indisponible") {
        ApiKeyError::ServiceUnavailable
    } else if s_lower.contains("keychain") || s_lower.contains("stockage") {
        ApiKeyError::KeychainError(s.to_string())
    } else if s_lower.contains("introuvable") {
        ApiKeyError::KeyNotFound
    } else if s_lower.contains("provider") || s_lower.contains("inconnu") {
        ApiKeyError::UnknownProvider(s.to_string())
    } else {
        ApiKeyError::Unknown(s.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── parse_api_key_error ─────────────────────────────────────────

    #[test]
    fn test_parse_error_invalid_format_via_format() {
        let err = parse_api_key_error("Format OpenAI invalide: doit commencer par 'sk-'");
        assert!(matches!(err, ApiKeyError::InvalidFormat(_)));
    }

    #[test]
    fn test_parse_error_invalid_format_via_courte() {
        let err = parse_api_key_error("Clé OpenAI trop courte: minimum 40 caractères");
        assert!(matches!(err, ApiKeyError::InvalidFormat(_)));
    }

    #[test]
    fn test_parse_error_invalid_format_via_invalide() {
        let err = parse_api_key_error("Clé contient des caractères invalides");
        assert!(matches!(err, ApiKeyError::InvalidFormat(_)));
    }

    #[test]
    fn test_parse_error_unauthorized() {
        let err = parse_api_key_error("Clé révoquée par OpenAI.");
        assert!(matches!(err, ApiKeyError::Unauthorized));
    }

    #[test]
    fn test_parse_error_network_timeout() {
        let err = parse_api_key_error("Timeout: impossible de contacter OpenAI.");
        assert!(matches!(err, ApiKeyError::NetworkTimeout));
    }

    #[test]
    fn test_parse_error_network_error() {
        let err = parse_api_key_error("Erreur réseau: connection reset");
        assert!(matches!(err, ApiKeyError::NetworkError(_)));
    }

    #[test]
    fn test_parse_error_quota_exceeded() {
        let err = parse_api_key_error("Quota dépassé. Attendez quelques minutes.");
        assert!(matches!(err, ApiKeyError::QuotaExceeded));
    }

    #[test]
    fn test_parse_error_service_unavailable() {
        let err = parse_api_key_error("Service temporairement indisponible.");
        assert!(matches!(err, ApiKeyError::ServiceUnavailable));
    }

    #[test]
    fn test_parse_error_keychain_error() {
        let err = parse_api_key_error("Erreur stockage keychain: OSStatus -25293");
        assert!(matches!(err, ApiKeyError::KeychainError(_)));
    }

    #[test]
    fn test_parse_error_key_not_found() {
        let err = parse_api_key_error("Clé active introuvable");
        assert!(matches!(err, ApiKeyError::KeyNotFound));
    }

    #[test]
    fn test_parse_error_unknown_provider() {
        let err = parse_api_key_error("Provider inconnu: gemini");
        assert!(matches!(err, ApiKeyError::UnknownProvider(_)));
    }

    #[test]
    fn test_parse_error_unknown_fallback() {
        let err = parse_api_key_error("Something completely unexpected happened");
        assert!(matches!(err, ApiKeyError::Unknown(_)));
    }

    // ── Display / message ───────────────────────────────────────────

    #[test]
    fn test_error_display_matches_message() {
        let err = ApiKeyError::Unauthorized;
        assert_eq!(format!("{}", err), err.message());
    }

    #[test]
    fn test_error_display_invalid_format_echoes_detail() {
        let detail = "some format detail";
        let err = ApiKeyError::InvalidFormat(detail.to_string());
        assert_eq!(err.message(), detail);
    }

    #[test]
    fn test_error_display_network_error_echoes_detail() {
        let detail = "connection refused";
        let err = ApiKeyError::NetworkError(detail.to_string());
        assert_eq!(err.message(), detail);
    }

    #[test]
    fn test_error_display_forbidden() {
        let err = ApiKeyError::Forbidden;
        assert!(err.message().contains("Accès refusé"));
    }

    #[test]
    fn test_error_display_quota() {
        let err = ApiKeyError::QuotaExceeded;
        assert!(err.message().contains("Quota"));
    }

    // ── Serialization for frontend ──────────────────────────────────

    #[test]
    fn test_error_serialization_has_code_field() {
        let err = ApiKeyError::Unauthorized;
        let json = serde_json::to_value(&err).unwrap();
        assert_eq!(json["code"], "Unauthorized");
    }

    #[test]
    fn test_error_serialization_invalid_format_has_detail() {
        let err = ApiKeyError::InvalidFormat("bad key".to_string());
        let json = serde_json::to_value(&err).unwrap();
        assert_eq!(json["code"], "InvalidFormat");
        assert_eq!(json["detail"], "bad key");
    }

    #[test]
    fn test_error_serialization_network_timeout_no_detail() {
        let err = ApiKeyError::NetworkTimeout;
        let json = serde_json::to_value(&err).unwrap();
        assert_eq!(json["code"], "NetworkTimeout");
        // NetworkTimeout has no content field
        assert!(json.get("detail").is_none());
    }

    #[test]
    fn test_error_is_std_error() {
        let err = ApiKeyError::Unknown("test".to_string());
        let _: &dyn std::error::Error = &err;
    }
}
