const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const baseRoot = path.resolve(__dirname, '..');
const baseGit = path.resolve(baseRoot, '.git');

const hasGit = (() => {
    try {
        return fs.statSync(baseGit).isDirectory();
    } catch (error) {
        return false;
    }
})();

const now = Date.now();
const branchName = `script/${now}`;

console.log('hasGit',hasGit)
const commands = [
    ...(hasGit
        ? []
        : [
            'git init',
            'git remote add origin https://github.com/Gitjinfeiyang/test-subtree-subtree.git',
            `git checkout -b ${branchName}`,
        ]),
    'git add .',
    `git commit -m "script: ${now}" -n`,
    'git pull origin main --allow-unrelated-histories',
    `git push origin HEAD:${branchName}`,
];

exec(
    commands.join(' && '),
    {
        cwd: baseRoot,
    },
    (error, stdout, stderr) => {
        if (error) {
            console.error(error);
            console.log('Error:\n', stderr);
        } else {
            console.log(stdout);
            console.log('\n', stderr);
            exec(`rm -r ${baseGit}`);
        }
    },
);
