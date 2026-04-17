import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Main API interface
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
