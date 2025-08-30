const pool = require('./database');  // Import the MySQL connection pool

// Test the connection by querying the database
pool.query('SELECT 1 + 1 AS solution')
    .then(([rows, fields]) => {
        console.log('The solution is: ', rows[0].solution);  // This should print 'The solution is: 2'
    })
    .catch((err) => {
        console.error('Error connecting to the database:', err);
    });
