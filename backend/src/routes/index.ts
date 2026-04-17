import { Router } from 'express';
import { handleRequestCreation, handleGetStatus } from '../controllers/requestHandler';

const router = Router();

router.post('/request', handleRequestCreation);
router.get('/status/:id', handleGetStatus);

export default router;
