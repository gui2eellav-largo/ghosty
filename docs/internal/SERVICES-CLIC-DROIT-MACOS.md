# macOS Services: transform text on right-click (no Cmd+C)

On macOS you can add entries to the **Services** menu (right-click on a selection) to send the selected text to Ghosty and transform it with a mode. **No copy (Cmd+C) needed**: the system puts the selection on the clipboard before running the service.

---

## Why don't I see "Ghosty" or the modes on right-click?

**Reason 1 – Services are not created yet**  
Ghosty does not add entries to the context menu by itself. You must **create once** the Quick Actions in Automator (see below), then **enable** them in System Settings.

**Reason 2 – They are in the "Services" submenu**  
Entries do **not** appear at the top of the context menu. Go to the bottom of the menu, open the **Services** submenu, then choose e.g. **Ghosty – Direct**.

- In **Chrome / Google**: right-click the selected text → scroll to the bottom of the menu → **Services** → **Ghosty – Direct** (or another mode).
- If you don't see **Services**: either the quick actions were not created/enabled (see "Enable services"), or the app (e.g. some web pages) does not offer Services for text.

**Reason 3 – Services are not enabled**  
After creating the workflows, you must check them in **System Settings > Keyboard Shortcuts > Services** (**Text** section).

### Summary (recommended: 2 steps)

1. **Install**: In Ghosty, open **Settings > System** and click **"Install Services"**. Workflows are created automatically from your **current modes** (built-in + custom) and copied to `~/Library/Services/`.
2. **Enable**: System Settings > Keyboard Shortcuts > Services (**Text** section), check the **Ghosty – …** entries.
3. **Use**: Select text → right-click → bottom of menu → **Services** → **Ghosty – Direct** (or another mode).

(If you prefer to create the workflows manually in Automator, see "Create a service" below.)

---

## Prerequisites

- **Ghosty must be launched from the built app** (the .app file), not from dev mode (`npm run tauri dev`). The **built** app is what registers the `ghosty://` scheme with macOS (Launch Services). If you see "No application knows how to open URL ghosty://...", the scheme is not registered: build the app (`npm run tauri build`), open the generated .app (or install it in Applications) and launch it at least once.
- The `ghosty://` scheme will stay associated with Ghosty as long as the app has been opened at least once from the bundle.

## Create a service (Quick Action) for a mode

1. Open **Automator** (Spotlight search > Automator).
2. **File > New** then choose **Quick Action**.
3. Top left:
   - **Workflow receives**: **text**.
   - **In**: **any application**.
4. In the library, find **Run Shell Script** and drag it into the workflow.
5. Leave **Shell**: `/bin/bash` (or `/bin/zsh`).
6. In the script, enter **one line** (adjust `mode=` for the desired mode):

   ```bash
   open "ghosty://transform?mode=light"
   ```

   **Built-in modes:**
   - `light` — Direct (no LLM, text unchanged).
   - `medium` — Shape.
   - `strong` — Reframe.
   - `full` — Build.

7. **File > Save**.
8. Suggested name: **Ghosty – Direct** (for `mode=light`), **Ghosty – Shape** (for `medium`), etc.
9. Save in the default folder (quick actions then appear under **Services**).

## Enable services

1. **System Settings > Keyboard Shortcuts > App Shortcuts > Services** (or **System Preferences > Keyboard > Shortcuts > Services**).
2. In the **Text** list, check the **Ghosty – Direct**, **Ghosty – Shape**, etc. entries you created.

## Usage

1. Select text in any app (Safari, Notes, VS Code, etc.).
2. **Right-click** the selection.
3. **Services** > **Ghosty – Direct** (or the chosen mode).
4. Ghosty transforms the text (or leaves it as-is in Direct mode), puts it on the clipboard and **pastes automatically** if "Auto-paste after transform" is enabled in settings (Behavior).

## Troubleshooting: "This service could not be launched because it is not configured correctly"

This error appears when you choose a mode from the Services menu (before Ghosty even opens). Possible causes:

1. **Workflows generated with an older version**: Reinstall Services from Ghosty (Settings > System > **Install Services**) to regenerate workflows with a valid `Info.plist`.
2. **Console**: Open the **Console** app, filter by `WorkflowServiceRunner` or `Automator`, run the service again and check the error messages for details.
3. **Test with a manual workflow**: Create a Quick Action in Automator (receives Text, script `open "ghosty://transform?mode=light"`), save it in the default folder, enable it in Shortcuts > Services. If this manual workflow works, the issue was with the generated workflows; otherwise, check that Ghosty is launched from the .app and that the `ghosty://` scheme is registered.

## Troubleshooting: "No application knows how to open URL ghosty://..."

This error means macOS (Launch Services) has **no application** registered for the `ghosty://` scheme. This happens if you run Ghosty **in development mode** (`npm run tauri dev`): the dev binary does not register the scheme.

**Solution:** Build the app and launch it from the bundle:
1. `npm run tauri build`
2. Open the generated .app (in `src-tauri/target/release/bundle/macos/` or after installing in Applications)
3. Launch Ghosty at least once from this .app
4. Try again: right-click → Services → Ghosty – …

After that, the scheme stays associated with Ghosty as long as the app has been opened at least once from the .app.

## Quick terminal test

To check that the `ghosty://` scheme works (with text already copied to the clipboard):

```bash
open "ghosty://transform?mode=light"
```

Ghosty should read the clipboard, process the text with mode `light`, put the result on the clipboard and paste if the option is enabled.

## Custom modes

If you created custom modes in Ghosty, use their **id** (e.g. a UUID or custom identifier) in the URL:

```bash
open "ghosty://transform?mode=YOUR_MODE_ID"
```

You can create one quick action per custom mode the same way as for built-in modes.
