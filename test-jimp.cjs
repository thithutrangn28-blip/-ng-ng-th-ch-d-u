const { Jimp } = require('jimp');
async function test() {
  const image = await Jimp.read('temp.jpg');
  image.resize({ w: 192, h: 192 });
  await image.write('public/icons/icon-192x192.png');
  console.log('Success');
}
test().catch(console.error);
