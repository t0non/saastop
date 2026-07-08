-- Migration: Update whatsapp_connections table with UAZAPI connection details
-- Path: supabase/migrations/20260708000200_update_connections_table.sql

ALTER TABLE whatsapp_connections 
ADD COLUMN IF NOT EXISTS connection_name TEXT,
ADD COLUMN IF NOT EXISTS base_url TEXT,
ADD COLUMN IF NOT EXISTS instance_external_id TEXT,
ADD COLUMN IF NOT EXISTS instance_token TEXT,
ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMP WITH TIME ZONE;

-- Ensure RLS is disabled for pilot simplicity
ALTER TABLE whatsapp_connections DISABLE ROW LEVEL SECURITY;
