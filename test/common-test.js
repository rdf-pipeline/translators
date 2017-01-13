/**
 * File: common-test.js
 * Unit test helper module
 */

var _ = require('underscore');

var chai = require('chai');
var should = chai.should();
var expect = chai.expect;

var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');

module.exports = {

    /**
     * Test that a command line tool has  graceful error handling for a non-existent file
     *
     * @param cmdline command line that will access the file
     * @param filepath filepath that should not exist; this filepath should be referenced
     *        by the command line
     * @param done callback to use when test completes 
     */
    fileNotExistHandling: function(cmdline, filepath, done) {
        exec(cmdline, function (error, stdout, stderr) {
             error.code.should.equal(1);
             stderr.should.contain("File " + filepath + " does not exist!");
             done();
        });
    },

    /**
     * Test that a command line tool has  graceful error handling for an inaccessible file
     *
     * @param cmdline command line that will access the file
     * @param filepath filepath that should not exist; this filepath should be referenced
     *        by the command line
     * @param done callback to use when test completes 
     */
    fileInAccessHandling: function(cmdline, filepath, done) {
        fs.writeFileSync(filepath, '{}', {mode: 0}); // create file with no access permissions
        exec(cmdline, function (error, stdout, stderr) {
            error.code.should.equal(1);
            stderr.should.contain("File " + filepath + " is not readable!");
            fs.unlinkSync(filepath);  // unlink the file to clean up
            done();
        });
    },

    /**
     * Unlink the specified directory, first removing any child files or subdirectories 
     * if the path is for a directory.
     * 
     * @param dirpath path to the directory to be deleted.
     */
    unlinkDir: function(dirpath) { 
        if (fs.existsSync(dirpath)) {
            if (fs.lstatSync(dirpath).isDirectory()) {
                fs.readdirSync(dirpath).forEach(function(file, index) {
                    var filepath = dirpath + "/" + file;
                    if (fs.lstatSync(filepath).isDirectory()) {
                        // file is really a subdir - unlink it and its children before proceeding
                        module.exports.unlinkDir(filepath);
                    } else {
                        fs.unlinkSync(filepath);
                    }
                });
               
                fs.rmdirSync(dirpath);
            } else { 
                throw Error(dirpath + " is not a directory."); 
            }
        }
    },

    /**
     * Verify that the specified file is executable
     * 
     * @param filepath filepath to test for execute access
     */
    verifyExecutable: function(filepath) { 

        filepath.should.exist;

        var mode = fs.statSync(filepath).mode;

        var owner = mode >> 6;
        var group = (mode << 3) >> 6;
        var others = (mode << 6) >> 6;

        var permissions = {
            read: {
                owner: !!(owner & 4),
                group: !!(group & 4),
                others: !!(others & 4)
            },
            execute: {
                owner: !!(owner & 1),
                group: !!(group & 1),
                others: !!(others & 1)
            }
        };

        permissions.read.owner.should.be.true;
        permissions.read.group.should.be.true;
        permissions.read.others.should.be.true;

        permissions.execute.owner.should.be.true;
        permissions.execute.group.should.be.true;
        permissions.execute.others.should.be.true;
    }
}

