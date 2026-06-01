import { Router } from 'express';
import { roomController } from '../controller/room.controller';
import { requireAuth } from '../../../shared/middleware/auth.middleware';

const router = Router();

router.post('/', requireAuth, roomController.create);
router.get('/', roomController.list);
router.get('/:code', roomController.getRoom);

export default router;
