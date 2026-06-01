import type { Response, NextFunction } from 'express';
import { roomService, type RoomService } from '../services/room.service';
import { createRoomSchema } from '../router/room.schema';
import { success, failure } from '../../../shared/utils/response';
import type { AuthRequest } from '../../../shared/types';

export class RoomController {
  constructor(private readonly service: RoomService) {}

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = createRoomSchema.parse(req.body);
      const { userId, username } = req.user!;
      success(res, await this.service.createRoom(input, userId, username, null), 201);
    } catch (err) {
      next(err);
    }
  };

  list = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.listPublicRooms());
    } catch (err) {
      next(err);
    }
  };

  getRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const raw = req.params['code'];
      const code = (Array.isArray(raw) ? raw[0] : raw ?? '').toUpperCase();
      const state = await this.service.getRoomState(code);
      if (!state) { failure(res, 'Room not found', 404); return; }
      success(res, state);
    } catch (err) {
      next(err);
    }
  };
}

export const roomController = new RoomController(roomService);
