import { Router } from 'express';
import { handleRequestCreation, handleGetStatus, handleReply, handleGetHistory } from '../controllers/requestHandler';

const router = Router();

router.post('/request', handleRequestCreation);
router.get('/status/:id', handleGetStatus);
router.post('/request/:id/reply', handleReply);
router.get('/history', handleGetHistory);

export default router;
