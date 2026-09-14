import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"

const distFile = path.resolve(process.cwd(), "dist", "server.cjs")

if (fs.existsSync(distFile)) {
  await import("./dist/server.cjs")
} else {
  console.log("[Server Launcher] dist/server.cjs not found. Starting server via tsx...")
  const child = spawn("npx", ["tsx", "server.ts"], {
    stdio: "inherit",
    env: process.env,
  })
  child.on("exit", (code) => process.exit(code ?? 0))
}
