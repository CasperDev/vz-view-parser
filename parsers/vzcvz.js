
/**
 * Select the 'vz' extension with VZF0 header.
 */
registerFileType((fileExt, filePath, fileData) => {
	// Check for vz extension
    if (fileExt.toLowerCase() === 'cvz') {
		const leadinArray = fileData.getBytesAt(0, 260);
		let valid = arrayIsFilledWith(leadinArray, 0x80, 0, 255)
			&&  arrayIsFilledWith(leadinArray, 0xfe, 255, 260);
		return valid;
	}
	return false;
});

function err(s) {
	return ' <span style="color: red">'+s+'</span>';
}



function arrayIsFilledWith(array, byte, start, end) {
	
	for(let i=start; i< end; i++) {
		if (array[i] != byte) 
			return false;
	}
	return true;
}
function addLeadInStart() {
	read(255);
	addRow('Lead In', '255 x 80', 'Tape lead in (255 x 0x80)');
	addDetails(()=>{
		read(255);
		addMemDump();
	});
}

function addLeadInEnd() {
	read(5);
	addRow('Lead In', '5 x FE', 'Tape lead in (5 x 0xFE)');
	addDetails(()=>{
		read(5);
		addMemDump();
	});
}

function addLeadIn() {

	read(260);
	addRow('Lead In', '80.. FE..', 'Tape Lead in Header');
	addDetails(()=>{
		addLeadInStart();
		addLeadInEnd();
	});
}
function addLeadOutStart(errDesc) {
	read();
	addRow('Lead Out', '20 x 80', 'Tape lead out (20 x 0x00)'+errDesc);
	addDetails(()=>{
		read();
		addMemDump();
	});
}


function addLeadOut() {

	read();
	let len = getData().length;
	let errDesc = (len != 20) ? err(' (expected 20 bytes but '+len.toString()+' found)') : '';
	addRow('Lead Out', '00.. ', 'Tape Lead Out Header'+errDesc);
	addDetails(()=>{
		addLeadOutStart(errDesc);
	});
}
function addFileType() {

	read(1);
	const ftype = getNumberValue();
	if (ftype == 0xf0) {

	   addRow('Type','[F0] BASIC', 'BASIC Program inside (could be laucher for binary code)');
	   // load/start address
	} else if (ftype == 0xf1) {

	   addRow('Type','[F1] Binary', 'Binary code to execute');

	} else {
	   addRow('Type','[' + getHexByte(ftype) + '] Unknown', err('WARN: ')+'Unknown. Could be internal format for specific program');
	}
	return ftype;
}

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

/**
 * Parser for VZ files.
 * It is not a complete wav parsing implementation.
 */
registerParser(() => {
    
    addStandardHeader();

	addLeadIn();

	let ftype = addFileType()

	 // File type byte
	readRowWithDetails('Program Name',()=>{
		readUntil(0);
		let name = '"'+getStringValue()+'"';
		let desc = 'Internal Program Name';
		addMemDump();
		read(1);
		addRow('null',0,'Text terminator');

		return {
			value: name,
			description: desc
		}
	});

	if (ftype == 0xf0) {

        /*******************************************************************
         * BASIC lines
         *******************************************************************/

		let dataCrcCalc = 0;

        // load/start address
        read(2);
        let basicLineAbsAddr = getNumberValue();
        let basicLineHexAddr = getHex0xValue();
        addRow('Load Addr',basicLineHexAddr, 'Addres to load BASIC bytes. Start of BASIC Lines');
        dataCrcCalc += basicLineAbsAddr & 0xff;
        dataCrcCalc += (basicLineAbsAddr / 256) & 0xff;

		// load/end address
		read(2);
		let basicEndAbsAddr = getNumberValue();
        let basicEndHexAddr = getHex0xValue();
        addRow('End Addr',basicEndHexAddr, 'End of Program data');
        dataCrcCalc += basicEndAbsAddr & 0xff;
        dataCrcCalc += (basicEndAbsAddr / 256) & 0xff;

		// read all data block
		read(basicEndAbsAddr-basicLineAbsAddr);
		let saveOffset = getOffset();
		let data = getData();
		data.forEach((b)=>{ dataCrcCalc += b; })
		dataCrcCalc &= 0xffff;
		setOffset(saveOffset);

		// recreate BASIC lines
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
		// stored CRC
		read(2);
		let dataCrc = getNumberValue();
		let dataCrcHex = getHex0xValue();
		let s_crcdesc = 'CRC of Program data';
		if (dataCrc != dataCrcCalc) {
			s_crcdesc += err('(expected '+getHexByte(dataCrcCalc)+')');
		}
		addRow('Sec CRC', dataCrcHex, s_crcdesc);

		addLeadOut();
		// if (!endOfFile()) {
		// 	read();
		// 	let leadOutData = getData();
		// 	let leadOutDesc = 'Tape Lead Out Footer';
		// 	if (leadOutData.length != 20) {
		// 		leadOutDesc += err('(expected 20 bytes but '+leadOutData.length.toString()+' found)');
		// 	}
		// 	addRow('Lead out','00.. ', addMemDump();
		// }
    } else if (ftype == 0xf1) {
        
        /*******************************************************************
         * Binary code to execute
         *******************************************************************/
        // load/start address
        read(2);
        addRow('Load Addr',getHex0xValue(), 'Addres to load following code. Start of execution');
        
        //read(); //read to the end
        //addRow('Code Dump');
        read();
        addMemDump();

    } else {
        
        // load/start address
        read(2);
        addRow('Load Addr',getHex0xValue(), 'Addres to load following code. Start of execution');
        read();
        addMemDump();

    }


});

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
            else if (b == 0x3c)
				result += '&lt;';
			else if (b == 0x3e)
				result += '&gt;';
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
