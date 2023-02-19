
const HeaderVar1Start = [0x80,0x80,0x80,0x80,0x80,0x80,0x80, 0x00, 0xfe,0xe7,0x18,0xc3];
const HeaderVar2Start = [0x80,0x80,0x80,0x80,0x80,0x80, 0x00, 0xfe,0xe7,0x18,0xc3];

/**
 * Select the 'vz' extension with VZF0 header.
 */
registerFileType((fileExt, filePath, fileData) => {
	// Check for vz extension
    if (fileExt.toLowerCase() === 'dsk') {
		let headerBytes = fileData.getBytesAt(0,12);
		if (headerBytes.toString() == HeaderVar1Start.toString())
			return true;
		headerBytes = fileData.getBytesAt(0,11);
			if (headerBytes.toString() == HeaderVar2Start.toString())
				return true;
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
 * 25   2 bytes		- CRC of Sector data  
 * Total 27 bytes	------------------------------------------------------
 */

/*******
 * Header structure (variant no 2):
 * 0	6 bytes		- GAP1 = 0x80,0x80,0x80,0x80,0x80,0x80
 * 6	1 byte		- GAP1 = 0x00
 * 7	4 bytes		- IDAM Start = 0xfe, 0xe7, 0x18, 0xc3
 * 11	1 byte		- Track number
 * 12	1 byte		- Sector number
 * 13	1 byte		- CRC of Track and Sector Number (simbly T+S)
 * 14	6 bytes		- GAP2 = 0x80,0x80,0x80,0x80,0x80,0x80
 * 20	1 byte		- GAP2 = 0x00
 * 21   4 bytes		- IDAM End = 0xc3, 0x18, 0xe7, 0xfe
 * 25   2 bytes		- CRC of Sector data  
 * Total 27 bytes	------------------------------------------------------
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
/**
 * Parser for VZ files.
 * It is not a complete wav parsing implementation.
 */
registerParser(() => {
    
    addStandardHeader();
	// 40 tracks to read
	for(let track=0; track < 1; track++) {
		// GAP1 
		read(7);
		let gap1 = getData();
		addRow('GAP1', getHexSequence(gap1) ,'GAP1 bytes - Start of sector');
		
		//IDAM Start
		read(4);
		let IDAMStart = getData();
		addRow('IDAM Start', getHexSequence(IDAMStart) ,'IDAM bytes');
		
		// Track Number
		read(1);
		let trackNo = getNumberValue();
		addRow('Track No', trackNo ,'Track number '+trackNo.toString());

		// Sector Number
		read(1);
		let secNo = getNumberValue();
		addRow('Sector No', secNo ,'Sector number '+secNo.toString());

		// CRC
		read(1);
		let crc = getHexValue().toUpperCase();
		addRow('CRC', crc ,'CRC for Track and Sector number ('+(trackNo+secNo).toString()+')');

		// GAP2
		read(7);
		let gap2 = getData();
		addRow('GAP2', getHexSequence(gap2) ,'GAP2 bytes - End of sector header');
		
		//IDAM End
		read(4);
		let IDAMEnd = getData();
		addRow('IDAM End', getHexSequence(IDAMEnd) ,'IDAM bytes');

	}
});