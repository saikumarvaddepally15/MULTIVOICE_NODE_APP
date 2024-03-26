const { exec } = require('child_process');

function killPort(port) {
    exec(`lsof -ti:${port} | xargs kill`, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error killing port ${port}: ${err.message}`);
            return;
        }
        console.log(`Port ${port} has been successfully killed`);
    });
}

// Usage
const portToKill = 3005; // Change this to the port you want to kill
killPort(portToKill);
