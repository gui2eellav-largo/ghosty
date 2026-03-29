use tauri::AppHandle;

pub fn copy_to_clipboard(text: &str, _app: &AppHandle) -> Result<(), String> {
    use arboard::Clipboard;
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_clipboard_text(_app: &AppHandle) -> Result<String, String> {
    use arboard::Clipboard;
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.get_text().map_err(|e| e.to_string())
}

/// Get the bundle identifier of the currently frontmost application.
/// Uses `lsappinfo` which is instant and requires no permissions (unlike osascript).
/// Returns None if Ghosty itself is frontmost or if the query fails.
#[cfg(target_os = "macos")]
pub fn get_frontmost_app() -> Option<String> {
    // Step 1: get the front app ASN
    let front = std::process::Command::new("lsappinfo")
        .arg("front")
        .output()
        .ok()?;
    let asn = String::from_utf8_lossy(&front.stdout).trim().to_string();
    if asn.is_empty() {
        log_debug("[get_frontmost_app] lsappinfo front returned empty");
        return None;
    }

    // Step 2: get the bundle id from the ASN
    let info = std::process::Command::new("lsappinfo")
        .args(["info", "-only", "bundleid", &asn])
        .output()
        .ok()?;
    let raw = String::from_utf8_lossy(&info.stdout).trim().to_string();
    log_debug(&format!("[get_frontmost_app] asn={}, raw={:?}", asn, raw));

    // Parse: "CFBundleIdentifier"="com.example.app"
    let bid = raw
        .split('=')
        .nth(1)
        .map(|s| s.trim().trim_matches('"').to_string())
        .unwrap_or_default();

    if bid.is_empty() || bid.contains("com.ghosty") {
        None
    } else {
        Some(bid)
    }
}

/// Append a debug line to /tmp/ghosty_paste.log (for troubleshooting auto-paste).
pub fn log_debug(msg: &str) {
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/ghosty_paste.log")
    {
        let _ = writeln!(f, "{}", msg);
    }
}

#[cfg(not(target_os = "macos"))]
pub fn get_frontmost_app() -> Option<String> {
    None
}

/// Activate (bring to front) an application by its bundle identifier.
/// Returns true if activation succeeded.
#[cfg(target_os = "macos")]
pub fn activate_app(bundle_id: &str) -> bool {
    // `open -b` activates the app by bundle id — fast and reliable
    std::process::Command::new("open")
        .arg("-b")
        .arg(bundle_id)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(not(target_os = "macos"))]
pub fn activate_app(_bundle_id: &str) -> bool {
    false
}

/// Check if the frontmost application has a focused text input field.
/// Uses lsappinfo to get the frontmost app PID, then macOS Accessibility API
/// (AXUIElementCreateApplication + AXFocusedUIElement) to check the focused element's role.
#[cfg(target_os = "macos")]
pub fn has_focused_text_field() -> bool {
    // Step 1: get PID of frontmost app via lsappinfo
    let front = std::process::Command::new("lsappinfo")
        .arg("front")
        .output()
        .ok();
    let asn = front
        .as_ref()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default();
    if asn.is_empty() {
        log_debug("[has_focused_text_field] no front ASN");
        return false;
    }
    let pid_output = std::process::Command::new("lsappinfo")
        .args(["info", "-only", "pid", &asn])
        .output()
        .ok();
    let pid_str = pid_output
        .as_ref()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default();
    // Parse: "pid"=12345
    let pid: i32 = pid_str
        .split('=')
        .nth(1)
        .and_then(|s| s.trim().trim_matches('"').parse().ok())
        .unwrap_or(0);
    if pid == 0 {
        log_debug(&format!("[has_focused_text_field] no PID from {}", pid_str));
        return false;
    }

    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn AXUIElementCreateApplication(pid: i32) -> *mut std::ffi::c_void;
        fn AXUIElementCopyAttributeValue(
            element: *const std::ffi::c_void,
            attribute: *const std::ffi::c_void,
            value: *mut *mut std::ffi::c_void,
        ) -> i32;
    }
    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFRelease(cf: *mut std::ffi::c_void);
        fn CFStringCreateWithCString(
            alloc: *const std::ffi::c_void,
            c_str: *const u8,
            encoding: u32,
        ) -> *mut std::ffi::c_void;
        fn CFStringGetCString(
            s: *const std::ffi::c_void,
            buf: *mut u8,
            buf_size: isize,
            encoding: u32,
        ) -> bool;
    }

    fn cfstr(s: &str) -> *mut std::ffi::c_void {
        let c = std::ffi::CString::new(s).unwrap();
        unsafe {
            CFStringCreateWithCString(std::ptr::null(), c.as_ptr() as *const u8, 0x08000100)
        }
    }

    unsafe {
        // Step 2: get focused UI element of that app
        let ax_app = AXUIElementCreateApplication(pid);
        if ax_app.is_null() { return false; }

        let attr_focus = cfstr("AXFocusedUIElement");
        let mut focused: *mut std::ffi::c_void = std::ptr::null_mut();
        let err = AXUIElementCopyAttributeValue(ax_app, attr_focus, &mut focused);
        CFRelease(attr_focus);
        CFRelease(ax_app);

        if err != 0 || focused.is_null() {
            // Can't determine focus state — default to false (show toast).
            // Better to show a brief toast than silently fail to indicate clipboard.
            log_debug(&format!("[has_focused_text_field] pid={} err={} -> false (unknown)", pid, err));
            return false;
        }

        // Step 3: get role
        let attr_role = cfstr("AXRole");
        let mut role_val: *mut std::ffi::c_void = std::ptr::null_mut();
        let err2 = AXUIElementCopyAttributeValue(focused, attr_role, &mut role_val);
        CFRelease(attr_role);
        CFRelease(focused);

        if err2 != 0 || role_val.is_null() {
            log_debug("[has_focused_text_field] no role");
            return false;
        }

        let mut buf = [0u8; 128];
        let ok = CFStringGetCString(role_val, buf.as_mut_ptr(), 128, 0x08000100);
        CFRelease(role_val);

        if !ok { return false; }
        let role = std::ffi::CStr::from_ptr(buf.as_ptr() as *const i8)
            .to_string_lossy()
            .to_string();
        log_debug(&format!("[has_focused_text_field] pid={} role={}", pid, role));

        // Text-accepting roles
        matches!(
            role.as_str(),
            "AXTextField" | "AXTextArea" | "AXComboBox" | "AXSearchField" | "AXWebArea"
        )
    }
}

