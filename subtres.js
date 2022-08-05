#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const {exec} = require('child_process');

const subtreercPath = path.resolve(process.cwd(),'subtreerc.js');
let subtreeConfig = null;

try{
    subtreeConfig = require(subtreercPath);
}catch(err){
    console.error(err);
    process.exit(1);
}

function execAsync(commands,{
    cwd
}){
    return new Promise((resolve,reject) => {
        exec(
            commands.join(' & '),
            {
                cwd,
            },
            (error, stdout, stderr) => {
                if (error || stderr) {
                    console.error(error || stderr)
                    reject(error || new Error(stderr))
                } else {
                    console.log(stdout)
                    resolve(stdout)
                }
            },
        );
    })
}


function main(){
    subtreeConfig.subtree.forEach(async (subtree) => {
        const subtreeRoot = path.resolve(process.cwd(),subtree.path);
        const subtreeGitConfig = path.resolve(subtreeRoot, '.git');
        const projectName = (await execAsync(['basename `git rev-parse --show-toplevel`'],{cwd:process.cwd()})).replace('\n','');
        const mainProjectBranchName = await execAsync(['git symbolic-ref --short HEAD'],{cwd:process.cwd()});
        const branchName = `${projectName}/${mainProjectBranchName.replace('/','-').replace('\n','')}`
        const hasGit = (() => {
            try {
                return fs.statSync(subtreeGitConfig).isDirectory();
            } catch (error) {
                return false;
            }
        })();

        if(hasGit){
            // 添加远程仓库，切到开发分支
            await execAsync([
                'git init',
                `git remote add origin ${subtree.remote}`,
                'git fetch'
            ],{cwd:subtreeRoot})
        }
        
        // 切分支
        try{
            await execAsync([
                `git checkout -b ${branchName}`,
            ],{cwd:subtreeRoot})
        }catch(err){
            // 已存在
            console.log(err)
        }

        await execAsync([
            'git add .',
        ],{cwd:subtreeRoot})

        const hasNoCommitFile = await execAsync(['git status -s'],{cwd:subtreeRoot})
        if(Boolean(hasNoCommitFile)){
            console.log('提交代码')
            // 有未提交文件
            await execAsync([
                `git commit -m "feat: ${branchName}" -n`,
            ],{cwd:subtreeRoot})
        }

        // 检查是否落后master分支
        const revResult = await execAsync(['git rev-list --left-right --count origin/master...@ | cut -f1'],{cwd:subtreeRoot})
        if(revResult > 0){
            console.log('========== subtree落后主分支，尝试同步最新代码 ===========')
            // 尝试同步最新代码
            try{
                await execAsync(['git pull origin master --allow-unrelated-histories'],{cwd:subtreeRoot})
            }catch(err){
                console.error('========== subtree落后主分支，请同步最新代码 ===========')
            }
        } else {
            console.log('========== subtree代码已同步最新 ===========')
        }

        // // 推送到远程仓库
        // await execAsync([`git push origin HEAD:${branchName}`],{cwd:subtreeRoot})

        await execAsync([`rm -r ${subtreeGitConfig}`],{cwd:subtreeRoot});
    })
}

main()