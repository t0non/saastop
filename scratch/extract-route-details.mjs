import fs from "fs";

function extractBlock(path, method) {
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
    
    // If we are in path and see a new path
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
      
      if (inMethod && line.startsWith("    ") && !line.startsWith(`    ${method}:`) && line.search(/\S/) === indentLevel) {
        inMethod = false;
      }

      if (inMethod) {
        resultLines.push(line);
      }
    }
  }

  // Print first 100 lines and then requestBody/responses sections specifically
  const fullText = resultLines.join("\n");
  console.log(`\n=========================================`);
  console.log(`SPEC FOR ${method.toUpperCase()} ${path}`);
  console.log(`=========================================`);
  
  const reqBodyIndex = fullText.indexOf("requestBody:");
  const responsesIndex = fullText.indexOf("responses:");
  
  if (reqBodyIndex !== -1) {
    const endReq = responsesIndex !== -1 ? responsesIndex : fullText.length;
    console.log("--- requestBody ---");
    console.log(fullText.substring(reqBodyIndex, endReq).trim());
  }
  
  if (responsesIndex !== -1) {
    console.log("--- responses ---");
    console.log(fullText.substring(responsesIndex).trim().substring(0, 1500));
  }
}

extractBlock("/chat/find", "post");
extractBlock("/message/find", "post");
extractBlock("/send/text", "post");
