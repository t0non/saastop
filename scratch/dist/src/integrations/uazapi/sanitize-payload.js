"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUazapiPayload = sanitizeUazapiPayload;
function sanitizeUazapiPayload(payload) {
    const sanitized = { ...payload };
    if (sanitized.token !== undefined) {
        sanitized.token = "[REDACTED]";
    }
    return sanitized;
}
