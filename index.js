const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const csv = require("csvtojson");
const {Parser} = require("json2csv");
const { exit } = require('process');

const [url, file] = process.argv.slice(2);

if (!url) {
    throw 'Please provide a URL as the first argument.';
}

async function run() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForSelector('.easy-card-list');

    const boardTitle = await page.$eval('.board-name', (node) => node.innerText.trim());
    let boardTitle2 = boardTitle.split(" ").join("");
    console.log(boardTitle2)

    if (!boardTitle) {
        throw 'Board title does not exist. Please check if provided URL is correct.'
    }

    let parsedText = boardTitle + '\n\n';

    const columns = await page.$$('.easy-card-list');

    for (let i = 0; i < columns.length; i++) {
        const columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());

        const messages = await columns[i].$$('.easy-board-front');
        if (messages.length) {
            parsedText += columnTitle + '\n';
        }
        for (let i = 0; i < messages.length; i++) {
            const messageText = await messages[i].$eval('.easy-card-main .easy-card-main-content .text', (node) => node.innerText.trim());
            const votes = await messages[i].$eval('.easy-card-votes-container .easy-badge-votes', (node) => node.innerText.trim());

            // Only content with at least 1 vote should be included in the file output
            if(votes < 1) {
                continue
            }

            parsedText += `- ${messageText} (${votes})` + '\n';
        }

        if (messages.length) {
            parsedText += '\n';
        }
    }

    return parsedText;
}

function writeToFile(filePath, data) {
    
    // The file name should be the title of the board without spaces.
    // Didn't work w/ Regex .replace("/\s/g", "")
    // Used .split() and .join(): ["Malwarebytes", "Sprint", "21", "Retrospective"]=>MalwarebytesSprint21Retrospective
    fileName = data.split('\n')[0]
    newFilename = fileName.split(" ").join("")
    console.log(newFilename)

    raw = data.split('\n')
    console.log( "new: " + raw)
    result = []

    for(let i=0; i<raw.length; i++){
        result.push(raw[i]);
    }

    let count = 0;

    for(let j=2; j<result.length; j++){
        if(result[j] != ""){
            count += 1;
        }
        if(result[j] == "Start"){
            result[j] = "Column 1";
        }
    }
    console.log(result);
    /* Output
        [
            'Malwarebytes Sprint 21 Retrospective',
            '',
            'Column 1',
            '- Mario - Hire our next team member based on an excellent interview and completion of the technical challenge. (2)',
            '- Mario - Telling the engineering manager as soon as you realize a story will not be finished by the end of the sprint. (1)',
            '',
            'Column 2',
            '',
            'Column 3',
            '- Tony - Conducting a survey of the team about each new hire around their 30th day. (1)',
            '- Spyro - Emphasizing to new hires how we use Slack by referring to our very short document in Confluence. (2)',
            '',
            ''
        ]
    */



        

    let row = 1;
    let col = 1;
    for(let k=3; k<=count+3; k++){
        if(result[k] == "Stop"){
            result[k] = "Column 2";
        }
        if(result[k] == "Continue"){
            result[k] = "Column 3";
        }
        // Logic for file structure, Row 1 Column 1
        // if(result[k] != ""){
        //     if(result[k] == "Column 2" || "Column 3"){
        //         col +=1;
        //         continue
        //     }
        //     else {
        //         result[k] = `${result[k]} Column ${col} Row ${row}`
        //         row ++;
        //     }
        // }
    }
    console.log(result);

    // The output file should have an extension of .csv
    const resolvedPath = path.resolve(filePath || `./${newFilename}.csv`);
    fs.writeFile(resolvedPath, data, (error) => {
        if (error) {
            throw error;
        } else {
            console.log(`Successfully written to file at: ${resolvedPath}`);
        }
        process.exit();
    });
}

function handleError(error) {
    console.error(`Error: ${error}`);
}

run().then((data) => writeToFile(file, data)).catch(handleError);