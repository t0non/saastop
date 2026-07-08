import fs from "fs";

async function checkUrl(url) {
  try {
    const res = await fetch(url);
    console.log(`Checking ${url} - Status: ${res.status}`);
    if (res.ok) {
      const text = await res.text();
      console.log(`Found! Length: ${text.length}`);
      return text;
    }
  } catch (err) {
    console.error(`Error checking ${url}:`, err.message);
  }
  return null;
}

async function run() {
  const baseUrl = "https://free.uazapi.com";
  const paths = [
    "/openapi.json",
    "/openapi.yaml",
    "/swagger.json",
    "/swagger.yaml",
    "/docs/openapi.json",
    "/docs/openapi.yaml",
    "/api-docs",
    "/api/docs",
    "/docs"
  ];

  for (const path of paths) {
    const content = await checkUrl(`${baseUrl}${path}`);
    if (content) {
      fs.writeFileSync(`scratch/uazapi-openapi${path.endsWith(".yaml") ? ".yaml" : ".json"}`, content);
      console.log(`Saved to scratch/uazapi-openapi${path.endsWith(".yaml") ? ".yaml" : ".json"}`);
      break;
    }
  }
}

run();
