import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const urls: string[] = []
const BASE_URL: string = "https://raw.githubusercontent.com/enthec/webappanalyzer/refs/heads/main/src/technologies/";
const FILE_EXTENSION: string = ".json";

urls.push("https://raw.githubusercontent.com/enthec/webappanalyzer/refs/heads/main/src/categories.json");
urls.push(BASE_URL + "_" + FILE_EXTENSION);

for (let i = 97; i <= 122; i++) {
    urls.push(BASE_URL + String.fromCharCode(i) + FILE_EXTENSION)
}

const technologiesDir = process.env.TECHNOLOGIES_DIR ?? 'data/technologies'

const fetchAndSave = async (url: string): Promise<void> => {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }
    const content = await response.text()
    const filename = path.basename(url)
    await fs.promises.writeFile(path.join(technologiesDir, filename), content, 'utf-8')
    console.log(`Downloaded ${filename}`);
}

Promise.all(urls.map(fetchAndSave))
    .then(() => console.log('All technology files downloaded.'))
    .catch((err) => {
        console.error('Failed to download technology files:', err)
        process.exit(1)
    })
