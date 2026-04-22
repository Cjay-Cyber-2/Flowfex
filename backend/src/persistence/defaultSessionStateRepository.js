import { FileSessionStateRepository } from './FileSessionStateRepository.js';
import { SupabaseSessionStateRepository } from './SupabaseSessionStateRepository.js';
import { isSupabaseConfigured } from '../session/supabaseAdmin.js';

export const defaultSessionStateRepository = isSupabaseConfigured()
  ? new SupabaseSessionStateRepository()
  : new FileSessionStateRepository();
