import chalk from 'chalk';

function digitalRoot(n, base) {
    if (n === 0) return 0;
    return 1 + ((n - 1) % (base - 1));
}

function windowToKey(sequence, start, length) {
    let key = '';
    for (let i = 0; i < length; i++) {
        if (i > 0) key += ',';
        key += sequence[start + i];
    }
    return key;
}

function endsWithPattern(sequence, seqLength, pattern, patternLength) {
    const startPos = seqLength - patternLength;
    for (let i = 0; i < patternLength; i++) {
        if (sequence[startPos + i] !== pattern[i]) return false;
    }
    return true;
}

function run(mode, base, n) {
    const sequence = new Array(n);
    sequence[0] = 1;
    sequence[1] = 1;
    let seqLength = 2;
    
    const repeats = new Set();
    const repeatList = [];
    let termCount = 2;
    let endPattern = [1, 1];
    let skip = false;
    
    // For GEFDRS: track seen windows by termCount
    const windowSets = mode === 'gefdr' ? new Map() : null;
    
    if (mode === 'gefdr') {
        const set2 = new Set();
        set2.add('1,1');
        windowSets.set(2, set2);
    }

    // Running sum of last termCount elements
    let runningSum = 2; // 1 + 1

    while (seqLength < n) {
        const newDigit = digitalRoot(runningSum, base);
        sequence[seqLength] = newDigit;
        seqLength++;
        
        // Update running sum: add new digit, remove oldest if we have more than termCount
        runningSum += newDigit;
        if (seqLength > termCount) {
            runningSum -= sequence[seqLength - termCount - 1];
        }
        
        if (!skip) {
            const windowStart = seqLength - termCount;
            let found = false;
            
            if (mode === 'gefdr') {
                const windowKey = windowToKey(sequence, windowStart, termCount);
                let windowSet = windowSets.get(termCount);
                
                if (!windowSet) {
                    // New termCount after evolution: build set from all historical windows
                    windowSet = new Set();
                    for (let i = 0; i <= windowStart - 1; i++) {
                        windowSet.add(windowToKey(sequence, i, termCount));
                    }
                    windowSets.set(termCount, windowSet);
                }
                
                if (windowSet.has(windowKey)) {
                    found = true;
                } else {
                    windowSet.add(windowKey);
                }
            } else {
                // LEFDRS: check if current window ends with endPattern
                if (seqLength > termCount && endsWithPattern(sequence, seqLength, endPattern, endPattern.length)) {
                    found = true;
                }
            }
            
            if (found) {
                for (let j = 0; j < termCount; j++) {
                    repeats.add(windowStart + j);
                }
                
                const patternStr = windowToKey(sequence, windowStart, termCount);
                repeatList.push({
                    pattern: patternStr,
                    position: windowStart,
                    newTermCount: termCount + 1
                });
                
                // Update endPattern for LEFDRS
                endPattern = [];
                for (let j = 0; j < termCount; j++) {
                    endPattern.push(sequence[windowStart + j]);
                }
                
                termCount++;
                skip = true;
                
                // Recalculate running sum for new termCount
                runningSum = 0;
                for (let j = seqLength - termCount; j < seqLength; j++) {
                    if (j >= 0) runningSum += sequence[j];
                }
            }
        } else {
            skip = false;
        }
    }

    return { sequence: Array.from(sequence).slice(0, seqLength), repeats, repeatList };
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
