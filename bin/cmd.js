#!/usr/bin/env node
const fs = require('fs');
var request = require('sync-request');
const chalk = require('chalk');
const util = require('util');
const format = require('string-format')
var program = require('commander');
var namedRegexp = require("named-js-regexp");

var context = {}
program
  .option('-s, --server <url>', 'server endpoints')
  .option('-f, --file <path>', 'path of the test file')
  .option('-l, --line <line_number>', 'It will execute that number only.')
  .parse(process.argv);

//program.server = "simplestore1.herokuapp.com"
//program.file = "./sample.txt"
//program.line = 4;

if (program.server){
    //console.log("Server:"+program.server);
    context.server = program.server;
} else{
    console.log("You must pass a URL: (node index.js -s google.com -f ./sample.txt )");
    return;
}
if(program.file){
    //console.log("File:" + program.file);
    context.file = program.file;
} else{
    console.log("You must pass a filepath: (node index.js -s google.com -f ./sample.txt )");
    return;
}


function build_test_from_line(line, i){
    try{
        var tc ={}
        if(line[0] === '!'){
            tc['isSetup'] = true;
            line = line.substring(1, line.length);
        }

        tokens = line.split("=>");
    
        tc['line'] = i+1;
        tc['method'] = tokens[0].trim()
        tc['url'] = tokens[1].trim()
        if(tc['method'] === 'GET'){
            tc['expected'] = tokens[2].trim()
        } else if(tc['method'] === 'POST'){
            tc['data'] = tokens[2].trim()
            tc['expected'] = tokens[3].trim()
        } else{
            console.log(chalk.blue(util.format('[ERROR/%s] Invalid Method found :%s', i, line)));
        }
        return tc
    }
    catch(e){
        console.log(chalk.blue(util.format('[ERROR/%s] Invalid testcase:%s', i, line)));
        console.log(e);
    }
}

var contents = fs.readFileSync(context.file, 'utf8');

var testcase = []

var lines = contents.split("\n");
if(program.line){
    // Execute only line that line:
    console.log("Executing a only line:"+program.line)
    program.line = parseInt(program.line) -1;;
    if(program.line>=lines.length){
        console.log("Invalid number, The line nunber should be <= "+lines.length)
        return;
    }
    testcase.push(build_test_from_line(lines[program.line], program.line));
    console.log(testcase);
} else {
    for(var i =0;i<lines.length;i++){
        line = lines[i]
        if(line.trim().length == 0){
            continue;
        }
        if(line[0] === '#'){
            continue;
        }
        testcase.push(build_test_from_line(line, i));
    }
}


//console.log("[Info] Total tastcase : "+testcase.length)
var pass_count = 0;
var fail_count = 0;
//console.log("[INFO] Executing...");

for(tc of testcase){
    var jsondata = ''
    try{
        if(tc.data != undefined){
            // TODO : THIS IS A BUG AS THE CONTEXT IS NOT GETTING ADDED in BODY.
            let final_data = tc.data; // format(tc.data, context); 
            jsondata= JSON.parse(final_data)
        }
    } catch(e){
        console.log(chalk.blue(util.format('[ERROR/%s] Invalid json payload:%s',tc.line, tc.data)));
        jsondata = tc.data;
    }
    try{
        let final_url = format(tc.url, context);
        console.log(chalk.hex('#454545')(util.format("\n[TEST/%s] Executing: %s",tc.line, final_url)));
        var res = request(tc.method,final_url , {
            json:jsondata
        });

        if(res.statusCode != 200){
            console.log(chalk.red(util.format('[ERROR/%s] Error as res.statusCode :%s', tc.line, res.statusCode)));
            fail_count++;
            continue;
        }

        var resStr = res.getBody('utf8');
        var matched ;
        try{
            matched = new namedRegexp(tc['expected']).exec(resStr);
        }
        catch(e){
            console.log(chalk.red(util.format("[INFO/%s] Invalid Reg Exp(marked failed): \n Invalid here: %s \n Trying to match: %s",tc.line, tc['expected'], resStr)));
            fail_count++;
            continue;
        }

        if(matched == null) {
            console.log(chalk.red(util.format('[ERROR/%s] Output and Expected different:\nUrl:%s\nExpected: %s\nOutput:%s', tc.line,final_url,tc['expected'],resStr )));
            fail_count++;
            continue;
        }
        if(tc.isSetup != true){
            console.log(chalk.green(util.format('[INFO/%s] Test passed',tc.line)));
            pass_count++;
        } else{
            console.log(chalk.blue(util.format('[INFO/%s] Setup request Success',tc.line)));
        }

        // Try Capture Context which will be used lateron.
        if(matched.groups() != null && Object.keys(matched.groups()).length > 0){
            Object.assign(context, matched.groups());
            console.log(chalk.blue(util.format("[INFO/%s] Updated context: %o",tc.line, matched.groups())));
        }
    } catch(e){
        fail_count++;
        console.log(chalk.blue(util.format('[ERROR/%s] Test INFRA Exception: %s', tc.line, e)));
    }
}

let result = util.format("\n\n\
=======================================================\n\
                        SUMMARY                        \n\
=======================================================\n\
Pass Count: %s\n\
Fail Count: %s\n\
Total TC: %s\n\
Pass Percentage: %s\%\n\
=======================================================\
",pass_count, fail_count, pass_count+fail_count, (pass_count*100/(pass_count+fail_count)))
if(fail_count == 0){
    console.log(chalk.green(result));
} else{
    console.log(chalk.red(result));
}

