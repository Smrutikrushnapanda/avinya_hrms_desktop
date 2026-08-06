// Ad-hoc (free) code signing for macOS builds when no Apple Developer ID
// identity is available. Gives the .app a valid bundle signature so
// Gatekeeper shows the standard "unidentified developer" warning instead of
// "app is damaged" — users can often right-click → Open without extra steps.
// Runs from electron-builder's afterPack hook (main process, CJS).
const { execSync } = require('child_process');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = context.appOutDir.endsWith('.app')
    ? context.appOutDir
    : require('path').join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);

  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('[afterPack] ad-hoc signing failed (non-fatal):', err.message);
  }
};
