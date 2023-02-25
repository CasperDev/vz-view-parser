
/**
 * Select the 'vz' extension with VZF0 header.
 */
registerFileType((fileExt, filePath, fileData) => {
	// Check for vz extension
    if (fileExt.toLowerCase() === 'dsk' || fileExt.toLowerCase() === 'dvz') {
		let headerBytes = fileData.getBytesAt(0,27);
		let header = parseSectorHeader(headerBytes);
		return header.valid;
		// if (headerBytes.toString() == HeaderVar1Start.toString())
		// 	return true;
		// headerBytes = fileData.getBytesAt(0,11);
		// 	if (headerBytes.toString() == HeaderVar2Start.toString())
		// 		return true;
	}
	return false;
});

/*******
 * Disk Structure:
 * Format contains 40 track, with 16 sectors per track
 * Tracks are numbered from 0 to 39, Sectors for 0 to 15
 * For performance reasons the sequence of sector arrangement on track is:
 * 0, 11, 6, 1, 12, 7, 2, 13, 8, 3, 14, 9, 4, 15, 10, 5
 * NOTE: Disk image file doesn't have to follow this sequence.
 * 
 * The DOS uses Track 0, Sector 0 to Sector 14 as the directory.
 * Track 0 Sector 15 is used to hold the track map of the disk with one bit 
 * corresponding to a sector used. 
 * 
 * Each directory entry contains 16 bytes. Therefore 1 sector 
 * can hold 8 entries and 1 diskette can have a maximum of 112 entries.
 * 
 */

/********
 * Directory entry structure
 *
 * 0	1 byte	File type char ('T','B',\01 (hidden?? BASIC))
 * 1	1 byte	Delimitor char ':' (0x3a)
 * 2	8 bytes	File name
 * 10	1 byte	Start track
 * 11	1 byte	Start sector
 * 12	2 bytes	16-bit Start address
 * 14	2 bytes	16-bit End address
 * Total 16 bytes -------------------------

 */
/*******
 * Disk sector structure:
 * 0  	25 bytes 	- Header with track and sector number (see NOTE below)
 * 25	128 bytes 	- sector data
 * 153	2 bytes		- 16bit CRC of sector data
 * Total 155 bytes  --------------------------
 */

/*******
 * Header structure (as documented in VZ300 Technical Manual):
 * 0	7 bytes		- GAP1 = 0x80,0x80,0x80,0x80,0x80,0x80,0x80
 * 7	1 byte		- GAP1 End = 0x00
 * 8	4 bytes		- IDAM Start = 0xfe, 0xe7, 0x18, 0xc3
 * 12	1 byte		- Track number
 * 13	1 byte		- Sector number
 * 14	1 byte		- CRC of Track and Sector Number (simbly T+S)
 * 15	5 bytes		- GAP2 = 0x80,0x80,0x80,0x80,0x80
 * 20	1 byte		- GAP2 End = 0x00
 * 21   4 bytes		- IDAM End = 0xc3, 0x18, 0xe7, 0xfe
 * Total 25 bytes	------------------------------------------------------
 * 
 * NOTE: Number of 0x80 bytes in GAP1 and GAP2 varies from 5 to 7.
 *       This can be inconsistient even in the same disk image file.
 */



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

function err(s) {
	return ' <span style="color: red">'+s+'</span>';
}

