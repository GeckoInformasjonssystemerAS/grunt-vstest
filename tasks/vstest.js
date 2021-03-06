/*
* grunt-vstest
*
* Inspired by https://github.com/mrjackdavis/grunt-mstest
*
* Copyright (c) 2014 Steinar Herland, Gecko Informasjonsystemer AS
* Licensed under the MIT license.
*/

'use strict';
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
var path = require('path');
var fs = require('fs');
var eol = require('os').EOL;

module.exports = function(grunt) {

// Please see the Grunt documentation for more information regarding task
// creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('vstest', 'Run tests using the Visual Studio test runner via Grunt', function() {

        var done = this.async();

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            vstestPath: getExePath(),
            force:false
        });

        function gruntWarn(str){
            if(options.force)
                grunt.log.write(str);
            else
                grunt.fail.warn(str);
        }

        var args = [];

        this.filesSrc.map(function(filePath){
            args.push(filePath);
        });

    	//See http://msdn.microsoft.com/en-us/library/jj155796.aspx for command line description

        if (options.settings) {
        	args.push("/Settings:" + options.settings);
        }

        if (options.inIsolation) {
			args.push("/InIsolation");
		}

		if (options.platform) {
			args.push("/Platform:" + options.platform);
		}

		if (options.framework) {
			args.push("/Framework:" + options.framework); //Valid values are Framework35, Framework40 and Framework45.
		}

		if (options.testCaseFilter) {
			args.push("/TestCaseFilter:" + options.testCaseFilter);
		}

        if (options.logger) {
            args.push("/Logger:" + options.logger);
        }

        var process = spawn(options.vstestPath,args);

	    process.stdout.on('data', function (data) {
			var lines = data.toString().split(eol);
			
			lines.forEach(function(line) {
				if(line.startsWith("Passed ")) {
					grunt.verbose.writeln(line);
					grunt.log.notverbose.write(grunt.log.wordlist(["."], { color: "green" }));
				} else if(line.startsWith("Skipped ")) {
					grunt.verbose.writeln(line);
					grunt.log.notverbose.write(grunt.log.wordlist(["."], { color: "yellow" }));
				} else if(line.startsWith("Failed ")) {
					grunt.log.error(eol + line);
				} else if(line) {
					grunt.log.writeln(line);
				}
			})
        });
	    process.stderr.on('data', function (data) {
	        grunt.log.error(data);
        });

	    process.on('exit', function (code) {
            if (code !== 0) {
                gruntWarn('Some tests have failed');
            }
            done();
        });
    });

    function inferVstestViaVSWhere() {
        grunt.verbose.writeln('Using vswhere.exe to infer location of vstest.console.exe');
        var result = execSync(path.resolve(__dirname, '../bin/vswhere.exe -latest -requires Microsoft.Component.MSBuild')).toString();
        grunt.verbose.write(result);
        var regex = new RegExp('[\n\r].*installationPath:\s*([^\n\r]*)');
        var matches = result.match(regex);
        grunt.verbose.write(matches);
        if(!matches) return null;

        var foundPath = matches[1].trim() + '/Common7/IDE/CommonExtensions/Microsoft/TestWindow/vstest.console.exe';
        grunt.verbose.write('using ' + foundPath);
        return path.normalize(foundPath);
    }
 
    function getExePath() {
        //Get highest priority VS tools
        var vsTools = inferVstestViaVSWhere();
        
        if(vsTools) return vsTools;


        //Possible env variables for visual studio tools, in reverse order of priority
        var vsToolsArr = [process.env.VS100COMNTOOLS,process.env.VS110COMNTOOLS,process.env.VS120COMNTOOLS,process.env.VS140COMNTOOLS]

        
        for (var i = vsToolsArr.length - 1; i >= 0; i--) {
            var item = vsToolsArr[i]
            if(item && item != ""){
                vsTools = item;
                break;
            }
        };

        if(!vsTools)
            grunt.fatal("Visual studio tools not installed")

    	//var exePath = path.join(vsTools, "../IDE", 'MSTest.exe');
    	var exePath = path.join(vsTools, "../IDE/CommonExtensions/Microsoft/TestWindow", 'vstest.console.exe');
        

        if (!fs.existsSync(exePath)) {
        	grunt.fatal('Unable to find vstest.console.exe executable at ' + exePath + " use the option 'vstestPath' to override");
        }

        return exePath;
    }

    function escapeShell(cmd) {
      return '"'+cmd+'"';
    };
};


