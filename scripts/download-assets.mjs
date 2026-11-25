/** Optional downloader for public image assets used as visual reference.
 * Downloads only listed publicly accessible files. Does not access any private API.
 * Respect the original owner's copyright and obtain permission before redistribution.
 * Run: npm run download-assets   (Node.js 18+)
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const ROOT = new URL('../assets/media/',import.meta.url);
const BASE = 'https://www.itsbalcony.com/templates/royale/media/';
const photos = [
  ['c9accd01-d7e7-4ea4-8105-bfc0bdb5e41d.jpg','photo-1.jpg'],
  ['edf9f981-3908-4eb9-93a8-bed06a534df1.jpg','photo-2.jpg'],
  ['e74252cb-746f-416f-b810-5dd56e430229.jpg','photo-3.jpg']
];
const names = [
 'floral1.png','elephant.png','floral2.webp','divider.webp','divider2.png','divider3.png',
 'lotus_bunch.png','pavilion.webp','mandap_dusk.webp','garden_close_tall.webp',
 'ring_ceremony.webp','mehendi.webp','haldi.webp','sangeet.webp','vivaah.webp','reception.webp',
 'section_divider.svg','knob-left 1.svg','roll-top1.svg','knob 3.svg'
];
await mkdir(ROOT,{recursive:true});
let success = 0;
for (const file of names) {
  const url = BASE+encodeURIComponent(file);
  try {
    const response = await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'Mozilla/5.0 (compatible; PersonalWeddingArchive/1.0)'}});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    await writeFile(new URL(encodeURIComponent(file),ROOT),bytes);
    console.log(`✓ ${file.padEnd(24)} ${Math.round(bytes.length/1024)} KB`);
    success++;
  } catch(error){ console.log(`✗ ${file}: ${error.message}`); }
  await new Promise(resolve=>setTimeout(resolve,180));
}
console.log(`\nSaved ${success}/${names.length} public visual assets in assets/media/.`);

// Sample photo URLs are from the user-provided webpage data, not bundled in this ZIP.
// Only download these if you have permission to use the images.
const photoFolder = new URL('../assets/photos/',import.meta.url);
await mkdir(photoFolder,{recursive:true});
let photoCount=0;
for (const [remoteName,localName] of photos) {
  const url='https://www.itsbalcony.com/uploads/events/8/'+remoteName;
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    await writeFile(new URL(localName,photoFolder),bytes);
    console.log(`✓ gallery ${localName} ${Math.round(bytes.length/1024)} KB`);
    photoCount++;
  } catch(error){console.log(`✗ gallery ${localName}: ${error.message}`);}
  await new Promise(resolve=>setTimeout(resolve,180));
}
console.log(`Gallery images saved: ${photoCount}/${photos.length}`);
