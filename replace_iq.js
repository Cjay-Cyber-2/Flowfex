const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\Cjay\\Documents\\Flowfex\\frontend\\src';

function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            walk(fullPath);
        } else if (/\.(jsx|js|tsx|ts|html|css)$/.test(item)) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            let modified = false;
            
            const regexes = [
                { match: />Syniq</g, repl: '>Syniq<' },
                { match: />Syniq\b/g, repl: '>Syniq' },
                { match: /\bSyniq</g, repl: 'Syniq<' },
                { match: / Syniq /g, repl: ' Syniq ' },
                { match: /^Syniq /gm, repl: 'Syniq ' },
                { match: / Syniq\./g, repl: ' Syniq.' },
                { match: / Syniq,/g, repl: ' Syniq,' },
                { match: /'Syniq'/g, repl: "'Syniq'" },
                { match: /"Syniq"/g, repl: '"Syniq"' },
                { match: /\(Syniq\)/g, repl: '(Syniq)' },
                { match: /Syniq Session/g, repl: 'Syniq Session' },
                { match: /Syniq session/g, repl: 'Syniq session' },
                { match: /to Syniq/g, repl: 'to Syniq' },
                { match: /with Syniq/g, repl: 'with Syniq' },
                { match: /for Syniq/g, repl: 'for Syniq' },
                { match: /Syniq orchestration/g, repl: 'Syniq orchestration' },
                { match: /Syniq account/g, repl: 'Syniq account' },
                { match: /Syniq logo/g, repl: 'Syniq logo' },
                { match: /Syniq is/g, repl: 'Syniq is' },
                { match: /Syniq provides/g, repl: 'Syniq provides' },
                { match: /Syniq Visual/gi, repl: 'Syniq Visual' }
            ];

            regexes.forEach(({match, repl}) => {
                if (match.test(content)) {
                    content = content.replace(match, repl);
                    modified = true;
                }
            });

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated', fullPath);
            }
        }
    }
}

walk(rootDir);
console.log('Replacement finished.');
