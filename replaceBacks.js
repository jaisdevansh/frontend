const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'mobile', 'src', 'app');

function findFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findFiles(filePath, fileList);
        } else if (file.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const files = findFiles(srcDir);

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    if (content.includes('router.back()') || content.includes('router.back')) {
        // Calculate relative path to hooks
        const relativePath = path.relative(path.dirname(file), path.join(__dirname, 'mobile', 'src', 'hooks', 'useStrictBack')).replace(/\\/g, '/');

        // Add import if not present
        if (!content.includes('useStrictBack')) {
            content = content.replace(
                "import { useRouter } from 'expo-router';",
                `import { useRouter } from 'expo-router';\nimport { useStrictBack } from '${relativePath}';`
            );
            // If the above didn't work (useRouter imported differently), just add after react import
            if (!content.includes('useStrictBack')) {
                content = content.replace("import React", `import { useStrictBack } from '${relativePath}';\nimport React`);
            }
        }

        // Add goBack hook
        if (!content.includes('const goBack = useStrictBack')) {
            // Check if (auth), (host), etc. for fallback
            let fallback = "'/'";
            if (file.includes('(auth)')) fallback = "'/(auth)/welcome'";
            else if (file.includes('(host)')) fallback = "'/(host)/dashboard'";
            else if (file.includes('(user)')) fallback = "'/(user)/home'";
            else if (file.includes('(settings)')) fallback = "'/'"; // or back to caller

            content = content.replace(
                /const router = useRouter\(\);/,
                `const router = useRouter();\n    const goBack = useStrictBack(${fallback});`
            );
        }

        // Replace router.back()
        content = content.replace(/router\.back\(\)/g, "goBack()");
        content = content.replace(/onPress=\{router\.back\}/g, "onPress={goBack}");

        fs.writeFileSync(file, content);
        console.log(`Updated: ${file}`);
    }
}
