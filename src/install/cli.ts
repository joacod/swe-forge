// Canonical SWE Forge installer CLI entrypoint.
import { runInstaller } from "./installer";

if (import.meta.main) {
  process.exitCode = runInstaller(process.argv.slice(2), { handleSignals: true });
}
