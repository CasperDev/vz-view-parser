
const HeaderVar1Start = [0x80,0x80,0x80,0x80,0x80,0x80,0x80, 0x00, 0xfe,0xe7,0x18,0xc3];
const HeaderVar2Start = [0x80,0x80,0x80,0x80,0x80,0x80, 0x00, 0xfe,0xe7,0x18,0xc3];

/**
 * Select the 'vz' extension with VZF0 header.
 */
registerFileType((fileExt, filePath, fileData) => {
	// Check for vz extension
    if (fileExt.toLowerCase() === 'dsk') {
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
 */
/*******
 * Disk sector structure:
 * 0  	25 bytes 	- Header with track and sector number
 * 25	128 bytes 	- sector data
 * 153	2 bytes		- 16bit CRC of sector data
 * Total 155 bytes  --------------------------
 */
/*******
 * Header structure (variant no 1 as documented in VZ300 Technical Manual):
 * 0	7 bytes		- GAP1 = 0x80,0x80,0x80,0x80,0x80,0x80,0x80
 * 7	1 byte		- GAP1 = 0x00
 * 8	4 bytes		- IDAM Start = 0xfe, 0xe7, 0x18, 0xc3
 * 12	1 byte		- Track number
 * 13	1 byte		- Sector number
 * 14	1 byte		- CRC of Track and Sector Number (simbly T+S)
 * 15	5 bytes		- GAP2 = 0x80,0x80,0x80,0x80,0x80
 * 20	1 byte		- GAP2 = 0x00
 * 21   4 bytes		- IDAM End = 0xc3, 0x18, 0xe7, 0xfe
 * Total 25 bytes	------------------------------------------------------
 */

/*******
 * Header structure (variant no 2):
 * 0	6 bytes		- GAP1 = 0x80,0x80,0x80,0x80,0x80,0x80
 * 6	1 byte		- GAP1 = 0x00
 * 7	4 bytes		- IDAM Start = 0xfe, 0xe7, 0x18, 0xc3
 * 11	1 byte		- Track number
 * 12	1 byte		- Sector number
 * 13	1 byte		- CRC of Track and Sector Number (simbly T+S)
 * 14	5 bytes		- GAP2 = 0x80,0x80,0x80,0x80,0x80
 * 19	1 byte		- GAP2 = 0x00
 * 20   4 bytes		- IDAM End = 0xc3, 0x18, 0xe7, 0xfe
 * Total 24 bytes	------------------------------------------------------
 */

/*******
 * Header structure (variant no 3):
 * 0	5 bytes		- GAP1 = 0x80,0x80,0x80,0x80,0x80
 * 5	1 byte		- GAP1 = 0x00
 * 6	4 bytes		- IDAM Start = 0xfe, 0xe7, 0x18, 0xc3
 * 10	1 byte		- Track number
 * 11	1 byte		- Sector number
 * 12	1 byte		- CRC of Track and Sector Number (simbly T+S)
 * 13	5 bytes		- GAP2 = 0x80,0x80,0x80,0x80,0x80
 * 18	1 byte		- GAP2 = 0x00
 * 19   4 bytes		- IDAM End = 0xc3, 0x18, 0xe7, 0xfe
 * Total 23 bytes	------------------------------------------------------
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

function parseSectorHeader(header) 
{
	let gap1Len = (header[7] == 0 && header[8] == 0xfe) ? 8
				: (header[6] == 0 && header[7] == 0xfe) ? 7
				: (header[5] == 0 && header[6] == 0xfe) ? 6
				: 1;
	let trackNo = header[gap1Len+4];
	let secNo   = header[gap1Len+5];
	let trackSecCrc = header[gap1Len+6];
	let startGap2 = gap1Len+7;
	let gap2Len = (header[startGap2+7] == 0 && header[startGap2+8] == 0xc3) ? 8
				: (header[startGap2+6] == 0 && header[startGap2+7] == 0xc3) ? 7
				: (header[startGap2+5] == 0 && header[startGap2+6] == 0xc3) ? 6
				: 1;
	let headerLen = gap1Len+4+3+gap2Len+4;
	let valid = false;
	if (gap1Len > 1 && gap2Len > 1 
		&& header[gap1Len+1] == 0xe7 && header[gap1Len+2] == 0x18 && header[gap1Len+3] == 0xc3
		&& header[startGap2+gap2Len+1] == 0x18 && header[startGap2+gap2Len+2] == 0xe7 && header[startGap2+gap2Len+3] == 0xfe)
		valid = true;

	return {
		valid: valid,
		headerLen: headerLen,
		gap1Len: gap1Len,
		gap2Len: gap2Len,
		trackNo: trackNo,
		secNo: secNo,
		trackSecCrc: trackSecCrc,
	};
}
/**
 * Parser for VZ files.
 * It is not a complete wav parsing implementation.
 */
registerParser(() => {
    

    addStandardHeader();
	// 40 tracks to read

	for(let sec=0; sec < 40*16; sec++) {


		read(27);
		let startOffset = getOffset();
		let headerData = getData();
		let header = parseSectorHeader(headerData);
		if (header.headerLen < 27) {
			setOffset(startOffset);
			read(header.headerLen);
		}

		addRow("Header", 'T:'+header.trackNo+' S:'+header.secNo, 
				'Header of Sector '+header.secNo+' on Track '+header.trackNo);

		addDetails(()=> {
			// GAP1 
			
			read(header.gap1Len);
			let gap1 = getData();
			addRow('GAP1', 'Enter', getHexSequence(gap1));
			
			//IDAM Start
			read(4);
			let IDAMStart = getData();
			addRow('IDAM', 'IDAM (in)', getHexSequence(IDAMStart));
			
			// Track Number
			read(1);
			let trackNo = getNumberValue();
			addRow('Track', trackNo ,'Track number '+trackNo.toString());

			// Sector Number
			read(1);
			let secNo = getNumberValue();
			addRow('Sector', secNo ,'Sector number '+secNo.toString());

			// CRC
			read(1);
			let crc = getNumberValue();
			addRow('CRC', crc ,'CRC for Track and Sector number (expected '+(trackNo+secNo).toString()+')');

			// GAP2
			read(header.gap2Len);
			let gap2 = getData();
			addRow('GAP2', 'Exit', getHexSequence(gap2));
			
			//IDAM End
			read(4);
			let IDAMEnd = getData();
			addRow('IDAM', 'IDAM (out)', getHexSequence(IDAMEnd));
		});

		read(128);
		addRow('Sector', 'Data', 'Sector Data');
		addDetails(() => {
			read(128);
			addMemDump();
		});

		read(2);
		let secCrc = getHexValue().toUpperCase();
		addRow('Sec CRC', '0x'+secCrc, 'CRC of Sector data');
	}
});