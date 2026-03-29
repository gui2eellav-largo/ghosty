/// Voice commands module — detects spoken command phrases in transcription text,
/// strips them, and executes corresponding keystrokes after paste.
/// Only used in Direct/light mode.

#[derive(Debug, Clone, PartialEq)]
pub enum VoiceCommand {
    Enter,
    NewLine,
    Tab,
    Escape,
    SelectAll,
    Undo,
    Backspace,
}

pub struct VoiceCommandResult {
    pub cleaned_text: String,
    pub commands: Vec<VoiceCommand>,
}

/// Command phrase definitions: (phrase, command).
/// Order matters — longer phrases first to avoid partial matches.
const COMMAND_PHRASES: &[(&str, VoiceCommand)] = &[
    // English
    ("press enter", VoiceCommand::Enter),
    ("new line", VoiceCommand::NewLine),
    ("press tab", VoiceCommand::Tab),
    ("select all", VoiceCommand::SelectAll),
    ("backspace", VoiceCommand::Backspace),
    ("undo", VoiceCommand::Undo),
    ("escape", VoiceCommand::Escape),
    // French
    ("appuie sur entrée", VoiceCommand::Enter),
    ("appuie sur entree", VoiceCommand::Enter),
    ("entrée", VoiceCommand::Enter),
    ("entree", VoiceCommand::Enter),
    ("retour à la ligne", VoiceCommand::NewLine),
    ("retour a la ligne", VoiceCommand::NewLine),
    ("nouvelle ligne", VoiceCommand::NewLine),
    ("à la ligne", VoiceCommand::NewLine),
    ("a la ligne", VoiceCommand::NewLine),
    ("tabulation", VoiceCommand::Tab),
    ("tout sélectionner", VoiceCommand::SelectAll),
    ("tout selectionner", VoiceCommand::SelectAll),
    ("sélectionne tout", VoiceCommand::SelectAll),
    ("selectionne tout", VoiceCommand::SelectAll),
    ("annuler", VoiceCommand::Undo),
    ("annule", VoiceCommand::Undo),
    ("efface", VoiceCommand::Backspace),
    ("supprime", VoiceCommand::Backspace),
];

/// Scans text for command phrases at word boundaries, removes them,
/// and returns cleaned text + ordered list of commands.
/// Commands are matched case-insensitively and must be at word boundaries
/// (preceded by whitespace/start-of-string, followed by whitespace/punctuation/end-of-string).
pub fn extract_commands(text: &str) -> VoiceCommandResult {
    let mut working = text.to_string();
    let mut commands: Vec<(usize, VoiceCommand)> = Vec::new();

    // We iterate multiple times because removing one command may reveal another.
    // Use a simple loop with a max iteration guard.
    for _ in 0..20 {
        let lower = working.to_lowercase();
        let mut found = false;

        for (phrase, cmd) in COMMAND_PHRASES {
            if let Some(pos) = find_command_at_boundary(&lower, phrase) {
                let end = pos + phrase.len();
                // Also strip surrounding whitespace/punctuation
                let (strip_start, strip_end) = expand_strip_range(&working, pos, end);
                commands.push((strip_start, cmd.clone()));
                working = format!(
                    "{}{}",
                    &working[..strip_start],
                    &working[strip_end..]
                );
                found = true;
                break; // Restart scan after removal
            }
        }

        if !found {
            break;
        }
    }

    // Sort commands by their original position (left to right)
    commands.sort_by_key(|(pos, _)| *pos);
    let commands: Vec<VoiceCommand> = commands.into_iter().map(|(_, cmd)| cmd).collect();

    let cleaned = working.trim().to_string();

    VoiceCommandResult {
        cleaned_text: cleaned,
        commands,
    }
}

