const { Jimp } = require('jimp');

async function main() {
  try {
    const image = await Jimp.read('temp.jpg');
    
    const icon192 = image.clone();
    icon192.resize({ w: 192, h: 192 });
    await icon192.write('public/icons/icon-192x192.png');
    
    const icon512 = image.clone();
    icon512.resize({ w: 512, h: 512 });
    await icon512.write('public/icons/icon-512x512.png');
    
    const maskable = image.clone();
    maskable.resize({ w: 512, h: 512 });
    await maskable.write('public/icons/icon-maskable-512x512.png');
    
    console.log('Icons updated successfully');
  } catch (e) {
    console.error(e);
  }
}
main();
