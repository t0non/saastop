import fs from "fs";

function extractDetails(path, method) {
  const yamlContent = fs.readFileSync("scratch/uazapi-openapi-spec.yaml", "utf8");
  const lines = yamlContent.split("\n");
  
  let inPath = false;
  let inMethod = false;
  let indentLevel = -1;
  const resultLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find path
    if (line.startsWith(`  ${path}:`)) {
      inPath = true;
      continue;
    }
    
    // If we are in path and see a new path at indent 2
    if (inPath && line.startsWith("  /") && !line.startsWith(`  ${path}:`)) {
      inPath = false;
      inMethod = false;
    }

    if (inPath) {
      if (line.startsWith(`    ${method}:`)) {
        inMethod = true;
        indentLevel = line.search(/\S/);
        resultLines.push(line);
        continue;
      }
      
      // If we see another method at same indent
      if (inMethod && line.startsWith("    ") && !line.startsWith(`    ${method}:`) && line.search(/\S/) === indentLevel) {
        inMethod = false;
      }

      if (inMethod) {
        resultLines.push(line);
      }
    }
  }

  console.log(`\n=========================================`);
  console.log(`DETAILS FOR ${method.toUpperCase()} ${path}`);
  console.log(`=========================================`);
  console.log(resultLines.join("\n"));
}

extractDetails("/chat/find", "post");
extractDetails("/message/find", "post");
extractDetails("/send/text", "post");
extractDetails("/webhook", "post");
extractDetails("/instance/connect", "post");
