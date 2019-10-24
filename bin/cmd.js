#!/usr/bin/env node
const fs = require('fs');
var request = require('sync-request');
const chalk = require('chalk');
const util = require('util');
const format = require('string-format')
var program = require('commander');
var namedRegexp = require("named-js-regexp");
const { render } = require('micromustache')

var context = {}
program
  .option('-s, --server <url>', 'server endpoints')
  .option('-f, --file <path>', 'path of the test file')
  .option('-l, --line <line_number>', 'It will execute that number only.')
  .parse(process.argv);

program.server = "simplestore.dipankar.co.in"
program.file = "./sample.txt"
program.line = 5;

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
    var tc ={}
    tc['line'] = i+1;
    try{
        if(line[0] === '!'){
            tc['type'] = 'setup';
            line = line.substring(1, line.length);
        } else if(line[0] === '$'){
            tc['type'] = 'context';
            line = line.substring(1, line.length);
            tokens=line.split("=>");
            if(tokens.length != 2){
                console.log(chalk.blue(util.format('[ERROR/%s] YOU ARE SEEING CONTEXT IN WRONG WAY: :%s', i, line)));
            }
            tc['context'] ={}
            tc['context'][tokens[0].trim()] = [tokens[1].trim()]
            return tc;
        } else {
            tc['type'] = 'tc';
        }

        tokens = line.split("=>");
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
    }
    catch(e){
        console.log(chalk.red(util.format('[ERROR/%s] Invalid testcase:%s', i, line)));
        console.log(e);
    }
    if(tc.method == "POST" && ( !tc.data || !tc.expected)){
        console.log(chalk.red(util.format('[ERROR/%s] YOU ARE MISSING POST DATA:%s', i, line)));
    }
    return tc;
}

var contents = fs.readFileSync(context.file, 'utf8');

var testcase = []

var lines = contents.split("\n");
var lineIdx = 0;
if(program.line){
    // Execute from that line.s
    console.log("Executing from Line: :"+program.line)
    lineIdx = parseInt(program.line) -1;
} 

for(;lineIdx<lines.length;lineIdx++){
    line = lines[lineIdx]
    if(line.trim().length == 0){
        continue;
    }
    if(line[0] === '#'){
        continue;
    }
    testcase.push(build_test_from_line(line, lineIdx));
}


//console.log("[Info] Total tastcase : "+testcase.length)
var pass_count = 0;
var fail_count = 0;
//console.log("[INFO] Executing...");

for(tc of testcase){

    // if testcase type is context.
    if(tc.type == 'context'){
        console.log(chalk.green(util.format('[INFO/%s] Set Context %o',tc.line, tc.context)));
        Object.assign(context, tc.context);
        continue
    }

    try{
        if(tc.data){
            tc.data = render(tc.data, context);
            tc.data= JSON.parse(tc.data)
        }
    } catch(e){
        console.log(e);
        console.log(chalk.blue(util.format('[ERROR/%s] Invalid json payload:%s',tc.line, tc.data)));
    }
    try{
        tc.url = render(tc.url, context);
        console.log(chalk.hex('#454545')(util.format("\n[TEST/%s] Executing: %s",tc.line, tc.url)));
        //console.log(tc)

        var res = request(tc.method,tc.url , {
            json:tc.data
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
            console.log(chalk.red(util.format('[ERROR/%s] Output and Expected different:\nUrl:%s\nExpected: %s\nOutput:%s', tc.line,tc.url,tc['expected'],resStr )));
            fail_count++;
            continue;
        }
        if(tc.type === 'setup'){
            console.log(chalk.green(util.format('[INFO/%s] Test passed',tc.line)));
            pass_count++;
        } else{
            console.log(chalk.blue(util.format('[INFO/%s] Setup request Success',tc.line)));
        }

        // Try Capture Context which will be used lateron.
        if(matched.groups() != null && Object.keys(matched.groups()).length > 0){
            Object.assign(context, matched.groups());
            console.log(chalk.blue(util.format("[INFO/%s] Updated context: %o",tc.line, matched.groups())));
            console.log(chalk.blue(util.format("[INFO/%s] New context: %o",tc.line, context)));
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

