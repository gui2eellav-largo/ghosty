use strsim::levenshtein;

#[derive(Debug, Clone, serde::Serialize)]
pub struct WordCandidate {
    pub misspelling: String,
    pub correction: String,
    pub confidence: f64,
}

/// Tokenize text into words, stripping surrounding punctuation (keeps hyphens and apostrophes).
fn tokenize(text: &str) -> Vec<String> {
    text.split_whitespace()
        .map(|w| {
            w.trim_matches(|c: char| !c.is_alphanumeric() && c != '-' && c != '\'')
                .to_string()
        })
        .filter(|w| w.len() >= 2)
        .collect()
}

/// Compare two strings token-by-token and return spelling correction candidates.
///
/// A candidate is a (misspelling, correction) pair where:
/// - The tokens differ (case-insensitive)
/// - Levenshtein distance ≤ 3 (spelling fix, not semantic rewrite)
/// - Normalized confidence ≥ 0.5
pub fn detect_corrections(original: &str, corrected: &str) -> Vec<WordCandidate> {
    let orig_tokens = tokenize(original);
    let corr_tokens = tokenize(corrected);

    if orig_tokens.is_empty() || corr_tokens.is_empty() {
        return vec![];
    }

    let min_len = orig_tokens.len().min(corr_tokens.len());
    let mut candidates: Vec<WordCandidate> = Vec::new();

    for i in 0..min_len {
        let orig = &orig_tokens[i];
        let corr = &corr_tokens[i];

        // Skip identical tokens (case-insensitive)
        if orig.to_lowercase() == corr.to_lowercase() {
            continue;
        }

        let dist = levenshtein(orig, corr);

        // Skip semantic rewrites (distance too large)
        if dist > 3 {
            continue;
        }

        let max_len = orig.len().max(corr.len()) as f64;
        if max_len == 0.0 {
            continue;
        }
        let confidence = 1.0 - (dist as f64 / max_len);

        if confidence < 0.5 {
            continue;
        }

        // Deduplicate by (misspelling, correction) pair
        let already_exists = candidates.iter().any(|c| {
            c.misspelling.to_lowercase() == orig.to_lowercase()
                && c.correction.to_lowercase() == corr.to_lowercase()
        });

        if !already_exists {
            candidates.push(WordCandidate {
                misspelling: orig.clone(),
                correction: corr.clone(),
                confidence,
            });
        }
    }

    candidates
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── detect_corrections ──────────────────────────────────────────

    #[test]
    fn test_detects_simple_misspelling() {
        let candidates = detect_corrections("j'ai acheté du kérosaine hier", "j'ai acheté du kérosène hier");
        assert!(candidates.iter().any(|c| c.misspelling == "kérosaine" && c.correction == "kérosène"));
    }

    #[test]
    fn test_ignores_semantic_rewrite() {
        // "bien" -> "excellent" = distance 7, ignored
        let candidates = detect_corrections("c'est bien", "c'est excellent");
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_ignores_identical_tokens() {
        let candidates = detect_corrections("hello world", "hello world");
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_handles_empty_original() {
        let candidates = detect_corrections("", "some text");
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_handles_empty_corrected() {
        let candidates = detect_corrections("some text", "");
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_handles_both_empty() {
        let candidates = detect_corrections("", "");
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_case_insensitive_identity() {
        // Same word different case should NOT produce a candidate
        let candidates = detect_corrections("Hello World", "hello world");
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_detects_multiple_corrections() {
        let candidates = detect_corrections("helo quik brown fox", "hello quick brown fox");
        assert!(candidates.iter().any(|c| c.misspelling == "helo" && c.correction == "hello"));
        assert!(candidates.iter().any(|c| c.misspelling == "quik" && c.correction == "quick"));
        assert_eq!(candidates.len(), 2);
    }

    #[test]
    fn test_confidence_is_bounded() {
        let candidates = detect_corrections("helo world", "hello world");
        assert!(!candidates.is_empty());
        for c in &candidates {
            assert!(c.confidence >= 0.5);
            assert!(c.confidence <= 1.0);
        }
    }

    #[test]
    fn test_deduplication() {
        // If the same misspelling appears twice, only one candidate should be produced
        let candidates = detect_corrections("helo cat and helo dog", "hello cat and hello dog");
        let helo_count = candidates.iter().filter(|c| c.misspelling == "helo").count();
        assert_eq!(helo_count, 1, "duplicate (misspelling, correction) pairs should be deduplicated");
    }

    #[test]
    fn test_different_length_texts() {
        // Corrected has more words -- only matching positions are compared
        let candidates = detect_corrections("hello", "hello world extra");
        assert!(candidates.is_empty(), "only overlapping positions are compared");
    }

    #[test]
    fn test_punctuation_stripped_from_tokens() {
        // Punctuation should be stripped, so "hello," and "hello" are the same
        let candidates = detect_corrections("hello, world!", "hello world");
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_short_tokens_filtered_out() {
        // Single-char tokens (len < 2) are filtered by tokenize()
        let tokens = tokenize("I a b c hello");
        assert!(tokens.contains(&"hello".to_string()));
        // "I", "a", "b", "c" are all single chars (len 1), should be filtered
        assert!(!tokens.contains(&"a".to_string()));
    }

    #[test]
    fn test_levenshtein_distance_3_still_detected() {
        // "abcde" vs "abxyz" = distance 3, max_len=5, confidence = 1 - 3/5 = 0.4 < 0.5 => rejected
        // "abcdef" vs "abxyef" = distance 2, max_len=6, confidence = 0.67 => accepted
        let candidates = detect_corrections("abcdef ghij", "abxyef ghij");
        assert!(candidates.len() == 1);
        assert_eq!(candidates[0].misspelling, "abcdef");
    }

    // ── tokenize ────────────────────────────────────────────────────

    #[test]
    fn test_tokenize_basic() {
        let tokens = tokenize("hello world foo");
        assert_eq!(tokens, vec!["hello", "world", "foo"]);
    }

    #[test]
    fn test_tokenize_preserves_hyphens_and_apostrophes() {
        let tokens = tokenize("it's well-known");
        assert!(tokens.contains(&"it's".to_string()));
        assert!(tokens.contains(&"well-known".to_string()));
    }

    #[test]
    fn test_tokenize_strips_surrounding_punctuation() {
        let tokens = tokenize("(hello) [world]! \"quoted\"");
        assert!(tokens.contains(&"hello".to_string()));
        assert!(tokens.contains(&"world".to_string()));
        assert!(tokens.contains(&"quoted".to_string()));
    }

    #[test]
    fn test_tokenize_empty_string() {
        let tokens = tokenize("");
        assert!(tokens.is_empty());
    }

    // ── WordCandidate serialization ─────────────────────────────────

    #[test]
    fn test_word_candidate_serialization() {
        let candidate = WordCandidate {
            misspelling: "teh".to_string(),
            correction: "the".to_string(),
            confidence: 0.67,
        };
        let json = serde_json::to_value(&candidate).unwrap();
        assert_eq!(json["misspelling"], "teh");
        assert_eq!(json["correction"], "the");
    }
}
