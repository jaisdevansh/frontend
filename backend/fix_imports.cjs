const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// Map shared segments to their actual paths relative to rootDir
const actualPaths = {
    'models': 'shared/models',
    'middleware': 'shared/middlewares',
    'middlewares': 'shared/middlewares',
    'config': 'shared/config',
    'utils': 'shared/utils',
    'validators': 'validators',
    'services': 'services',
    'socket.js': 'socket.js',
    'logs': 'logs'
};

function processFile(filePath) {
    const relativeToRoot = path.relative(rootDir, filePath);
    // Depth counts how many `../` we need to reach rootDir.
    // e.g. path 'services/user-service/controllers/auth.js' -> dirname is 'services/user-service/controllers' (3 parts)
    const parts = path.dirname(relativeToRoot).split(path.sep).filter(p => p !== '.');
    const depth = parts.length;
    
    // Create the prefix to reach rootDir
    let rootPrefix = '';
    for (let i = 0; i < depth; i++) rootPrefix += '../';
    if(rootPrefix === '') rootPrefix = './';

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // We will find all imports: import ... from '...'; OR async import('...') OR require('...')
    // Pattern: /from\s+['"](\.\.\/[^'"]+)['"]/g
    const regex = /(from\s+['"])(\.\.\/[^'"]+)(['"])/g;

    const newContent = content.replace(regex, (match, prefix, importPath, suffix) => {
        // e.g. importPath is "../models/user.model.js"
        // In the original broken structure, the author used "../" assuming "controllers" was at root (depth=1).
        // If file depth is 3, "../models" originally implied going up 1 level from controllers, meaning it was expecting "models" as sibling to "controllers".
        // Let's extract the target folder they were trying to reach.
        // It's always the first segment after '../'
        
        let segments = importPath.split('/').filter(Boolean);
        if (segments[0] === '..') {
            const targetSegment = segments[1];
            if (actualPaths[targetSegment] || targetSegment === 'socket.js') {
                const mappedPath = actualPaths[targetSegment] || targetSegment;
                const restOfPath = segments.slice(2).join('/');
                const finalActualPath = restOfPath ? `${mappedPath}/${restOfPath}` : mappedPath;
                const newImportPath = rootPrefix + finalActualPath;
                changed = true;
                return `${prefix}${newImportPath}${suffix}`;
            }
        }
        return match;
    });

    if (changed) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated imports in: ${filePath}`);
    }
}

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath);
        } else if (entry.name.endsWith('.js') && entry.name !== 'fix_imports.js') {
            processFile(fullPath);
        }
    }
}

walkDir(rootDir);
console.log('Done scanning and patching files.');
