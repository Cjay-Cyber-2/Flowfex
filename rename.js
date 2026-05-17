const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\Cjay\\Documents\\Syniq';

const ignoreDirs = ['node_modules', '.git', '.vscode', 'dist', 'build', '.kiro'];
const ignoreExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.mp4', '.webm', '.pdf', '.zip'];

function getReplacement(match) {
    if (match === match.toUpperCase()) {
        return 'SYNIQ';
    } else if (match[0] === match[0].toUpperCase()) {
        return 'Syniq';
    } else {
        return 'syniq';
    }
}

const regex = /flowf?e?e?x/ig;

let filesModified = 0;
let filesRenamed = 0;
let dirsRenamed = 0;

function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!ignoreDirs.includes(item)) {
                walk(fullPath);
                
                // Rename directory if it matches
                if (regex.test(item)) {
                    const newName = item.replace(regex, getReplacement);
                    const newPath = path.join(dir, newName);
                    fs.renameSync(fullPath, newPath);
                    console.log(`Renamed directory: ${item} -> ${newName}`);
                    dirsRenamed++;
                }
            }
        } else {
            // Rename file if it matches
            let currentPath = fullPath;
            let currentItem = item;
            if (regex.test(item)) {
                const newName = item.replace(regex, getReplacement);
                const newPath = path.join(dir, newName);
                fs.renameSync(currentPath, newPath);
                console.log(`Renamed file: ${item} -> ${newName}`);
                currentPath = newPath;
                currentItem = newName;
                filesRenamed++;
            }

            const ext = path.extname(currentItem).toLowerCase();
            if (!ignoreExtensions.includes(ext)) {
                try {
                    const content = fs.readFileSync(currentPath, 'utf8');
                    if (regex.test(content)) {
                        const newContent = content.replace(regex, getReplacement);
                        fs.writeFileSync(currentPath, newContent, 'utf8');
                        console.log(`Modified content in: ${currentPath}`);
                        filesModified++;
                    }
                } catch (e) {
                    console.error(`Failed to process ${currentPath}:`, e.message);
                }
            }
        }
    }
}

console.log('Starting search and replace...');
walk(rootDir);
console.log('Done!');
console.log(`Modified content in ${filesModified} files.`);
console.log(`Renamed ${filesRenamed} files.`);
console.log(`Renamed ${dirsRenamed} directories.`);
