import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_STATE_DIRECTORY = path.resolve(process.cwd(), '.flowfex', 'state', 'sessions');

export class FileSessionStateRepository {
  constructor(config = {}) {
    this.directory = config.directory || DEFAULT_STATE_DIRECTORY;
  }

  async read(sessionId) {
    try {
      const raw = await fs.readFile(this._sessionPath(sessionId), 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async write(snapshot) {
    await fs.mkdir(this.directory, { recursive: true });

    const targetPath = this._sessionPath(snapshot.sessionId);
    const temporaryPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    const payload = JSON.stringify(snapshot, null, 2);

    await fs.writeFile(temporaryPath, payload, 'utf8');
    await fs.rename(temporaryPath, targetPath);
  }

  async delete(sessionId) {
    try {
      await fs.unlink(this._sessionPath(sessionId));
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  _sessionPath(sessionId) {
    return path.join(this.directory, `${sessionId}.json`);
  }
}

export const defaultSessionStateRepository = new FileSessionStateRepository();
