const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const caseRouter = require('./routes/caseRoutes.js');
const userRouter = require('./routes/userRoutes.js');
const authRouter = require('./routes/authRoutes.js');
const installmentRouter = require('./routes/installmentRoutes.js');

dotenv.config();

const app = express();

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use((req, res, next) => {
  req.cookies = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      req.cookies[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  next();
});

app.get('/', (req, res) => {
  res.status(200).send('API is running');
});

app.use('/cases', caseRouter);
app.use('/users', userRouter);
app.use('/auth', authRouter);
app.use('/installments', installmentRouter);

module.exports = { app };
