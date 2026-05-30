const express = require('express');
const app = express();
const port = 5000;

app.get('/', (req, res) => {
    res.send('PawBandhan Server is Running! ??');
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is healthy!' });
});

app.listen(port, () => {
    console.log('');
    console.log('========================================');
    console.log('?? Test Server Running');
    console.log(`?? http://localhost:${port}`);
    console.log('========================================');
    console.log('');
});