/// Find a command phrase in the lowercased text, ensuring word boundaries.
fn find_command_at_boundary(lower_text: &str, phrase: &str) -> Option<usize> {
    let mut search_from = 0;
    while let Some(rel_pos) = lower_text[search_from..].find(phrase) {
        let pos = search_from + rel_pos;
        let end = pos + phrase.len();

        // Check left boundary: start of string or whitespace/punctuation
        let left_ok = pos == 0 || {
            let before = lower_text[..pos].chars().last().unwrap();
            !before.is_alphanumeric()
        };

        // Check right boundary: end of string or non-alphanumeric
        let right_ok = end >= lower_text.len() || {
            let after = lower_text[end..].chars().next().unwrap();
            !after.is_alphanumeric()
        };

        if left_ok && right_ok {
            return Some(pos);
        }

        search_from = pos + 1;
    }
    None
}

/// Expand the strip range to also remove surrounding whitespace and trailing punctuation.
/// Preserves a single space between surrounding text when the command is in the middle.
fn expand_strip_range(text: &str, start: usize, end: usize) -> (usize, usize) {
    let bytes = text.as_bytes();

    // Expand left: consume preceding whitespace and commas
    let mut s = start;
    while s > 0 && (bytes[s - 1] == b' ' || bytes[s - 1] == b',') {
        s -= 1;
    }

    // Expand right: consume trailing punctuation and whitespace
    let mut e = end;
    let chars_after: Vec<char> = text[end..].chars().collect();
    let mut i = 0;
    while i < chars_after.len()
        && (chars_after[i] == '.'
            || chars_after[i] == ','
            || chars_after[i] == ' '
            || chars_after[i] == '!'
            || chars_after[i] == '?')
    {
        e += chars_after[i].len_utf8();
        i += 1;
    }

    // If there's text on both sides, keep one space so words don't merge
    let has_text_before = s > 0 && bytes[s - 1].is_ascii_alphanumeric();
    let has_text_after = e < text.len() && text[e..].starts_with(|c: char| c.is_alphanumeric());
    if has_text_before && has_text_after {
        // Insert a space by not consuming the last space on the left
        // We do this by moving s forward by 1 if we consumed spaces
        if s < start {
            s += 1; // keep one space
        }
    }

    (s, e)
}

/// Execute voice commands as keystrokes via CGEvent API.
/// Adds a 100ms delay before the first command (after paste) and 50ms between commands.
pub fn execute_commands(commands: &[VoiceCommand]) -> Result<(), String> {
    if commands.is_empty() {
        return Ok(());
    }

    use std::thread;
    use std::time::Duration;

    crate::clipboard::log_debug(&format!(
        "[voice_commands] executing {} commands: {:?}",
        commands.len(),
        commands
    ));

    // 100ms delay after paste to let it land
    thread::sleep(Duration::from_millis(100));

    for (i, cmd) in commands.iter().enumerate() {
        if i > 0 {
            thread::sleep(Duration::from_millis(50));
        }
        execute_single_command(cmd)?;
    }

    Ok(())
}

