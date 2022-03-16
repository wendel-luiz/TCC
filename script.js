const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

const params = process.argv.slice(2);
const experiment = params[0];

console.log(experiment);

switch(experiment){
    case 'swarmScale':
        swarmScale();
        break;
    case 'k3sScale':
        k3sScale();
        break;
    case 'k3sRecover':
        k3sRecover();
        break;
    case 'swarmRecover':
        swarmRecover();
        break;
}

async function swarmScale(){
    exec(`docker service update --replicas 32 web_nginx`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
    });
    let running = true;
    let runningTaskCount = [];
    const initDate = Date.now();

    while(running){
        const { stdout, stderr } = await exec('docker service ps web_nginx --format "{{.Name}}: {{.CurrentState}}"')
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        
        let str = stdout.split('\n');
        let runningTasks = 0;
        str.forEach(s => {
            if(s.includes('Running'))
                runningTasks++;
        });
        runningTaskCount.push({time: (Date.now() - initDate) / 1000, taskCount: runningTasks});        
        console.log(runningTaskCount[runningTaskCount.length - 1]);

        if(runningTasks === 32){
            fs.writeFileSync('swarmScale.json', JSON.stringify(runningTaskCount));
            running = false;
        }
    }
}

async function k3sScale(){
    exec(`kubectl scale deployment/web --replicas=31`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
    });

    let runningTaskCount = [];
    const initDate = Date.now();
    let running = true;

    while(running){
        const { stdout, stderr } = await exec('kubectl get deployment web');
        if (stderr) {
            console.log(`error: ${stderr}`);
            return;
        }

        let lines = stdout.split('\n');
        let runningTasks = Number(lines[1].split(' ').filter(e => e !== '')[1].split('/')[0]);
        runningTaskCount.push({time: (Date.now() - initDate) / 1000, taskCount: runningTasks});  
        console.log(runningTaskCount[runningTaskCount.length - 1]);

        if(runningTasks === 31){
            fs.writeFileSync('k3sScale.json', JSON.stringify(runningTaskCount));
            running = false;
        }
    }
}

async function swarmRecover(){
    const { stdout, stderr } = await exec('docker ps');
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }

    let lines = [];
    lines = stdout.split('\n').filter(line => {
        if (!line.includes('CONTAINER'))
            return line;
    });
    
    lines.forEach((line, index) => {
        lines[index] = line.split(/\s/)[0];
    });

    const newCommand = 'docker rm -f ' + lines.join([separator = ' ']);

    exec(newCommand, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
    });

    let running = true;
    let runningTaskCount = [];
    let initDate = {};
    let startCounting = false;
    let lowNumberOfPods = false;

    while(running){
        const { stdout, stderr } = await exec('docker service ps web_nginx --format "{{.Name}}: {{.CurrentState}}"')
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        
        let str = stdout.split('\n');
        let runningTasks = 0;
        str.forEach(s => {
            if(s.includes('Running'))
                runningTasks++;
        });

        if(!startCounting && runningTaskCount < 25){
            startCounting = true;
            initDate = Date.now();
        }

        if(runningTasks < 20){
            lowNumberOfPods = true;
        }

        if(startCounting){
            runningTaskCount.push({time: (Date.now() - initDate) / 1000, taskCount: runningTasks});        
            console.log(runningTaskCount[runningTaskCount.length - 1]);

            if(runningTasks === 25 && lowNumberOfPods){
                fs.writeFileSync('swarmRecover.json', JSON.stringify(runningTaskCount));
                running = false;
            }
        }
    }
};

async function k3sRecover(){
    const { stdout, stderr } = await exec('kubectl get pods -o wide');
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }

    let lines = [];
    lines = stdout.split('\n').filter(line => {
        if (!line.includes('NAME') && line.includes('tinkermaster'))
            return line;
    });
    lines.forEach((line, index) => {
        lines[index] = line.split(/\s/)[0];
    });

    const newCommand = 'kubectl delete pods ' + lines.join([separator = ' ']);

    exec(newCommand, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
    });

    let runningTaskCount = [];
    let initDate = {};
    let running = true;
    let startCounting = false;
    let lowNumberOfPods = false;

    while(running){
        const { stdout, stderr } = await exec('kubectl get deployment web');
        if (stderr) {
            console.log(`error: ${stderr}`);
            return;
        }

        let lines = stdout.split('\n');
        let runningTasks = Number(lines[1].split(' ').filter(e => e !== '')[1].split('/')[0]);

        if(!startCounting && runningTaskCount < 25){
            startCounting = true;
            initDate = Date.now();
        }

        if(runningTasks < 15){
            lowNumberOfPods = true;
        }

        if(startCounting){
            runningTaskCount.push({time: (Date.now() - initDate) / 1000, taskCount: runningTasks});  
            console.log(runningTaskCount[runningTaskCount.length - 1]);

            if(runningTasks === 25 && lowNumberOfPods){
                fs.writeFileSync('k3sRecover.json', JSON.stringify(runningTaskCount));
                running = false;
            }
        }
    }
}