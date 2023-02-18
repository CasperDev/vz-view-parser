/**
 * Select the 'vz' extension with VZF0 header.
 */
registerFileType((fileExt, filePath, fileData) => {
	// Check for vz extension
    if (fileExt.toLowerCase() === 'vz') {
	 	const headerArray = fileData.getBytesAt(0, 4);
	 	const header = String.fromCharCode(...headerArray)
	 	if (header === 'VZF0' || header == 'VZFO')
			return true;
	}
	return false;
});

/**
 * Parser for VZ files.
 * It is not a complete wav parsing implementation.
 */
registerParser(() => {
    
    addStandardHeader();
    // file desc ID
    read(4);
    var fileId = getStringValue();
    if (fileId == 'VZF0')
	    addRow('VZF0 id', fileId, 'Standard VZF0 file description header');
    else 
	    addRow('VZF0 id', fileId, '<span style="color: red;">WARN</span>: Nonstandard VZ file description header');

    
    // Program name 17
    read(17)
	addRow('Program Name', '"'+getStringValue()+'"', 'Internal Program name');

    // File type byte
    read(1);
    const ftype = getNumberValue();

    if (ftype == 0xf0) {
        addRow('Content Type','BASIC [F0]', 'BASIC Program inside (could be laucher for binary code)');
        // load/start address
        read(2);
        let basicLineAbsAddr = getHex0xValue();
        addRow('Load Addr',basicLineAbsAddr, 'Addres to load BASIC bytes. Start of BASIC Lines');
        while(!endOfFile()) {
            readRowWithDetails(basicLineAbsAddr, () => {
                retVal = { value: '0', description: 'End of BASIC Program' };
                read(2);
                let nextAbsAddr = getHex0xValue();
                addRow('Next Addr', nextAbsAddr, 'Address of next BASIC line data')
                if (nextAbsAddr != '0x0000') {
                    read(2);
                    retVal.value = getNumberValue();
                    addRow('Line No', retVal.value, 'BASIC Line number');
                    readUntil(0);
                    let basicLineData = getData();
                    retVal.description = convertToBasic(basicLineData);
                    addRow('Line Data', 'BASIC', basicLineData);
                    read(1);
                    addRow('Terminator', getNumberValue());
                }
                basicLineAbsAddr = nextAbsAddr;
                return retVal;
            });        
        }
    } else if (ftype == 0xf1) {
        
        /*******************************************************************
         * Binary code to execute
         *******************************************************************/
        addRow('Contetnt Type','Binary [F1]', 'Binary code to execute');
        // load/start address
        read(2);
        addRow('Load Addr',getHex0xValue(), 'Addres to load following code. Start of execution');
        
        read(); //read to the end
        addRow('Code Dump');
        addDetails(() => {
            read();
            addMemDump();
        });
    } else {
        addRow('Contetnt Type','Unknown [' + ftype.toString(16) + ']', 'Unknown. Could be internal format for specific program');

    }

});
// codes 01..1f (when inside quoted string) -> "{x}" ctrl chars
// codes 20..5f (when inside quoted string) -> chr(x) ascii
// codes 60..7f (when inside quoted string) -> chr(x-0x40) ascii
// codes 80..bf (when inside quoted string) -> "[x-128]" semichars (1 color) 
// codes c0..df (when inside quoted string) -> chr(x-128) inverted ascii @,A,B...
// codes e0..ff (when inside quoted string) -> chr(x-192) inverted ascii SP,!,"...

// codes 01..1f (when NOT inside quoted string) -> "{x}" ctrl chars
// codes 20..5f (when NOT inside quoted string) -> chr(x) ascii
// codes 60..7f (when NOT inside quoted string) -> chr(x-0x40) ascii
// codes 80..fb (when NOT inside quoted string) -> basicCodes[x-128] basic commands 
// codes fc..ff (when NOT inside quoted string) -> "{x}" invalid BASIC tocens

// codes from 0x80..0xFB (when not inside quoted string)
function getCmdText(token) {
    const basicCodes = [
        'END', 'FOR', 'RESET', 'SET', 'CLS', 'CMD', 'RANDOM', 'NEXT',
        'DATA', 'INPUT', 'DIM', 'READ', 'LET', 'GOTO', 'RUN', 'IF',
        'RESTORE', 'GOSUB', 'RETURN', 'REM', 'STOP', 'ELSE', 'COPY', 'COLOR',
        'VERIFY', 'DEFINT', 'DEFSNG', 'DEFDBL', 'CRUN', 'MODE', 'SOUND', 'RESUME',
        'OUT', 'ON', 'OPEN', 'FIELD', 'GET', 'PUT', 'CLOSE', 'LOAD',
        'MERGE', 'NAME', 'KILL', 'LSET', 'RSET', 'SAVE', 'SYSTEM', 'LPRINT',
        'DEF', 'POKE', 'PRINT', 'CONT', 'LIST', 'LLIST', 'DELETE', 'AUTO',
        'CLEAR', 'CLOAD', 'CSAVE', 'NEW', 'TAB(', 'TO', 'FN', 'USING',
        'VARPTR', 'USR', 'ERL', 'ERR', 'STRING$', 'INSTR', 'POINT', 'TIME$',
        'MEM', 'INKEY$', 'THEN', 'NOT', 'STEP', '+', '-', '*',
        '/', '^', 'AND', 'OR', '>', '=', '<', 'SGN',
        'INT', 'ABS', 'FRE', 'INP', 'POS', 'SQR', 'RND', 'LOG',
        'EXP', 'COS', 'SIN', 'TAN', 'ATN', 'PEEK', 'CVI', 'CVS',
        'CVD', 'EOF', 'LOC', 'LOF', 'MKI$', 'MKS$', 'MKD$', 'CINT',
        'CSNG', 'CDBL', 'FIX', 'LEN', 'STR$', 'VAL', 'ASC', 'CHR$',
        'LEFT$', 'RIGHT$', 'MID$', "'"
    ];
    return basicCodes[token-128];
}
function getSemigraphicChar(token) {
    return '&#xe0'+token.toString(16)+';';
}
function convertToBasic(data) {
    let result = '';
    var inString = false;
    data.forEach(b => {
        if (b < 0x20) { // control chars - invalid
            result += '{'+b+'}';
        } else if (b < 0x5f) { // ascii + quote switch
            if (b == 0x22) { inString = inString == true ? false : true; };
            if (b == 0x5f)
                result += 0xe01f;
            else
                result += String.fromCharCode(b);
        } else if (b < 0x80) { // ascii converted to capitalics (switch??)
            result += String.fromCharCode(b-0x40);
        } else if (inString == true) {
            if (b < 0xc0) // semichars
                result += getSemigraphicChar(b);
            else if (b < 224) // inverted ascii @,A,B,C, ...
                result += String.fromCharCode(0xe000+b-128);
            else              // inverted ascii SP,!,",# ...
                result += String.fromCharCode(0xe000+b-128);
        } else { // not in quoted string
            if (b < 0xfc) { // valid basic commands
                result += getCmdText(b);
            } else { // invalid commands
                result += '{'+b+'}';
            }
        }
    });
    return '<span style="font-family: Hot Coco; white-space: pre">' + result + '</span>';
};