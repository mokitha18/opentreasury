const mysql = require('mysql2');

// Create a connection pool (for better performance with multiple queries)
const pool = mysql.createPool({
    host: 'localhost',         // MySQL server location (can be localhost for local dev)
    user: 'root',              // Your MySQL username (usually 'root')
    password: 'Moki@7890',              // Your MySQL password
    database: 'treasurer_dashboard'  // The name of your database
});

// Export the pool so it can be used in other parts of your application
module.exports = pool.promise();
