import fs from "fs";

async function run() {
  const baseUrl = "https://free.uazapi.com";
  
  // 1. Fetch JS asset to find embedded OpenAPI paths or specifications
  try {
    const jsRes = await fetch(`${baseUrl}/assets/index-CRijZfFE.js`);
    if (jsRes.ok) {
      const jsText = await jsRes.text();
      console.log("Fetched index JS. Searching for JSON/YAML/OpenAPI paths...");
      const regex = /["']([^"'\s]*\.(json|yaml|yml))["']/g;
      let match;
      const paths = new Set();
      while ((match = regex.exec(jsText)) !== null) {
        paths.add(match[1]);
      }
      console.log("Found file paths in JS:", Array.from(paths));
      
      // Let's also search for uazapi spec path or any other path starting with /
      const specPathsRegex = /\/spec[a-zA-Z0-9_\-\.\/]*\.(json|yaml|yml)/g;
      let specMatch;
      while ((specMatch = specPathsRegex.exec(jsText)) !== null) {
        console.log("Spec path candidate:", specMatch[0]);
      }
    }
  } catch (err) {
    console.error("Error reading JS asset:", err.message);
  }

  // 2. Scan other common API doc paths
  const testPaths = [
    "/openapi.json",
    "/openapi.yaml",
    "/swagger.json",
    "/swagger.yaml",
    "/api-docs",
    "/v2/api-docs",
    "/v3/api-docs",
    "/swagger/v1/swagger.json",
    "/assets/openapi.json",
    "/assets/openapi.yaml",
    "/assets/swagger.json",
    "/assets/swagger.yaml",
    "/spec.json",
    "/spec.yaml",
    "/api/spec.json",
    "/api/spec.yaml"
  ];

  for (const p of testPaths) {
    try {
      const res = await fetch(`${baseUrl}${p}`);
      if (res.ok) {
        console.log(`[FOUND] ${p} - Status: ${res.status}`);
        const text = await res.text();
        fs.writeFileSync(`scratch/found-spec-${p.replace(/\//g, "_")}`, text);
      }
    } catch (e) {
      // Ignore
    }
  }
}

run();
