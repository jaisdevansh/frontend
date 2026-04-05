const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const coreControllers = ['event.controller.js', 'booking.controller.js', 'venue.controller.js', 'dashboard.controller.js', 'ticket.controller.js'];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    for (const ctrl of coreControllers) {
        const regex = new RegExp(`['"]\\.\\.\\/controllers\\/${ctrl}['"]`, 'g');
        if (regex.test(content)) {
            // Find depth
            const relativeToRoot = path.relative(rootDir, filePath);
            const parts = path.dirname(relativeToRoot).split(path.sep).filter(p => p !== '.');
            const depth = parts.length;
            
            let rootPrefix = '';
            for (let i = 0; i < depth; i++) rootPrefix += '../';
            
            const newImport = `"${rootPrefix}controllers/${ctrl}"`;
            content = content.replace(regex, newImport);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Patched core controllers in: ${filePath}`);
    }
}

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath);
        } else if (entry.name.endsWith('.js') && !entry.name.includes('fix_')) {
            processFile(fullPath);
        }
    }
}

walkDir(rootDir);
console.log('Fixed controller imports!');
