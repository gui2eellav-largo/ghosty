/// Detect and apply inline edit commands like "replace X with Y" / "remplace X par Y".

pub struct EditResult {
    pub text: String,
    pub edits_applied: usize,
}

/// All recognised command patterns: (verb, separator).
/// Order doesn't matter — we scan right-to-left by position.
const PATTERNS: &[(&str, &str)] = &[
    // English
    ("replace ", " with "),
    ("change ", " to "),
    ("correct ", " to "),
    // French
    ("remplace ", " par "),
    ("change ", " en "),
    ("corrige ", " en "),
];

/// Check that the character just before `pos` (if any) is a word boundary
/// (whitespace or start of string). This prevents matching inside words
/// like "irr*eplace*able".
fn is_word_boundary_before(text: &str, pos: usize) -> bool {
    if pos == 0 {
        return true;
    }
    let prev = text.as_bytes()[pos - 1];
    prev == b' ' || prev == b'\t' || prev == b'\n'
}

/// Find the rightmost edit command occurrence in `text` (case-insensitive).
/// Returns (start_of_command, end_of_command, target, replacement).
fn find_rightmost_command(text: &str) -> Option<(usize, usize, String, String)> {
    let lower = text.to_lowercase();
    let mut best: Option<(usize, usize, String, String)> = None;

    for &(verb, sep) in PATTERNS {
        // Scan for all occurrences of verb in lower, pick rightmost
        let mut search_from = 0;
        while let Some(verb_pos) = lower[search_from..].find(verb) {
            let abs_verb = search_from + verb_pos;
            search_from = abs_verb + 1; // advance for next iteration

            if !is_word_boundary_before(&lower, abs_verb) {
                continue;
            }

            let target_start = abs_verb + verb.len();
            // Find separator after verb
            if let Some(sep_offset) = lower[target_start..].find(sep) {
                let abs_sep = target_start + sep_offset;
                let target = text[target_start..abs_sep].trim().to_string();
                let replacement_start = abs_sep + sep.len();
                let replacement = text[replacement_start..].trim().to_string();

                if target.is_empty() || replacement.is_empty() {
                    continue;
                }

                // Keep the rightmost match
                if best.as_ref().map_or(true, |(prev_start, _, _, _)| abs_verb > *prev_start) {
                    best = Some((abs_verb, text.len(), target, replacement));
                }
            }
        }
    }

    best
}

/// Process all edit commands in `text`, right-to-left.
pub fn process_edit_commands(text: &str) -> EditResult {
    let mut result = text.to_string();
    let mut edits_applied: usize = 0;

    loop {
        match find_rightmost_command(&result) {
            Some((cmd_start, _cmd_end, target, replacement)) => {
                // Remove the command phrase (trim trailing space before command too)
                let before_cmd = result[..cmd_start].trim_end().to_string();
                // The replacement text from the command itself (Y part) is used only as
                // the substitution value, not appended — it is part of the command.
                let text_without_cmd = before_cmd;

                // Replace all occurrences of target with replacement (case-insensitive)
                let replaced = replace_all_case_insensitive(&text_without_cmd, &target, &replacement);
                let count = count_case_insensitive(&text_without_cmd, &target);
                edits_applied += if count > 0 { count } else { 0 };
                result = replaced;
            }
            None => break,
        }
    }

    EditResult {
        text: result,
        edits_applied,
    }
}

/// Replace all case-insensitive occurrences of `from` with `to_str` in `text`.
fn replace_all_case_insensitive(text: &str, from: &str, to_str: &str) -> String {
    if from.is_empty() {
        return text.to_string();
    }
    let lower_text = text.to_lowercase();
    let lower_from = from.to_lowercase();
    let mut result = String::with_capacity(text.len());
    let mut search_start = 0;

    while let Some(pos) = lower_text[search_start..].find(&lower_from) {
        let abs_pos = search_start + pos;
        result.push_str(&text[search_start..abs_pos]);
        result.push_str(to_str);
        search_start = abs_pos + from.len();
    }
    result.push_str(&text[search_start..]);
    result
}

/// Count case-insensitive occurrences of `needle` in `text`.
fn count_case_insensitive(text: &str, needle: &str) -> usize {
    if needle.is_empty() {
        return 0;
    }
    let lower_text = text.to_lowercase();
    let lower_needle = needle.to_lowercase();
    let mut count = 0;
    let mut start = 0;
    while let Some(pos) = lower_text[start..].find(&lower_needle) {
        count += 1;
        start += pos + lower_needle.len();
    }
    count
}

// ── Tests ────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_english_replace() {
        let r = process_edit_commands("hello world replace world with earth");
        assert_eq!(r.text, "hello earth");
        assert_eq!(r.edits_applied, 1);
    }

    #[test]
    fn test_basic_french_remplace() {
        let r = process_edit_commands("bonjour monde remplace monde par terre");
        assert_eq!(r.text, "bonjour terre");
        assert_eq!(r.edits_applied, 1);
    }

    #[test]
    fn test_english_change_to() {
        let r = process_edit_commands("I like cats change cats to dogs");
        assert_eq!(r.text, "I like dogs");
        assert_eq!(r.edits_applied, 1);
    }

    #[test]
    fn test_english_correct_to() {
        let r = process_edit_commands("I went to teh store correct teh to the");
        assert_eq!(r.text, "I went to the store");
        assert_eq!(r.edits_applied, 1);
    }

    #[test]
    fn test_french_corrige_en() {
        let r = process_edit_commands("j'ai mangé corrige mangé en cuisiné");
        assert_eq!(r.text, "j'ai cuisiné");
        assert_eq!(r.edits_applied, 1);
    }

    #[test]
    fn test_multiple_occurrences_replaced() {
        let r = process_edit_commands("the cat and the cat replace cat with dog");
        assert_eq!(r.text, "the dog and the dog");
        assert_eq!(r.edits_applied, 2);
    }

    #[test]
    fn test_no_edit_command_passthrough() {
        let r = process_edit_commands("just a normal sentence");
        assert_eq!(r.text, "just a normal sentence");
        assert_eq!(r.edits_applied, 0);
    }

    #[test]
    fn test_case_insensitive_command() {
        let r = process_edit_commands("hello Replace hello With goodbye");
        assert_eq!(r.text, "goodbye");
        assert_eq!(r.edits_applied, 1);
    }

    #[test]
    fn test_case_insensitive_target() {
        let r = process_edit_commands("Hello hello replace Hello with goodbye");
        assert_eq!(r.text, "goodbye goodbye");
        assert_eq!(r.edits_applied, 2);
    }

    #[test]
    fn test_partial_word_no_trigger() {
        // "replace" inside "irreplaceable" should NOT trigger
        let r = process_edit_commands("that is irreplaceable");
        assert_eq!(r.text, "that is irreplaceable");
        assert_eq!(r.edits_applied, 0);
    }

    #[test]
    fn test_empty_input() {
        let r = process_edit_commands("");
        assert_eq!(r.text, "");
        assert_eq!(r.edits_applied, 0);
    }

    #[test]
    fn test_multiple_edit_commands() {
        let r = process_edit_commands(
            "I like cats and dogs replace cats with birds replace dogs with fish",
        );
        assert_eq!(r.text, "I like birds and fish");
        assert_eq!(r.edits_applied, 2);
    }
}