#[cfg(not(target_os = "macos"))]
pub fn has_focused_text_field() -> bool {
    false
}

/// Try to insert text directly into the focused text field using macOS Accessibility API.
/// Sets the AXSelectedText attribute on the focused UI element, which replaces the current
/// selection (or inserts at cursor if nothing is selected) without touching the clipboard.
///
/// Returns:
/// - `Ok(true)` if text was successfully inserted via AX (no clipboard pollution)
/// - `Ok(false)` if AX insertion failed (caller should fall back to clipboard+paste)
/// - `Err(...)` on unexpected errors
#[cfg(target_os = "macos")]
pub fn insert_text_via_ax(text: &str) -> Result<bool, String> {
    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn AXIsProcessTrusted() -> bool;
        fn AXUIElementCreateApplication(pid: i32) -> *mut std::ffi::c_void;
        fn AXUIElementCopyAttributeValue(
            element: *const std::ffi::c_void,
            attribute: *const std::ffi::c_void,
            value: *mut *mut std::ffi::c_void,
        ) -> i32;
        fn AXUIElementSetAttributeValue(
            element: *const std::ffi::c_void,
            attribute: *const std::ffi::c_void,
            value: *const std::ffi::c_void,
        ) -> i32;
    }
    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFRelease(cf: *mut std::ffi::c_void);
        fn CFStringCreateWithCString(
            alloc: *const std::ffi::c_void,
            c_str: *const u8,
            encoding: u32,
        ) -> *mut std::ffi::c_void;
    }

    const UTF8_ENCODING: u32 = 0x08000100;

    fn cfstr(s: &str) -> *mut std::ffi::c_void {
        let c = std::ffi::CString::new(s).unwrap();
        unsafe {
            CFStringCreateWithCString(std::ptr::null(), c.as_ptr() as *const u8, UTF8_ENCODING)
        }
    }

    // Check Accessibility permission first
    let trusted = unsafe { AXIsProcessTrusted() };
    if !trusted {
        log_debug("[insert_text_via_ax] AXIsProcessTrusted=false, skipping");
        return Ok(false);
    }

    // Get PID of frontmost app via lsappinfo
    let front = std::process::Command::new("lsappinfo")
        .arg("front")
        .output()
        .ok();
    let asn = front
        .as_ref()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default();
    if asn.is_empty() {
        log_debug("[insert_text_via_ax] no front ASN");
        return Ok(false);
    }
    let pid_output = std::process::Command::new("lsappinfo")
        .args(["info", "-only", "pid", &asn])
        .output()
        .ok();
    let pid_str = pid_output
        .as_ref()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default();
    let pid: i32 = pid_str
        .split('=')
        .nth(1)
        .and_then(|s| s.trim().trim_matches('"').parse().ok())
        .unwrap_or(0);
    if pid == 0 {
        log_debug(&format!("[insert_text_via_ax] no PID from {}", pid_str));
        return Ok(false);
    }

    unsafe {
        // Get the app AX element
        let ax_app = AXUIElementCreateApplication(pid);
        if ax_app.is_null() {
            log_debug("[insert_text_via_ax] AXUIElementCreateApplication returned null");
            return Ok(false);
        }

        // Get the focused UI element
        let attr_focus = cfstr("AXFocusedUIElement");
        let mut focused: *mut std::ffi::c_void = std::ptr::null_mut();
        let err = AXUIElementCopyAttributeValue(ax_app, attr_focus, &mut focused);
        CFRelease(attr_focus);
        CFRelease(ax_app);

        if err != 0 || focused.is_null() {
            log_debug(&format!(
                "[insert_text_via_ax] pid={} no focused element (err={})",
                pid, err
            ));
            return Ok(false);
        }

        // Try to set AXSelectedText — this inserts text at cursor / replaces selection
        let attr_selected_text = cfstr("AXSelectedText");
        let cf_text = cfstr(text);

        let set_err = AXUIElementSetAttributeValue(focused, attr_selected_text, cf_text);

        CFRelease(cf_text);
        CFRelease(attr_selected_text);
        CFRelease(focused);

        if set_err == 0 {
            log_debug(&format!(
                "[insert_text_via_ax] pid={} AXSelectedText set OK ({} chars)",
                pid,
                text.len()
            ));
            Ok(true)
        } else {
            log_debug(&format!(
                "[insert_text_via_ax] pid={} AXSelectedText failed (err={}), will fall back",
                pid, set_err
            ));
            Ok(false)
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub fn insert_text_via_ax(_text: &str) -> Result<bool, String> {
    Ok(false)
}

/// Send Cmd+V (macOS) or Ctrl+V (other) to the currently focused application.
/// On macOS, uses CGEvent API directly — posts to the session event stream,
/// delivered to whichever app currently has keyboard focus.
pub fn send_paste_keystroke() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        const K_CG_EVENT_FLAG_MASK_COMMAND: u64 = 0x00100000;
        const K_VK_V: u16 = 9;
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

        #[link(name = "ApplicationServices", kind = "framework")]
        extern "C" {
            fn AXIsProcessTrusted() -> bool;
        }

        // Check Accessibility permission
        let trusted = unsafe { AXIsProcessTrusted() };
        log_debug(&format!("[send_paste_keystroke] AXIsProcessTrusted={}", trusted));
        if !trusted {
            return Err("Ghosty does not have Accessibility permission".into());
        }

        unsafe {
            let source = CGEventSourceCreate(K_CG_EVENT_SOURCE_STATE_COMBINED);
            log_debug(&format!("[send_paste_keystroke] source={:?}", source));

            let v_down = CGEventCreateKeyboardEvent(source, K_VK_V, true);
            if v_down.is_null() {
                if !source.is_null() { CFRelease(source); }
                return Err("Failed to create CGEvent for V down".into());
            }
            CGEventSetFlags(v_down, K_CG_EVENT_FLAG_MASK_COMMAND);
            CGEventPost(K_CG_SESSION_EVENT_TAP, v_down);
            CFRelease(v_down);

            let v_up = CGEventCreateKeyboardEvent(source, K_VK_V, false);
            if !v_up.is_null() {
                CGEventSetFlags(v_up, K_CG_EVENT_FLAG_MASK_COMMAND);
                CGEventPost(K_CG_SESSION_EVENT_TAP, v_up);
                CFRelease(v_up);
            }

            if !source.is_null() { CFRelease(source); }
            log_debug("[send_paste_keystroke] CGEventPost completed");
        }

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        use enigo::{Enigo, Key, Keyboard, Settings};
        let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
        enigo.key(Key::Control, enigo::Direction::Press).map_err(|e| e.to_string())?;
        enigo.key(Key::Unicode('v'), enigo::Direction::Click).map_err(|e| e.to_string())?;
        enigo.key(Key::Control, enigo::Direction::Release).map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// Auto-paste via osascript: activate the target app and send Cmd+V via System Events.
/// This is the most reliable approach on macOS because:
/// - osascript runs as a separate process (no main thread / HIToolbox constraint)
/// - System Events keystroke is proven and reliable
/// - activation + keystroke happen atomically in one script
#[cfg(target_os = "macos")]
pub fn osascript_paste(bundle_id: &str) -> bool {
    // Get the app name from bundle id for the `activate` command
    let script = format!(
        r#"
        tell application id "{}" to activate
        delay 0.3
        tell application "System Events" to keystroke "v" using command down
        "#,
        bundle_id
    );
    log_debug(&format!("[osascript_paste] running for {}", bundle_id));
    let result = std::process::Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output();
    match result {
        Ok(output) => {
            let success = output.status.success();
            if !success {
                let stderr = String::from_utf8_lossy(&output.stderr);
                log_debug(&format!("[osascript_paste] failed: {}", stderr));
            } else {
                log_debug(&format!("[osascript_paste] success for {}", bundle_id));
            }
            success
        }
        Err(e) => {
            log_debug(&format!("[osascript_paste] error: {}", e));
            false
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub fn osascript_paste(_bundle_id: &str) -> bool {
    false
}

/// Auto-paste: reactivate the previous app and send Cmd+V.
/// `previous_app` is the bundle ID saved when recording started.
/// Returns true if we successfully reactivated the app and sent the keystroke.
#[allow(dead_code)]
pub fn auto_paste_to_app(previous_app: Option<&str>) -> bool {
    use std::thread;
    use std::time::Duration;

    log_debug(&format!("[auto_paste_to_app] previous_app={:?}", previous_app));

    let Some(bundle_id) = previous_app else {
        log_debug("[auto_paste_to_app] No previous app — clipboard-only");
        return false;
    };

    // Reactivate the user's app
    let activated = activate_app(bundle_id);
    log_debug(&format!("[auto_paste_to_app] activate_app({}) = {}", bundle_id, activated));
    if !activated {
        return false;
    }

    // Wait for macOS to actually switch focus
    thread::sleep(Duration::from_millis(250));

    // Send Cmd+V
    match send_paste_keystroke() {
        Ok(()) => {
            log_debug(&format!("[auto_paste_to_app] Cmd+V sent to {}", bundle_id));
            true
        }
        Err(e) => {
            log_debug(&format!("[auto_paste_to_app] Keystroke failed: {}", e));
            false
        }
    }
}
