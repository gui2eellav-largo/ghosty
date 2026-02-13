/// Génération et installation des workflows Services macOS (clic droit) à partir des modes Ghosty.
use std::fs;
use std::path::Path;

use crate::modes::ModeConfig;

const WORKFLOW_TYPE_SERVICES: &str = "com.apple.Automator.servicesMenu";
const SEND_TYPE_TEXT: &str = "public.utf8-plain-text";

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Crée le répertoire workflow et écrit Info.plist + document.wflow pour un mode.
pub fn write_workflow_for_mode(services_dir: &Path, mode: &ModeConfig) -> Result<(), String> {
    let safe_name = mode.name.replace('/', "-").replace(':', " ");
    let bundle_name = format!("Ghosty – {}.workflow", safe_name);
    let workflow_path = services_dir.join(&bundle_name);
    let contents = workflow_path.join("Contents");
    let resources = contents.join("Resources");
    fs::create_dir_all(&resources).map_err(|e| e.to_string())?;

    let bundle_id = format!("com.ghosty.app.service.{}", mode.id.replace('.', "-"));
    let menu_title = format!("Ghosty – {}", safe_name);
    let command = format!("open \"ghosty://transform?mode={}\"", escape_xml(&mode.id));

    let input_uuid = uuid::Uuid::new_v4()
        .to_string()
        .to_uppercase()
        .replace('-', "");
    let input_uuid = format!(
        "{}-{}-{}-{}-{}",
        &input_uuid[0..8],
        &input_uuid[8..12],
        &input_uuid[12..16],
        &input_uuid[16..20],
        &input_uuid[20..32]
    );
    let output_uuid = uuid::Uuid::new_v4().to_string().to_uppercase();
    let action_uuid = uuid::Uuid::new_v4().to_string().to_uppercase();

    let info_plist = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleIdentifier</key>
	<string>{}</string>
	<key>CFBundleName</key>
	<string>{}</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>NSServices</key>
	<array>
		<dict>
			<key>NSMenuItem</key>
			<dict>
				<key>default</key>
				<string>{}</string>
			</dict>
			<key>NSMessage</key>
			<string>runWorkflowAsService</string>
			<key>NSRequiredContext</key>
			<dict/>
			<key>NSSendTypes</key>
			<array>
				<string>{}</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
"#,
        escape_xml(&bundle_id),
        escape_xml(&menu_title),
        escape_xml(&menu_title),
        SEND_TYPE_TEXT
    );

    fs::write(contents.join("Info.plist"), info_plist).map_err(|e| e.to_string())?;

    let version_plist = r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>BuildVersion</key>
	<string>346</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>ProjectName</key>
	<string>Automator</string>
	<key>SourceVersion</key>
	<string>533000000000000</string>
</dict>
</plist>
"#;
    fs::write(contents.join("version.plist"), version_plist).map_err(|e| e.to_string())?;

    let document_wflow = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AMApplicationBuild</key>
	<string>346</string>
	<key>AMApplicationVersion</key>
	<string>2.10</string>
	<key>AMDocumentVersion</key>
	<string>2</string>
	<key>actions</key>
	<array>
		<dict>
			<key>action</key>
			<dict>
				<key>AMAccepts</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Optional</key>
					<true/>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>AMActionVersion</key>
				<string>2.0.3</string>
				<key>AMApplication</key>
				<array>
					<string>Automator</string>
				</array>
				<key>AMParameterProperties</key>
				<dict>
					<key>COMMAND_STRING</key>
					<dict/>
					<key>CheckedForUserDefaultShell</key>
					<dict/>
					<key>inputMethod</key>
					<dict/>
					<key>shell</key>
					<dict/>
					<key>source</key>
					<dict/>
				</dict>
				<key>AMProvides</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>ActionBundlePath</key>
				<string>/System/Library/Automator/Run Shell Script.action</string>
				<key>ActionName</key>
				<string>Run Shell Script</string>
				<key>ActionParameters</key>
				<dict>
					<key>COMMAND_STRING</key>
					<string>{}</string>
					<key>CheckedForUserDefaultShell</key>
					<true/>
					<key>inputMethod</key>
					<integer>0</integer>
					<key>shell</key>
					<string>/bin/bash</string>
					<key>source</key>
					<string></string>
				</dict>
				<key>BundleIdentifier</key>
				<string>com.apple.RunShellScript</string>
				<key>CFBundleVersion</key>
				<string>2.0.3</string>
				<key>CanShowSelectedItemsWhenRun</key>
				<false/>
				<key>CanShowWhenRun</key>
				<true/>
				<key>Category</key>
				<array>
					<string>AMCategoryUtilities</string>
				</array>
				<key>Class Name</key>
				<string>RunShellScriptAction</string>
				<key>InputUUID</key>
				<string>{}</string>
				<key>Keywords</key>
				<array/>
				<key>OutputUUID</key>
				<string>{}</string>
				<key>UUID</key>
				<string>{}</string>
				<key>UnlocalizedApplications</key>
				<array>
					<string>Automator</string>
				</array>
				<key>arguments</key>
				<dict>
					<key>0</key>
					<dict>
						<key>default value</key>
						<integer>0</integer>
						<key>name</key>
						<string>inputMethod</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>0</string>
					</dict>
					<key>1</key>
					<dict>
						<key>default value</key>
						<string></string>
						<key>name</key>
						<string>source</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>1</string>
					</dict>
					<key>2</key>
					<dict>
						<key>default value</key>
						<false/>
						<key>name</key>
						<string>CheckedForUserDefaultShell</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>2</string>
					</dict>
					<key>3</key>
					<dict>
						<key>default value</key>
						<string></string>
						<key>name</key>
						<string>COMMAND_STRING</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>3</string>
					</dict>
					<key>4</key>
					<dict>
						<key>default value</key>
						<string>/bin/sh</string>
						<key>name</key>
						<string>shell</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>4</string>
					</dict>
				</dict>
				<key>isViewVisible</key>
				<true/>
				<key>location</key>
				<string>309.500000:631.000000</string>
				<key>nibPath</key>
				<string>/System/Library/Automator/Run Shell Script.action/Contents/Resources/en.lproj/main.nib</string>
			</dict>
			<key>isViewVisible</key>
			<true/>
		</dict>
	</array>
	<key>connectors</key>
	<dict/>
	<key>state</key>
	<dict>
		<key>windowFrame</key>
		<string>{{{{100, 100}}, {{500, 300}}}}</string>
	</dict>
	<key>workflowMetaData</key>
	<dict>
		<key>serviceInputTypeIdentifier</key>
		<string>{}</string>
		<key>serviceOutputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>serviceProcessesInput</key>
		<integer>1</integer>
		<key>workflowTypeIdentifier</key>
		<string>{}</string>
	</dict>
</dict>
</plist>
"#,
        command, input_uuid, output_uuid, action_uuid, SEND_TYPE_TEXT, WORKFLOW_TYPE_SERVICES
    );

    fs::write(resources.join("document.wflow"), document_wflow).map_err(|e| e.to_string())?;
    Ok(())
}
