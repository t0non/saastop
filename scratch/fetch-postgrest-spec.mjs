import fs from "fs";

// Parse .env manually
const envFile = fs.readFileSync(".env", "utf8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    envVars[key] = val;
  }
});

async function run() {
  const url = `${envVars.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
  try {
    const res = await fetch(url, {
      headers: {
        "apikey": envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log("Exposed Tables/Definitions:", Object.keys(data.definitions || {}));
    } else {
      console.log(`Failed to fetch PostgREST spec: ${res.status}`);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
