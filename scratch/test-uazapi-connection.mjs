async function run() {
  const baseUrl = "https://free.uazapi.com";
  const instanceToken = "d14056f5-787b-4c6b-922f-607b671718a8";

  console.log("Testing status call to UAZAPI using native fetch...");
  console.log("URL:", `${baseUrl}/instance/status`);
  console.log("Headers:", { token: instanceToken });

  try {
    const res = await fetch(`${baseUrl}/instance/status`, {
      method: "GET",
      headers: {
        "token": instanceToken,
      }
    });

    console.log("HTTP Status:", res.status);
    const bodyText = await res.text();
    console.log("Raw Response:", bodyText);

    try {
      const parsed = JSON.parse(bodyText);
      console.log("Parsed JSON:", JSON.stringify(parsed, null, 2));
    } catch {
      console.log("Response is not JSON.");
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

run();
