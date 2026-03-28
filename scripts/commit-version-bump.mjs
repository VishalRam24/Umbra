import fs from "node:fs";

const commitMsgFile = process.argv[2];

if (!commitMsgFile) {
    console.error("[commit-version-bump] Missing commit message file path.");
    process.exit(1);
}

const commitMessage = fs.readFileSync(commitMsgFile, "utf8").trim();
const firstLine = commitMessage.split("\n")[0].trim();

const isVersionBumpCommit = /^version_bump(?:\([^\)]+\))?:\s+.+/i.test(firstLine);

if (isVersionBumpCommit) {
    console.log("[commit-version-bump] version_bump commit detected. Running minor bump...");
    process.exitCode = 0;
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("npm", ["run", "version:minor"], {
        stdio: "inherit",
        shell: process.platform === "win32",
    });

    if (result.status !== 0) {
        console.error("[commit-version-bump] Failed to bump version.");
        process.exit(result.status ?? 1);
    }

    const addResult = spawnSync(
        "git",
        ["add", "package.json", "package-lock.json", "src-tauri/Cargo.toml", "src-tauri/tauri.conf.json"],
        {
            stdio: "inherit",
            shell: process.platform === "win32",
        }
    );

    if (addResult.status !== 0) {
        console.error("[commit-version-bump] Failed to stage bumped version files.");
        process.exit(addResult.status ?? 1);
    }

    console.log("[commit-version-bump] Version bump complete and staged.");
} else {
    console.log("[commit-version-bump] No version bump required for this commit type.");
}