function isGapValid(buffer, start, end) {
	if (buffer[end-1] != 0x00)
		return false;
	for(let i=start; i<end-1;i++) {
		if (buffer[i] != 0x80) return false;
	}
	return true;
}
function parseSectorHeader(header) 
{
	let gap1Len = (header[7] == 0 && header[8] == 0xfe) ? 8
				: (header[6] == 0 && header[7] == 0xfe) ? 7
				: (header[5] == 0 && header[6] == 0xfe) ? 6
				: 1;
	let gap1valid = isGapValid(header,0,gap1Len);
	let IDAMinValid = header[gap1Len+1] == 0xe7 && header[gap1Len+2] == 0x18 && header[gap1Len+3] == 0xc3;
	let trackNo = header[gap1Len+4];
	let secNo   = header[gap1Len+5];
	let trackSecCrc = header[gap1Len+6];
	let startGap2 = gap1Len+7;
	let gap2Len = (header[startGap2+7] == 0 && header[startGap2+8] == 0xc3) ? 8
				: (header[startGap2+6] == 0 && header[startGap2+7] == 0xc3) ? 7
				: (header[startGap2+5] == 0 && header[startGap2+6] == 0xc3) ? 6
				: 1;
	let gap2valid = isGapValid(header,startGap2,gap2Len+startGap2);
	let IDAMoutValid = header[startGap2+gap2Len+1] == 0x18 && header[startGap2+gap2Len+2] == 0xe7 && header[startGap2+gap2Len+3] == 0xfe;
	let headerLen = gap1Len+4+3+gap2Len+4;
	let valid = false;
	if (gap1Len > 1 && gap2Len > 1 
		&& IDAMinValid
		&& IDAMoutValid)
		valid = true;

	return {
		valid: valid,
		headerLen: headerLen,
		gap1Len: gap1Len,
		gap1valid: gap1valid,
		IDAMinValid: IDAMinValid,
		IDAMoutValid: IDAMoutValid,
		gap2Len: gap2Len,
		gap2valid: gap2valid,
		trackNo: trackNo,
		secNo: secNo,
		trackSecCrc: trackSecCrc,
	};
}

var SectorNumbers = [0, 11, 6, 1, 12, 7, 2, 13, 8, 3, 14, 9, 4, 15, 10, 5];

