import { Router } from 'express';
import { roomController } from '../controller/room.controller';
import { optionalAuth } from '../../../shared/middleware/auth.middleware';

const router = Router();

router.post('/', optionalAuth, roomController.create);
router.get('/', roomController.list);
router.get('/:code', roomController.getRoom);

export default router;
