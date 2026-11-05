import { createDemoBackend } from './demoBackend';
import { createSupabaseBackend } from './supabaseBackend';
import { isSupabaseConfigured } from './supabase';
import type { Backend } from './backend';

/**
 * Chooses the data source once for the whole app:
 *  - a connected Supabase project (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY), or
 *  - the explicitly labelled local demo backend when no project is connected.
 */
export const isDemoMode = !isSupabaseConfigured;

export const backend: Backend = isDemoMode ? createDemoBackend() : createSupabaseBackend();
