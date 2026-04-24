import { FileSessionStateRepository } from './FileSessionStateRepository.js';
import { DatabaseSessionStateRepository } from './DatabaseSessionStateRepository.js';
import { isSessionDataConfigured } from '../session/sessionDataAccess.js';

export const defaultSessionStateRepository = isSessionDataConfigured()
  ? new DatabaseSessionStateRepository()
  : new FileSessionStateRepository();
