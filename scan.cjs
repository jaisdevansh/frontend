const fs = require('fs'), path = require('path'), all = new Set();
function scan(d) {
    for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) scan(p);
        else if (f.endsWith('.js')) {
            for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
                const m = l.match(/from\s+'(\.\.\/[^']+)'/);
                if (m) all.add(m[1]);
            }
        }
    }
}
scan('services');
[...all].sort().forEach(x => console.log(x));
