async function run() {
  const payload = {
    "BaseUrl": "https://free.uazapi.com",
    "EventType": "messages",
    "chat": {
      "wa_chatid": "553197922538@s.whatsapp.net",
      "name": "Top Marketing BH",
      "owner": "553199384130",
      "phone": "+55 31 9792-2538",
      "wa_contactName": "Top Marketing BH",
      "wa_isGroup": false,
      "wa_name": "TOP MARKETING"
    },
    "instanceName": "teste",
    "message": {
      "chatid": "553197922538@s.whatsapp.net",
      "content": "Uuu",
      "fromMe": false,
      "id": "553199384130:A5250074652A0A7B048DDC451E4AFCAE",
      "isGroup": false,
      "messageTimestamp": 1783483501000,
      "messageType": "Conversation",
      "messageid": "A5250074652A0A7B048DDC451E4AFCAE",
      "owner": "553199384130",
      "text": "Uuu",
      "type": "text",
      "wasSentByApi": false
    },
    "owner": "553199384130",
    "token": "d14056f5-787b-4c6b-922f-607b671718a8"
  };

  console.log("Sending POST to http://localhost:3000/api/webhooks/uazapi...");
  try {
    const res = await fetch("http://localhost:3000/api/webhooks/uazapi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("HTTP Status:", res.status);
    const bodyText = await res.text();
    console.log("Response Body:", bodyText);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

run();
