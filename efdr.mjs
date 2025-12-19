import chalk from 'chalk';

function digitalRoot(n, base) {
    while (n >= base) {
        let sum = 0;
        while (n > 0) {
            sum += n % base;
            n = Math.floor(n / base);
        }
        n = sum;
    }
    return n;
}

function run(mode, base, n) {
    const sequence = [1, 1];
    const repeats = new Set();
    const repeatList = [];
    let termCount = 2;
    let endPattern = [1, 1];
    let skip = false;

    while (sequence.length < n) {
        const sum = sequence.slice(-termCount).reduce((a, b) => a + b, 0);
        sequence.push(digitalRoot(sum, base));
        
        if (!skip) {
            const window = sequence.slice(-termCount);
            let found = false;
            
            if (mode === 'gefdr') {
                const windowStr = window.join(',');
                const history = sequence.slice(0, -termCount);
                for (let i = 0; i <= history.length - termCount; i++) {
                    if (history.slice(i, i + termCount).join(',') === windowStr) {
                        found = true;
                        break;
                    }
                }
            } else {
                const ending = window.slice(-endPattern.length);
                if (ending.join(',') === endPattern.join(',') && sequence.length > termCount) {
                    found = true;
                }
            }
            
            if (found) {
                for (let j = 0; j < termCount; j++) {
                    repeats.add(sequence.length - termCount + j);
                }
                repeatList.push({
                    pattern: window.join(','),
                    position: sequence.length - termCount,
                    newTermCount: termCount + 1
                });
                endPattern = window.slice();
                termCount++;
                skip = true;
            }
        } else {
            skip = false;
        }
    }

    return { sequence, repeats, repeatList };
}

function parseSuperquiet(format, base, digits, lefdrResult, gefdrResult) {
    let output = '';
    let i = 0;
    
    while (i < format.length) {
        if (format.slice(i, i + 2) === '@@') {
            let code = '';
            let j = i + 2;
            while (j < format.length && /[a-zA-Z0-9\[\]]/.test(format[j])) {
                code += format[j];
                j++;
            }
            
            let n = 1;
            const bracketMatch = code.match(/\[(\d+)\]/);
            if (bracketMatch) {
                n = parseInt(bracketMatch[1]);
                code = code.replace(/\[\d+\]/, '');
            }
            
            let val = '';
            if (code === 'b') {
                val = base;
            } else if (code === 'd') {
                val = digits;
            } else if (code === 'dsfl') {
                const idx = lefdrResult.sequence.length - n;
                val = lefdrResult.sequence[idx] ?? '';
            } else if (code === 'Dsfl') {
                const idx = gefdrResult.sequence.length - n;
                val = gefdrResult.sequence[idx] ?? '';
            } else if (code === 'pdsfl') {
                val = lefdrResult.sequence.length - n;
            } else if (code === 'pDsfl') {
                val = gefdrResult.sequence.length - n;
            } else if (code === 'rpos') {
                const r = lefdrResult.repeatList[lefdrResult.repeatList.length - n];
                val = r ? r.position : '';
            } else if (code === 'Rpos') {
                const r = gefdrResult.repeatList[gefdrResult.repeatList.length - n];
                val = r ? r.position : '';
            } else if (code === 'rpat') {
                const r = lefdrResult.repeatList[lefdrResult.repeatList.length - n];
                val = r ? r.pattern : '';
            } else if (code === 'Rpat') {
                const r = gefdrResult.repeatList[gefdrResult.repeatList.length - n];
                val = r ? r.pattern : '';
            } else if (code === 'rntc') {
                const r = lefdrResult.repeatList[lefdrResult.repeatList.length - n];
                val = r ? r.newTermCount : '';
            } else if (code === 'Rntc') {
                const r = gefdrResult.repeatList[gefdrResult.repeatList.length - n];
                val = r ? r.newTermCount : '';
            }
            
            output += val;
            i = j;
        } else {
            output += format[i];
            i++;
        }
    }
    
    return output;
}

const args = process.argv.slice(2);
const mode = args.find(a => a === 'gefdr' || a === 'lefdr' || a === 'both') || 'lefdr';
const base = parseInt(args.find(a => a.startsWith('base='))?.split('=')[1]) || 10;
const showDigits = !args.includes('quiet') && !args.includes('superquiet');
const sfl = parseInt(args.find(a => a.startsWith('sfl='))?.split('=')[1]) || 0;
const superquietArg = args.find(a => a.startsWith('superquiet='));
const superquiet = superquietArg ? superquietArg.slice(11) : null;

const digitArg = args.find(a => /^[+\-]?\d+$/.test(a) && a !== mode);
let n;
if (digitArg) {
    if (digitArg.startsWith('+')) {
        n = base + parseInt(digitArg.slice(1));
    } else if (digitArg.startsWith('-')) {
        n = base - parseInt(digitArg.slice(1));
    } else {
        n = parseInt(digitArg);
    }
} else {
    n = 150;
}

if (n <= 0) {
    console.error(`Error: digit count must be > 0 (got ${n})`);
    process.exit(1);
}

let lefdrResult = { sequence: [], repeats: new Set(), repeatList: [] };
let gefdrResult = { sequence: [], repeats: new Set(), repeatList: [] };

if (mode === 'both' || mode === 'lefdr') {
    lefdrResult = run('lefdr', base, n);
}
if (mode === 'both' || mode === 'gefdr') {
    gefdrResult = run('gefdr', base, n);
}

if (superquiet) {
    console.log(parseSuperquiet(superquiet, base, n, lefdrResult, gefdrResult));
} else {
    const display = (label, result) => {
        console.log(`\n${label} | Base ${base} | ${n} digits\n`);
        if (showDigits) {
            const output = result.sequence.map((d, i) => result.repeats.has(i) ? chalk.cyan(d) : String(d));
            console.log(output.join(','));
        }
        if (sfl > 0) {
            const idx = result.sequence.length - sfl;
            console.log(`Digit at position ${idx} (sfl=${sfl}): ${result.sequence[idx]}`);
        }
        console.log('\nRepeats:');
        result.repeatList.forEach(r => {
            console.log(`  ${r.pattern} at position ${r.position}, now using ${r.newTermCount} terms`);
        });
    };

    if (mode === 'both') {
        display('LEFDR', lefdrResult);
        display('GEFDR', gefdrResult);
    } else if (mode === 'lefdr') {
        display('LEFDR', lefdrResult);
    } else {
        display('GEFDR', gefdrResult);
    }
}