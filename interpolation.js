const { linearInterpolation } = require("simple-linear-interpolation");

const data = [{"time":0,"taskCount":25},{"time":3.588,"taskCount":24},{"time":6.684,"taskCount":24},{"time":10.789,"taskCount":21},{"time":15.29,"taskCount":18},{"time":19.931,"taskCount":18},{"time":22.657,"taskCount":16},{"time":25.308,"taskCount":16},{"time":27.671,"taskCount":16},{"time":31.25,"taskCount":17},{"time":33.686,"taskCount":20},{"time":35.799,"taskCount":21},{"time":37.694,"taskCount":25}]
const maxTime = 41;
const maxCount = 25;
let roundedData = [];
let finalData = [];

for(let i = 0; i < maxTime; i++){
    const reading = data.filter(d => Math.round(d.time) === i);
    console.log(reading)
    if(reading.length > 0)
        roundedData.push({x: Math.round(reading[reading.length -1].time), y: reading[reading.length -1].taskCount});
    else
        if(i >= Math.round(data[data.length -1].time))
            roundedData.push({x: i, y: maxCount});
}

const calculate = linearInterpolation(roundedData);

for(let i = 0; i < maxTime; i++){
    const reading = roundedData.find(d => Math.round(d.time) === i);

    if(reading)
        finalData.push(reading);
    else
        finalData.push({x: i, y: Math.round(calculate({x: i}))});
}

finalData.forEach(d => console.log(d.y));