function write(level, entry) {
    const payload = {
        level,
        timestamp: new Date().toISOString(),
        ...entry,
    };
    const line = JSON.stringify(payload);
    if (level === 'error') {
        console.error(line);
        return;
    }
    if (level === 'warn') {
        console.warn(line);
        return;
    }
    console.log(line);
}
export function createEngineLogger() {
    return {
        info(entry) {
            write('info', entry);
        },
        warn(entry) {
            write('warn', entry);
        },
        error(entry) {
            write('error', entry);
        },
    };
}
