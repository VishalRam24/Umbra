# CI Workflow Skeletons

These workflows are intentionally skeleton-only.

Files:
- ci-macos.yml
- ci-windows.yml
- ci-android.yml
- ci-ios.yml

What is included:
- checkout
- node setup
- npm install
- lightweight frontend validation steps
- placeholder native build steps

What you still need to add for real CI:
- Rust toolchain setup
- platform-specific SDK/toolchain setup
- signing/provisioning secrets
- native build invocation in place of placeholder step
