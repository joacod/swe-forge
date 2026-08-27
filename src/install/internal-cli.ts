// Internal parity entrypoint. The public installer remains scripts/swe-forge.
import { runInstaller } from "./installer";

if (import.meta.main) {
  process.exitCode = runInstaller(process.argv.slice(2), { handleSignals: true });
}
