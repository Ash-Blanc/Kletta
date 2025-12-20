import { serve, spawn } from "bun";
import { join } from "path";

const PORT = process.env.PORT || 3001;

console.log(`Kletta Bun Server starting on port ${PORT}...`);

async function runKaggleScript(command: string, creds: any, params: any) {
  const proc = spawn(["python3", "kaggle_wrapper.py"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  const input = JSON.stringify({ command, credentials: creds, params });
  proc.stdin.write(input);
  proc.stdin.flush();
  proc.stdin.end();

  const output = await new Response(proc.stdout).text();
  const error = await new Response(proc.stderr).text();
  
  if (error && !output) {
      console.error("Python Error:", error);
      throw new Error(error);
  }

  try {
      return JSON.parse(output);
  } catch (e) {
      console.error("JSON Parse Error:", output);
      throw new Error("Invalid JSON output from Python script");
  }
}

const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Python-backed Kaggle API
    if (url.pathname.startsWith("/api/kaggle/")) {
      const kagglePath = url.pathname.replace("/api/kaggle/", "");
      
      // Extract Creds
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Basic ")) {
          return new Response(JSON.stringify({ error: "Missing credentials" }), { status: 401 });
      }
      
      const token = authHeader.split(" ")[1];
      const decoded = atob(token);
      const [username, key] = decoded.split(":");

      const creds = { username, key };
      const searchParams = Object.fromEntries(url.searchParams);

      try {
          let result;
          if (kagglePath === "competitions/list") {
              result = await runKaggleScript("listCompetitions", creds, searchParams);
          } else if (kagglePath === "datasets/list") {
              result = await runKaggleScript("listDatasets", creds, searchParams);
          } else {
              return new Response(JSON.stringify({ error: "Endpoint not supported via Python wrapper yet" }), { status: 404 });
          }

          if (result.error) {
               return new Response(JSON.stringify({ error: result.error }), { status: 500 });
          }

          return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });

      } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // 2. Serve static files from 'dist' in production
    // In dev, Vite handles this. This part is for 'bun run server.ts' after 'bun run build'
    const publicPath = join(process.cwd(), "dist");
    let path = url.pathname;
    if (path === "/") path = "/index.html";

    const file = Bun.file(join(publicPath, path));
    if (await file.exists()) {
      return new Response(file);
    }

    // Fallback to index.html for SPA routing
    const index = Bun.file(join(publicPath, "index.html"));
    if (await index.exists()) {
      return new Response(index);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
