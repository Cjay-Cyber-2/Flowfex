import { ControlService } from './ControlService.js';
import { toControlError } from './errors.js';

export class ControlController {
  constructor(config = {}) {
    this.service = config.service || new ControlService(config);
  }

  setSocketServer(socketServer) {
    this.service.setSocketServer(socketServer);
  }

  async getSessionState(params) {
    try {
      return await this.service.getSessionState(params.sessionId);
    } catch (error) {
      const controlError = toControlError(error);
      controlError.details = {
        ...(controlError.details || {}),
        sessionId: params.sessionId || null,
        actionType: 'state',
      };
      throw controlError;
    }
  }

  async pauseSession(params, body) {
    try {
      return await this.service.pauseSession(params.sessionId, body);
    } catch (error) {
      const controlError = toControlError(error);
      controlError.details = {
        ...(controlError.details || {}),
        sessionId: params.sessionId || null,
        actionType: 'pause',
      };
      throw controlError;
    }
  }

  async resumeSession(params, body) {
    try {
      return await this.service.resumeSession(params.sessionId, body);
    } catch (error) {
      const controlError = toControlError(error);
      controlError.details = {
        ...(controlError.details || {}),
        sessionId: params.sessionId || null,
        actionType: 'resume',
      };
      throw controlError;
    }
  }

  async approveNode(params, body) {
    try {
      return await this.service.approveNode(params.nodeId, body);
    } catch (error) {
      const controlError = toControlError(error);
      controlError.details = {
        ...(controlError.details || {}),
        sessionId: body?.sessionId || null,
        nodeId: params.nodeId || null,
        actionType: 'approve',
      };
      throw controlError;
    }
  }

  async rejectNode(params, body) {
    try {
      return await this.service.rejectNode(params.nodeId, body);
    } catch (error) {
      const controlError = toControlError(error);
      controlError.details = {
        ...(controlError.details || {}),
        sessionId: body?.sessionId || null,
        nodeId: params.nodeId || null,
        actionType: 'reject',
      };
      throw controlError;
    }
  }

  async rerouteNode(params, body) {
    try {
      return await this.service.rerouteNode(params.nodeId, body);
    } catch (error) {
      const controlError = toControlError(error);
      controlError.details = {
        ...(controlError.details || {}),
        sessionId: body?.sessionId || null,
        nodeId: params.nodeId || null,
        actionType: 'reroute',
      };
      throw controlError;
    }
  }

  async constrainSession(params, body) {
    try {
      return await this.service.constrainSession(params.sessionId, body);
    } catch (error) {
      const controlError = toControlError(error);
      controlError.details = {
        ...(controlError.details || {}),
        sessionId: params.sessionId || null,
        actionType: 'constrain',
      };
      throw controlError;
    }
  }
}
