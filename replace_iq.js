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
                { match: />Syniq</g, repl: '>Syn-IQ<' },
                { match: />Syniq\b/g, repl: '>Syn-IQ' },
                { match: /\bSyniq</g, repl: 'Syn-IQ<' },
                { match: / Syniq /g, repl: ' Syn-IQ ' },
                { match: /^Syniq /gm, repl: 'Syn-IQ ' },
                { match: / Syniq\./g, repl: ' Syn-IQ.' },
                { match: / Syniq,/g, repl: ' Syn-IQ,' },
                { match: /'Syniq'/g, repl: "'Syn-IQ'" },
                { match: /"Syniq"/g, repl: '"Syn-IQ"' },
                { match: /\(Syniq\)/g, repl: '(Syn-IQ)' },
                { match: /Syniq Session/g, repl: 'Syn-IQ Session' },
                { match: /Syniq session/g, repl: 'Syn-IQ session' },
                { match: /to Syniq/g, repl: 'to Syn-IQ' },
                { match: /with Syniq/g, repl: 'with Syn-IQ' },
                { match: /for Syniq/g, repl: 'for Syn-IQ' },
                { match: /Syniq orchestration/g, repl: 'Syn-IQ orchestration' },
                { match: /Syniq account/g, repl: 'Syn-IQ account' },
                { match: /Syniq logo/g, repl: 'Syn-IQ logo' },
                { match: /Syniq is/g, repl: 'Syn-IQ is' },
                { match: /Syniq provides/g, repl: 'Syn-IQ provides' },
                { match: /Syniq Visual/gi, repl: 'Syn-IQ Visual' }
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
