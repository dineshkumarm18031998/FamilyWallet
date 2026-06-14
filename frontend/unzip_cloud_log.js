const fs = require('fs');
const zlib = require('zlib');

try {
  const fileBuffer = fs.readFileSync('eas_cloud_log.txt');
  const unzipped = zlib.unzipSync(fileBuffer);
  fs.writeFileSync('parsed_cloud_log.txt', unzipped);
  console.log('Unzipped successfully');
} catch (e) {
  console.error('Unzip failed:', e);
}