/// Send a single keystroke via CGEvent API (macOS).
fn execute_single_command(cmd: &VoiceCommand) -> Result<(), String> {
    crate::clipboard::log_debug(&format!("[voice_commands] sending {:?}", cmd));

    #[cfg(target_os = "macos")]
    {
        match cmd {
            VoiceCommand::Enter => send_key(36, 0),
            VoiceCommand::NewLine => send_key(36, K_CG_EVENT_FLAG_MASK_SHIFT),
            VoiceCommand::Tab => send_key(48, 0),
            VoiceCommand::Escape => send_key(53, 0),
            VoiceCommand::SelectAll => send_key(0, K_CG_EVENT_FLAG_MASK_COMMAND),
            VoiceCommand::Undo => send_key(6, K_CG_EVENT_FLAG_MASK_COMMAND),
            VoiceCommand::Backspace => send_key(51, 0),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        // Non-macOS: log only, no implementation yet
        crate::clipboard::log_debug(&format!(
            "[voice_commands] skipping {:?} (not macOS)",
            cmd
        ));
        Ok(())
    }
}

#[cfg(target_os = "macos")]
const K_CG_EVENT_FLAG_MASK_COMMAND: u64 = 0x00100000;
#[cfg(target_os = "macos")]
const K_CG_EVENT_FLAG_MASK_SHIFT: u64 = 0x00020000;

/// Send a single key event (down + up) with optional modifier flags.
#[cfg(target_os = "macos")]
fn send_key(keycode: u16, flags: u64) -> Result<(), String> {
    const K_CG_EVENT_SOURCE_STATE_COMBINED: i32 = 0;
    const K_CG_SESSION_EVENT_TAP: u32 = 1;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGEventSourceCreate(state_id: i32) -> *mut std::ffi::c_void;
        fn CGEventCreateKeyboardEvent(
            source: *const std::ffi::c_void,
            virtual_key: u16,
            key_down: bool,
        ) -> *mut std::ffi::c_void;
        fn CGEventSetFlags(event: *mut std::ffi::c_void, flags: u64);
        fn CGEventPost(tap: u32, event: *mut std::ffi::c_void);
        fn CFRelease(cf: *mut std::ffi::c_void);
    }

    unsafe {
        let source = CGEventSourceCreate(K_CG_EVENT_SOURCE_STATE_COMBINED);

        let key_down = CGEventCreateKeyboardEvent(source, keycode, true);
        if key_down.is_null() {
            if !source.is_null() {
                CFRelease(source);
            }
            return Err(format!("Failed to create CGEvent for keycode {} down", keycode));
        }
        if flags != 0 {
            CGEventSetFlags(key_down, flags);
        }
        CGEventPost(K_CG_SESSION_EVENT_TAP, key_down);
        CFRelease(key_down);

        let key_up = CGEventCreateKeyboardEvent(source, keycode, false);
        if !key_up.is_null() {
            if flags != 0 {
                CGEventSetFlags(key_up, flags);
            }
            CGEventPost(K_CG_SESSION_EVENT_TAP, key_up);
            CFRelease(key_up);
        }

        if !source.is_null() {
            CFRelease(source);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_enter() {
        let r = extract_commands("Hello world press enter");
        assert_eq!(r.cleaned_text, "Hello world");
        assert_eq!(r.commands, vec![VoiceCommand::Enter]);
    }

    #[test]
    fn test_extract_french_enter() {
        let r = extract_commands("Bonjour entrée");
        assert_eq!(r.cleaned_text, "Bonjour");
        assert_eq!(r.commands, vec![VoiceCommand::Enter]);
    }

    #[test]
    fn test_no_false_positive_in_word() {
        // "enter" inside "enterprise" should NOT match
        let r = extract_commands("The enterprise is great");
        assert_eq!(r.cleaned_text, "The enterprise is great");
        assert!(r.commands.is_empty());
    }

    #[test]
    fn test_multiple_commands() {
        let r = extract_commands("Hello new line world press enter");
        assert_eq!(r.cleaned_text, "Hello world");
        assert_eq!(r.commands, vec![VoiceCommand::NewLine, VoiceCommand::Enter]);
    }

    #[test]
    fn test_case_insensitive() {
        let r = extract_commands("Hello Press Enter");
        assert_eq!(r.cleaned_text, "Hello");
        assert_eq!(r.commands, vec![VoiceCommand::Enter]);
    }

    #[test]
    fn test_command_only() {
        let r = extract_commands("press enter");
        assert_eq!(r.cleaned_text, "");
        assert_eq!(r.commands, vec![VoiceCommand::Enter]);
    }

    #[test]
    fn test_with_punctuation() {
        let r = extract_commands("Hello, press enter.");
        assert_eq!(r.cleaned_text, "Hello");
        assert_eq!(r.commands, vec![VoiceCommand::Enter]);
    }
}