function addSectorHeader(sec,trk) {
	
	let HeaderErrors = [];

	// read(27);
	// let startOffset = getOffset();
	// let headerData = getData();
	// let header = parseSectorHeader(headerData);
	// if (header.headerLen < 27) {
	// 	setOffset(startOffset);
	// 	read(header.headerLen);
	// }
	
	//addRow("Header", 'T:'+header.trackNo+' S:'+header.secNo, s_header_desc);
	var header = {};

	readRowWithDetails('Header', ()=> {
		
		// preload header fields 

		read(27);
		let startOffset = getOffset();
		let headerData = getData();
		header = parseSectorHeader(headerData);
		// reset offset 
		setOffset(startOffset);
	
		// GAP1 
		
		read(header.gap1Len);
		let gap1 = getData();
		let gapdesc = getHexSequence(gap1);
		if (header.gap1valid == false) {
			HeaderErrors.push('Inavlid GAP1');
			gapdesc += err('Invalid');
		}
		addRow('GAP1', 'Enter', gapdesc);
		
		//IDAM Start
		
		read(4);
		let IDAMStart = getData();
		let IDAMStartDesc = getHexSequence(IDAMStart);
		if (header.IDAMinValid == false) {
			HeaderErrors.push('Inavlid IDAM in');
			IDAMStartDesc += err('(expected FE E7 18 C3)');
		}
		addRow('IDAM', 'IDAM (in)', IDAMStartDesc);
		
		// Track Number
		read(1);
		
		let trackNo = getNumberValue();
		let trackNoDesc = 'Track number '+trackNo.toString();
		if (trk != header.trackNo) {
			HeaderErrors.push('Wrong Track number');
			trackNoDesc += err("(expected "+trk.toString()+')');
		}
		addRow('Track', trackNo, trackNoDesc);

		// Sector Number
		read(1);
		let secNo = getNumberValue();
		let secNoDesc = 'Sector number '+secNo.toString();
		if (SectorNumbers[sec] != header.secNo) {
			HeaderErrors.push('Wrong Sector number');
			secNoDesc += err("(expected "+SectorNumbers[sec].toString()+')');
		}
		addRow('Sector', secNo, secNoDesc);

		// CRC
		read(1);
		let crc = getNumberValue();
		let crcDesc = 'Track + Sector CRC';
		if (crc != secNo + trackNo) {
			HeaderErrors.push('Invalid Sec+Trk CRC');
			crcDesc += err("(expected "+(secNo+trackNo).toString()+')');
		}
		addRow('CRC', crc ,crcDesc);

		// GAP2
		read(header.gap2Len);
		let gap2 = getData();
		let gap2desc = getHexSequence(gap2);
		if (header.gap2valid == false) {
			HeaderErrors.push('Inavlid GAP2');
			gap2desc += err('Invalid');
		}
		addRow('GAP2', 'Exit', gap2desc);
		
		//IDAM End
		read(4);
		let IDAMEnd = getData();
		let IDAMEndDesc = getHexSequence(IDAMEnd);
		if (header.IDAMoutValid == false) {
			HeaderErrors.push('Inavlid IDAM out');
			IDAMEndDesc += err('(expected C3 18 E7 FE)');
		}
		addRow('IDAM', 'IDAM (out)', IDAMEndDesc);
		
		let s_header_desc = 'Header of Sector '+header.secNo+' on Track '+header.trackNo;
		if (HeaderErrors.length != 0) {
			s_header_desc += err(HeaderErrors.toString());
		}
		
		return {
			value: 'T:'+header.trackNo+' S:'+header.secNo,
			description: s_header_desc
		};
	});
	return {
		trackNo: header.trackNo,
		secNo: header.secNo,
		valid: HeaderErrors.length == 0 ? true : false
	};
}
function addSectorRow(sec,trk) {
	let SectorErrors = [];
			
	readRowWithDetails("Sector", ()=>{
	
		let header = addSectorHeader(sec,trk);
		if (header.valid == false) {
			SectorErrors.push('Invalid Header');
		}

		read(128);
		let secData = getData();
		addRow('Sector', 'Data', 'Sector Data');
		addDetails(() => {
			read(128);
			addMemDump();
		});

		let secCrcCalc = 0;
		for (let index = 0; index < secData.length; index++) {
			const element = secData[index];
			secCrcCalc = secCrcCalc + element;
		}
		read(2);
		let secCrc = getNumberValue();
		let secCrcHex = '0x'+getHexValue();
		let s_crcdesc = 'CRC of Sector data';
		if (secCrc != secCrcCalc) {
			s_crcdesc += err('(expected '+getHexByte(secCrcCalc)+')');
			SectorErrors.push('Wrong CRC');
		}
		addRow('Sec CRC', secCrcHex, s_crcdesc);

		let s_desc = 'Sector '+header.secNo.toString()+' on Track '+header.trackNo.toString();
		if (SectorErrors.length != 0) { 
			s_desc += '' +err(SectorErrors.toString());
		}
		return {
			value: ''+header.secNo,
			description:  s_desc
		};
	}); // sector row
	if (SectorErrors.length == 0) return true; else return false;
}

function addTrackRow(trk) {

	let currentTrk = trk;
	readRowWithDetails("Track", () => {
	let sectorsWithErrors = [];

		for(let sec=0; sec < 16; sec++) {
			if (addSectorRow(sec,trk) != true)
				sectorsWithErrors.push(SectorNumbers[sec]);
		}
		// some disk images have 15 or 16 bytes long (0x00) track separator 
		if (!endOfFile()) {
			read(16);
			let sepOffset = getOffset();
			let sepData = getData();
			if (sepData[0] == 0)
				addMemDump();
			else
				setOffset(sepOffset);
		}
		let s_desc = (sectorsWithErrors.length == 0) ? '' 
			: ' <span style="color:red">(ERR in Sectors: '+sectorsWithErrors.toString()+')</span>';
		return {
			value: currentTrk,
			description: 'Track '+currentTrk+s_desc
		};
	}); // track row

}
/**
 * Parser for VZ files.
 * It is not a complete wav parsing implementation.
 */
registerParser(() => {

	addStandardHeader();
	
	// -------  40 tracks to read -------------

	for(let trk=0; trk < 40; trk++) {
		addTrackRow(trk);
	}

});