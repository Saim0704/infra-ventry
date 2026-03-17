const fs = require('fs');
const content = fs.readFileSync('agents/infrawatch-agent.cjs');
const shebang = '#!/usr/bin/env node\n';
fs.writeFileSync('agents/infrawatch-agent', shebang + content);
fs.chmodSync('agents/infrawatch-agent', 0o755);
fs.unlinkSync('agents/infrawatch-agent.cjs');
console.log('Successfully created agents/infrawatch-agent');
