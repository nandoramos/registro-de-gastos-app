import {
  cp,
  copyFile,
  mkdir,
  mkdtemp,
  symlink,
  writeFile,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

// The normal source tree, Next config and .env files are never changed.
const root = process.cwd();
await mkdir(resolve(root, ".navigation-benchmark"), { recursive: true });
const workspace = await mkdtemp(resolve(root, ".navigation-benchmark/run-"));
for (const path of [
  "src",
  "drizzle",
  "tsconfig.json",
  "postcss.config.mjs",
  "package.json",
]) {
  await cp(resolve(root, path), resolve(workspace, path), { recursive: true });
}
await copyFile(
  resolve(root, "tests/support/navigation-runtime.ts"),
  resolve(workspace, "src/modules/auth/server.ts"),
);
await symlink(
  resolve(root, "node_modules"),
  resolve(workspace, "node_modules"),
);
await writeFile(
  resolve(workspace, "next.config.mjs"),
  'export default {serverExternalPackages:["@electric-sql/pglite"]};\n',
);
// Allowlist: personal database URLs, OAuth credentials and .env never enter the copy.
const env = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "SystemRoot"]
    .filter((key) => process.env[key])
    .map((key) => [key, process.env[key]]),
);
env.NEXT_TELEMETRY_DISABLED = "1";
let active;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    active?.kill(signal);
  });
async function next(args) {
  await new Promise((accept, reject) => {
    active = spawn(
      process.execPath,
      [resolve(root, "node_modules/next/dist/bin/next"), ...args],
      { cwd: workspace, env, stdio: "inherit" },
    );
    active.on("error", reject);
    active.on("exit", (code) =>
      code === 0 ? accept() : reject(new Error(`Next exited with ${code}`)),
    );
  });
}
await next(["build", "--webpack"]);
await next(["start", "--hostname", "localhost", "--port", "3107"]);
