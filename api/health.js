module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'TimerView OAuth server is running',
    timestamp: new Date().toISOString()
  });
};
