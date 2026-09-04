// Entry point cho Vercel Function. File này KHÔNG qua nest build —
// nó nạp bản đã biên dịch trong dist/ (xem buildCommand trong vercel.json).
const { bootstrapServerless } = require('../dist/serverless');

module.exports = async function handler(req, res) {
  const app = await bootstrapServerless();
  return app(req, res);
};
