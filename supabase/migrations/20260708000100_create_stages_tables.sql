-- Migration: Create tables for pipeline stages, keyword triggers and lead stage history
-- Path: supabase/migrations/20260708000100_create_stages_tables.sql

-- 1. Create pipeline_stages table
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    stage_type TEXT NOT NULL DEFAULT 'intermediate', -- 'first_contact' | 'intermediate' | 'conversion' | 'sale' | 'lost' | 'custom'
    conversion_event TEXT,
    represents_sale BOOLEAN NOT NULL DEFAULT false,
    default_sale_value NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BRL',
    represents_first_contact BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable RLS for pilot simplicity
ALTER TABLE pipeline_stages DISABLE ROW LEVEL SECURITY;

-- 2. Create keyword_triggers table
CREATE TABLE IF NOT EXISTS keyword_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id TEXT REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    phrase TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'outbound', -- 'inbound' | 'outbound' | 'both'
    match_type TEXT NOT NULL DEFAULT 'contains', -- 'contains' | 'equals' | 'starts_with'
    ignore_case BOOLEAN NOT NULL DEFAULT true,
    ignore_accents BOOLEAN NOT NULL DEFAULT true,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable RLS for pilot simplicity
ALTER TABLE keyword_triggers DISABLE ROW LEVEL SECURITY;

-- 3. Create lead_stage_history table
CREATE TABLE IF NOT EXISTS lead_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'automation' | 'system'
    rule_name TEXT,
    agent_name TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable RLS for pilot simplicity
ALTER TABLE lead_stage_history DISABLE ROW LEVEL SECURITY;

-- 4. Insert default stages for the pilot organization
INSERT INTO pipeline_stages (id, organization_id, name, position, stage_type, represents_first_contact)
VALUES ('Novo Lead', 'empresa-1', 'Fez Contato', 1, 'first_contact', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipeline_stages (id, organization_id, name, position, stage_type)
VALUES ('Em Atendimento', 'empresa-1', 'Em Atendimento', 2, 'intermediate')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipeline_stages (id, organization_id, name, position, stage_type)
VALUES ('Interessado', 'empresa-1', 'Interessado', 3, 'intermediate')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipeline_stages (id, organization_id, name, position, stage_type, conversion_event)
VALUES ('Agendado', 'empresa-1', 'Agendado', 4, 'conversion', 'Agendamento')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipeline_stages (id, organization_id, name, position, stage_type, conversion_event)
VALUES ('Compareceu', 'empresa-1', 'Compareceu', 5, 'conversion', 'Comparecimento')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipeline_stages (id, organization_id, name, position, stage_type, conversion_event, represents_sale, default_sale_value)
VALUES ('Venda', 'empresa-1', 'Venda', 6, 'sale', 'Venda', true, 650)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipeline_stages (id, organization_id, name, position, stage_type)
VALUES ('Perdido', 'empresa-1', 'Perdido', 7, 'lost')
ON CONFLICT (id) DO NOTHING;
