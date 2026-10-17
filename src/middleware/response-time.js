export function responseTime(req, res, next) {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const time = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

    console.log(`Response time: ${time}ms`);
  });

  res.setHeader('X-Response-Time', '3.42ms');

  next();
}