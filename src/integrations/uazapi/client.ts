import {
  UazapiChatFindResponseSchema,
  UazapiMessageFindResponseSchema,
  UazapiSendTextResponseSchema,
  UazapiInstanceStatusResponseSchema,
  UazapiContactListResponseSchema
} from "./schemas";

// Helper to mask chatId/Phone for safe logging
function maskChatId(chatId: string | null | undefined): string {
  if (!chatId) return "null";
  if (chatId.length <= 6) return "***";
  return `${chatId.slice(0, 3)}***${chatId.slice(-3)}`;
}

// Secure logger helper
function logRequest(
  method: string,
  url: string,
  status: number,
  durationMs: number,
  extra: Record<string, unknown> = {}
) {
  console.log(`[UAZAPI_CLIENT_LOG]`, {
    method,
    url: url.split("?")[0], // omit tokens in query params if any
    status,
    durationMs,
    ...extra
  });
}

export async function createInstance(baseUrl: string, adminToken: string, name: string) {
  const url = `${baseUrl}/instance/create`;
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "admintoken": adminToken
      },
      body: JSON.stringify({ name }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    logRequest("POST", url, res.status, duration, { instanceName: name });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`UAZAPI error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    // Parse response using instance schema or extract token safely
    const token = data.token ?? data.instance?.token ?? data.instance_token;
    if (!token) {
      throw new Error("Instance token was not returned in create response");
    }
    return { token, instance: data.instance };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[UAZAPI_CLIENT_ERROR] createInstance failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function connectInstance(baseUrl: string, instanceToken: string, phone?: string) {
  const url = `${baseUrl}/instance/connect`;
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const payload: Record<string, string> = {
    browser: "auto"
  };
  if (phone) {
    payload.phone = phone.replace(/\D/g, "");
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    logRequest("POST", url, res.status, duration, { hasPhone: !!phone });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`UAZAPI error (${res.status}): ${errText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[UAZAPI_CLIENT_ERROR] connectInstance failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function getInstanceStatus(baseUrl: string, instanceToken: string) {
  const url = `${baseUrl}/instance/status`;
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "token": instanceToken
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!res.ok) {
      logRequest("GET", url, res.status, duration);
      throw new Error(`UAZAPI error (${res.status})`);
    }

    const raw = await res.json();
    const parse = UazapiInstanceStatusResponseSchema.safeParse(raw);
    
    const possuiQr = !!(parse.success && parse.data.instance?.qrcode);
    const possuiPair = !!(parse.success && parse.data.instance?.paircode);
    const statusVal = parse.success ? parse.data.instance?.status : "unknown";

    logRequest("GET", url, res.status, duration, {
      status: statusVal,
      possuiQr,
      possuiPair,
      connected: parse.success ? (parse.data.connected || parse.data.loggedIn) : false
    });

    if (!parse.success) {
      console.warn(`[UAZAPI_CLIENT_WARN] Status response schema validation failed:`, parse.error.format());
      return UazapiInstanceStatusResponseSchema.parse(raw); // Let it throw or return parsed anyway
    }

    return parse.data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[UAZAPI_CLIENT_ERROR] getInstanceStatus failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function findChats(baseUrl: string, instanceToken: string, limit: number, offset: number) {
  const url = `${baseUrl}/chat/find`;
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const payload = {
    operator: "AND",
    sort: "-wa_lastMsgTimestamp",
    limit,
    offset,
    wa_isGroup: false
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    logRequest("POST", url, res.status, duration, { limit, offset });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`UAZAPI error (${res.status}): ${errText}`);
    }

    const raw = await res.json();
    const parse = UazapiChatFindResponseSchema.safeParse(raw);
    if (!parse.success) {
      console.warn(`[UAZAPI_CLIENT_WARN] Chat find schema validation failed:`, parse.error.format());
      return UazapiChatFindResponseSchema.parse(raw);
    }
    return parse.data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[UAZAPI_CLIENT_ERROR] findChats failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function findMessages(
  baseUrl: string,
  instanceToken: string,
  chatId: string,
  limit: number,
  offset: number
) {
  const url = `${baseUrl}/message/find`;
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const payload = {
    chatid: chatId,
    limit,
    offset
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    logRequest("POST", url, res.status, duration, { chatId: maskChatId(chatId), limit, offset });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`UAZAPI error (${res.status}): ${errText}`);
    }

    const raw = await res.json();
    const parse = UazapiMessageFindResponseSchema.safeParse(raw);
    if (!parse.success) {
      console.warn(`[UAZAPI_CLIENT_WARN] Message find schema validation failed:`, parse.error.format());
      return UazapiMessageFindResponseSchema.parse(raw);
    }
    return parse.data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[UAZAPI_CLIENT_ERROR] findMessages failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function sendText(baseUrl: string, instanceToken: string, number: string, text: string) {
  const url = `${baseUrl}/send/text`;
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const payload = {
    number,
    text
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    if (!res.ok) {
      const errText = await res.text();
      logRequest("POST", url, res.status, duration, { number: maskChatId(number) });
      throw new Error(`UAZAPI error (${res.status}): ${errText}`);
    }

    const raw = await res.json();
    const parse = UazapiSendTextResponseSchema.safeParse(raw);
    
    const messageId = parse.success ? (parse.data.messageid || parse.data.id) : "unknown";
    logRequest("POST", url, res.status, duration, {
      number: maskChatId(number),
      messageId
    });

    if (!parse.success) {
      console.warn(`[UAZAPI_CLIENT_WARN] Send text schema validation failed:`, parse.error.format());
      return UazapiSendTextResponseSchema.parse(raw);
    }
    return parse.data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[UAZAPI_CLIENT_ERROR] sendText failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function listContacts(
  baseUrl: string,
  instanceToken: string,
  limit: number,
  offset: number,
  contactScope: string = "all"
) {
  const url = `${baseUrl}/contacts/list`;
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const payload = {
    limit,
    offset,
    contactScope
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    logRequest("POST", url, res.status, duration, { limit, offset, contactScope });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`UAZAPI error (${res.status}): ${errText}`);
    }

    const raw = await res.json();
    const parse = UazapiContactListResponseSchema.safeParse(raw);
    if (!parse.success) {
      console.warn(`[UAZAPI_CLIENT_WARN] Contact list schema validation failed:`, parse.error.format());
      return UazapiContactListResponseSchema.parse(raw);
    }
    return parse.data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[UAZAPI_CLIENT_ERROR] listContacts failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function configureWebhook(baseUrl: string, instanceToken: string, webhookUrl: string) {
  const url = `${baseUrl}/webhook`;
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const payload = {
    enabled: true,
    url: webhookUrl,
    events: ["messages", "connection"],
    excludeMessages: ["wasSentByApi"],
    addUrlEvents: false,
    addUrlTypesMessages: false
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    logRequest("POST", url, res.status, duration, { webhookUrl });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`UAZAPI error (${res.status}): ${errText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[UAZAPI_CLIENT_ERROR] configureWebhook failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}
