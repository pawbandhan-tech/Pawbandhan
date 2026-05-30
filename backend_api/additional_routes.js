// Add these routes to your server.js

// Get single incident by ID
app.get('/api/incidents/:incidentId', async (req, res) => {
    try {
        const { incidentId } = req.params;
        const query = 'SELECT * FROM incidents WHERE incident_id = $1';
        const result = await pool.query(query, [incidentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user profile
app.get('/api/users/:uid/profile', async (req, res) => {
    try {
        const { uid } = req.params;
        const query = 'SELECT * FROM users WHERE uid = $1';
        const result = await pool.query(query, [uid]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
app.put('/api/users/:uid/profile', async (req, res) => {
    try {
        const { uid } = req.params;
        const { firstName, lastName, phoneNo, address } = req.body;
        
        const query = `
            UPDATE users 
            SET first_name = $1, last_name = $2, phone_no = $3, address = $4
            WHERE uid = $5
            RETURNING *
        `;
        
        const values = [firstName, lastName, phoneNo, address, uid];
        const result = await pool.query(query, values);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});
