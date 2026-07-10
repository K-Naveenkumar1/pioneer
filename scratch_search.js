const fs = require("fs");
const path = require("path");

const docxDir = path.join(__dirname, "node_modules", "docx", "dist");
const files = fs.readdirSync(docxDir);

for (const file of files) {
    const filePath = path.join(docxDir, file);
    if (fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath, "utf8");
        if (content.includes("must have at least")) {
            console.log(`Found "must have at least" in ${file}`);
        }
        if (content.includes("child element")) {
            console.log(`Found "child element" in ${file}`);
        }
        if (content.includes("The section must")) {
            console.log(`Found "The section must" in ${file}`);
        }
        if (content.includes("Paragraph, Table")) {
            console.log(`Found "Paragraph, Table" in ${file}`);
        }
    }
}
console.log("Search complete");
