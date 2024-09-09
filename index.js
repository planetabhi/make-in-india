const fs = require('fs').promises;
const path = require('path');

async function mergeJsonFiles(srcDir = 'src', distDir = 'dist', outputFileName = 'directory.json', ignoredFolder = 'ignored') {
  const root = path.resolve(__dirname);
  const sourcePath = path.join(root, srcDir);
  const destPath = path.join(root, distDir);

  try {
    const getFiles = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(entries.map(async (entry) => {
        const res = path.resolve(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === ignoredFolder) {
            return [];
          }
          return getFiles(res);
        } else {
          const stats = await fs.stat(res);
          if (stats.size > 0 && path.extname(res) === '.json') {
            return res;
          }
          return [];
        }
      }));
      return files.flat();
    };

    const jsonFiles = await getFiles(sourcePath);
    let mergedData = (await Promise.all(jsonFiles.map(async (file) => {
      try {
        const content = await fs.readFile(file, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error(`Invalid JSON in file: ${file}`);
          console.error(`Error details: ${error.message}`);
        } else {
          console.error(`Error reading file: ${file}`);
          console.error(`Error details: ${error.message}`);
        }
        return [];
      }
    }))).flat();

    // Filter out entries without a valid URL
    mergedData = mergedData.filter(item => item.url && item.url.trim() !== '');

    mergedData = mergedData.filter((item, index, self) =>
      index === self.findIndex((t) => t.slug === item.slug && t.title === item.title)
    );

    mergedData.sort((a, b) => a.title.localeCompare(b.title));

    await fs.mkdir(destPath, { recursive: true });
    await fs.writeFile(path.join(destPath, outputFileName), JSON.stringify(mergedData, null, 2));
    console.log(`Merged JSON file created at: ${path.join(destPath, outputFileName)}`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

mergeJsonFiles();