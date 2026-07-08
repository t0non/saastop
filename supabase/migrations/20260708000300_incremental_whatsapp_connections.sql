-- Migration: Incremental addition of missing columns to whatsapp_connections
-- Path: supabase/migrations/20260708000300_incremental_whatsapp_connections.sql

ALTER TABLE whatsapp_connections
  ADD COLUMN IF NOT EXISTS connection_name TEXT,
  ADD COLUMN IF NOT EXISTS base_url TEXT,
  ADD COLUMN IF NOT EXISTS instance_external_id TEXT,
  ADD COLUMN IF NOT EXISTS instance_token TEXT,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMP WITH TIME ZONE;

-- Ensure RLS is disabled for pilot simplicity (if not already)
ALTER TABLE whatsapp_connections DISABLE ROW LEVEL SECURITY;
