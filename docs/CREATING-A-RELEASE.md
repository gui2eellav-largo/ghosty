# Creating a GitHub release

Until a release is published, the [Releases](https://github.com/gui2eellav-largo/ghosty/releases) page shows "There aren't any releases here". Users can still get the app via **Actions** → Artifacts. To offer a direct download from the Releases tab, create a release.

---

## Option 1: First release manually

1. **Build the app locally**
   ```bash
   npm run tauri:build
   ```
   Output is in `src-tauri/target/release/bundle/` (e.g. `macos/` for the .app, and optionally a .dmg depending on Tauri config).

2. **On GitHub**
   - Go to [Releases](https://github.com/gui2eellav-largo/ghosty/releases).
   - Click **Create a new release**.

3. **Create a tag**
   - **Choose a tag**: enter a name (e.g. `v0.1.0`) then **Create new tag**.
   - Target: `main` (or the branch to publish).

4. **Title and notes**
   - **Release title**: e.g. `v0.1.0` or `First release`.
   - **Describe this release**: short summary of changes or "First release".

5. **Add binaries**
   - Under **Assets**, drag and drop the files to offer for download, e.g.:
     - the **.dmg** file if present in `src-tauri/target/release/bundle/macos/`, or
     - a **.zip** archive of the `Ghosty.app` folder (right-click `Ghosty.app` → Compress).

6. **Publish**
   - Click **Publish release**.

After publishing, the Releases page will show the version and downloadable files.

---

## Option 2: Use the CI artifact

If you don't want to build locally:

1. Go to [Actions](https://github.com/gui2eellav-largo/ghosty/actions).
2. Open the latest successful run (e.g. "CI" or "Build Tauri" workflow).
3. At the bottom, **Artifacts** section: download **ghosty-macos**.
4. Unzip the archive: you get the contents of `bundle/` (including `macos/Ghosty.app`).
5. Create a release as in Option 1, and upload the .dmg or a .zip of the .app to Assets.

---

## Automating releases (optional)

To create a release automatically on each tag (e.g. `v0.1.0`):

- Add a job in `.github/workflows/` that runs on `push: tags: ['v*']`.
- That job builds the app, then uses an action (e.g. `softprops/action-gh-release`) to create the release and attach the binaries.

See [GitHub docs](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) and example Tauri "release" workflows.
