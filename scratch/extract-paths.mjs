import fs from "fs";

function run() {
  const yamlContent = fs.readFileSync("scratch/uazapi-openapi-spec.yaml", "utf8");
  const lines = yamlContent.split("\n");
  
  let inPaths = false;
  let currentPath = "";
  const routes = [];

  for (const line of lines) {
    // Detect start of paths
    if (line.startsWith("paths:")) {
      inPaths = true;
      continue;
    }
    // Detect end of paths (starts with components or another root block)
    if (inPaths && line.length > 0 && !line.startsWith(" ") && !line.startsWith("paths:")) {
      inPaths = false;
    }

    if (inPaths) {
      const pathMatch = line.match(/^  (\/[a-zA-Z0-9_\-\/\{\}]+):/);
      if (pathMatch) {
        currentPath = pathMatch[1];
        continue;
      }
      
      const methodMatch = line.match(/^    (get|post|put|delete|patch):/);
      if (methodMatch && currentPath) {
        routes.push({
          path: currentPath,
          method: methodMatch[1].toUpperCase()
        });
      }
    }
  }

  console.log("Found UAZAPI Routes:");
  routes.forEach(r => console.log(`- ${r.method} ${r.path}`));
}

run();
