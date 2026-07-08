import fs from "fs";

async function run() {
  const baseUrl = "https://free.uazapi.com";
  try {
    console.log("Fetching /docs...");
    const docsRes = await fetch(`${baseUrl}/docs`);
    if (!docsRes.ok) {
      console.log(`Failed to fetch /docs: ${docsRes.status}`);
      return;
    }
    const html = await docsRes.text();
    console.log("HTML length:", html.length);
    
    // Find all script tags
    const scriptSrcRegex = /src=["']([^"']+)["']/g;
    let match;
    const scripts = [];
    while ((match = scriptSrcRegex.exec(html)) !== null) {
      scripts.push(match[1]);
    }
    console.log("Found scripts in HTML:", scripts);

    for (const src of scripts) {
      const url = src.startsWith("http") ? src : `${baseUrl}${src}`;
      console.log(`Fetching script: ${url}`);
      const jsRes = await fetch(url);
      if (!jsRes.ok) {
        console.log(`Failed to fetch script: ${jsRes.status}`);
        continue;
      }
      const js = await jsRes.text();
      console.log(`Script length: ${js.length}`);
      
      // Look for .json, .yaml, or .yml URLs
      const jsonRegex = /["']([^"'\s]*\.(json|yaml|yml))["']/g;
      let jsonMatch;
      const paths = new Set();
      while ((jsonMatch = jsonRegex.exec(js)) !== null) {
        paths.add(jsonMatch[1]);
      }
      console.log("Found potential files in JS:", Array.from(paths));
      
      // Look for fetch calls or api URLs
      const urlRegex = /https?:\/\/[^\s"'`]+/g;
      let urlMatch;
      const urls = new Set();
      while ((urlMatch = urlRegex.exec(js)) !== null) {
        urls.add(urlMatch[0]);
      }
      console.log("Found URLs in JS:", Array.from(urls).slice(0, 10));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
