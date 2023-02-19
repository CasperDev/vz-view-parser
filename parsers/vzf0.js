/**
 * Select the 'vz' extension with VZF0 header.
 */
registerFileType((fileExt, filePath, fileData) => {
	// Check for vz extension
    if (fileExt.toLowerCase() === 'vz') {
	 	const headerArray = fileData.getBytesAt(0, 4);
	 	const header = String.fromCharCode(...headerArray)
	 	if (header === 'VZF0' || header == 'VZFO'
			|| (headerArray[0] == 0x20 && headerArray[1] == 0x20 && headerArray[2] == 0 && headerArray[3] == 0))
			return true;
	}
	return false;
});


/**
 * Header structure parser
 * +0 	FileId (VZF0)
 * +4	Program name (16 bytes + 0x00 byte terminator) 
 * +21	content type (0xf0, 0xf1)
 * +22 	16bit addres to load rest of file (also start address for binary file)
 * +24	content bytes
 */

/**
 * Parser for VZ files.
 * It is not a complete wav parsing implementation.
 */
registerParser(() => {
    
    addStandardHeader();
    // file desc ID
    read(4);
    var fileId = getStringValue();
	var fileIdBytes = getData();
    if (fileId == 'VZF0')
	    addRow('VZF0 id', fileId, 'Standard VZF0 file description header');
    else if (fileId == 'VZFO') 
	    addRow('VZF0 id', fileId, '<span style="color: red;">WARN</span>: Nonstandard VZ file description header');
	else if (fileIdBytes[0] == 0x20 && fileIdBytes[1] == 0x20 && fileIdBytes[2] == 0x00 && fileIdBytes[3] == 0x00) 
	    addRow('VZF0 id', getHexSequence(fileIdBytes), '<span style="color: red;">WARN</span>: Nonstandard VZ file description header (zk88dk)');
		else if (fileIdBytes[0] == 0x20 && fileIdBytes[1] == 0x20 && fileIdBytes[2] == 0x00 && fileIdBytes[3] == 0x00) 
    addRow('VZF0 id', getHexSequence(fileIdBytes), '<span style="color: red;">WARN</span>: Nonstandard VZ file description header');
    // Program name 17
    read(17)
	addRow('Program Name', '"'+getStringValue()+'"', 'Internal Program name');

    // File type byte
    read(1);
    const ftype = getNumberValue();

    if (ftype == 0xf0) {

        /*******************************************************************
         * BASIC lines
         *******************************************************************/

        addRow('Type','[F0] BASIC', 'BASIC Program inside (could be laucher for binary code)');
        // load/start address
        read(2);
        let basicLineAbsAddr = getNumberValue();
        let basicLineHexAddr = getHex0xValue();
        addRow('Load Addr',basicLineHexAddr, 'Addres to load BASIC bytes. Start of BASIC Lines');
        
		while(!endOfFile() && basicLineAbsAddr != 0) {
            readRowWithDetails(basicLineHexAddr, () => {
                retVal = { value: basicLineAbsAddr, description: 'End of BASIC Program' };
                // BASIC next line absolute address
				read(2);
                let nextAbsAddr = getNumberValue();
                let nextHexAddr = getHex0xValue();
                addRow('Next Addr', nextHexAddr, 'Address of next BASIC line data')
                // if 0000 there is no more BASIC Program data
				if (nextAbsAddr != 0) {
                    // 16-bit Line Number
					read(2);
                    let basicLineNo = getNumberValue();
                    addRow('Line No', basicLineNo, 'BASIC Line number');
                    // Line body data terminated by 0
					readUntil(0);
                    let basicLineData = getData();
                    let basicLineText = convertToBasic(basicLineData, basicLineNo);
					retVal.value = basicLineAbsAddr;
					retVal.description = basicLineText;
                    addRow('Line Data', 'Bytes', getHexSequence(basicLineData));
                    read(1);
                    addRow('Terminator', getNumberValue(), 'Line terminator');
                }
                basicLineAbsAddr = nextAbsAddr;
                basicLineHexAddr = nextHexAddr;
                return retVal;
            });        
        }
		if (!endOfFile()) {
			read();
			addMemDump();
		}
    } else if (ftype == 0xf1) {
        
        /*******************************************************************
         * Binary code to execute
         *******************************************************************/
        addRow('Type','[F1] Binary', 'Binary code to execute');
        // load/start address
        read(2);
        addRow('Load Addr',getHex0xValue(), 'Addres to load following code. Start of execution');
        
        //read(); //read to the end
        //addRow('Code Dump');
        read();
        addMemDump();

    } else {
        
		addRow('Type','[' + getHexByte(ftype) + '] Unknown', 'Unknown. Could be internal format for specific program');
        // load/start address
        read(2);
        addRow('Load Addr',getHex0xValue(), 'Addres to load following code. Start of execution');
        read();
        addMemDump();

    }

});
function getHexByte(b) {
	var c = b.toString(16).toUpperCase();
	if (c.length == 1) c = '0'+c;
	return c;
}
function getHexSequence(data) {
	var s = '';
	data.forEach(b => {
		s += getHexByte(b) + ' ';
	});
	return s;
}
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
function convertToBasic(data, lineNo=-1) {
    let result = lineNo >= 0 ? lineNo.toString() + ' ' : '';
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
    return '<span style="font-family: Hot Coco; font-size: 110%; white-space: pre; color: #80ff80">' + result + '</span>';
};