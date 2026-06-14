const { getPublicStats } = require('./lib/db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
    }
    try {
        const stats = await getPublicStats();
        res.statusCode = 200;
        res.end(JSON.stringify(stats));
    } catch (err) {
        res.statusCode = 200;
        res.end(JSON.stringify({
            totalRescues: 2400,
            totalNGOs: 245,
            totalDoctors: 1200,
            totalRiders: 5600,
            fallback: true,
            error: err.message
        }));
    }
};
