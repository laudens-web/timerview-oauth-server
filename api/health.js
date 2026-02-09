module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    message: 'TimerView OAuth server is running',
    timestamp: new Date().toISOString()
  });
};
