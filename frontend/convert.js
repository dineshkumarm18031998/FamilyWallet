const { Jimp } = require('jimp');

async function convert() {
  try {
    const logo = await Jimp.read('assets/images/logo.png');
    await logo.write('assets/images/logo_real.png');
    console.log("Converted logo!");

    const splash = await Jimp.read('assets/images/splash.png');
    await splash.write('assets/images/splash_real.png');
    console.log("Converted splash!");
  } catch (err) {
    console.error("Error:", err);
  }
}

convert();
