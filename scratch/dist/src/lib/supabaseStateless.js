"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseStateless = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    // Try loading from .env file directly for standalone script runners
    try {
        const envPath = path_1.default.resolve(process.cwd(), ".env");
        if (fs_1.default.existsSync(envPath)) {
            const envFile = fs_1.default.readFileSync(envPath, "utf8");
            envFile.split("\n").forEach(line => {
                const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
                if (match) {
                    const key = match[1].trim();
                    let val = match[2].trim();
                    if (val.startsWith('"') && val.endsWith('"')) {
                        val = val.substring(1, val.length - 1);
                    }
                    if (key === "NEXT_PUBLIC_SUPABASE_URL")
                        supabaseUrl = val;
                    if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY")
                        supabaseAnonKey = val;
                    if (key === "UAZAPI_INSTANCE_TOKEN")
                        process.env.UAZAPI_INSTANCE_TOKEN = val;
                }
            });
        }
    }
    catch {
        // Ignore loading errors
    }
}
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
}
exports.supabaseStateless = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
