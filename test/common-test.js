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

    cmdFileNonexistent: function(cmd, file, done) {
        exec(cmd, function (error, stdout, stderr) {
             error.code.should.equal(1);
             stderr.should.contain("File " + file + " does not exist!");
             done();
        });
    },

    cmdFileUnreadable: function(cmd, file, done) {
        fs.writeFileSync(file, '{}', {mode: 0});
        exec(cmd, function (error, stdout, stderr) {
            error.code.should.equal(1);
            stderr.should.contain("File " + file + " is not readable!");
            fs.unlinkSync(file);
            done();
        });
    },

    unlinkDir: function(path) { 
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function(file, index) {
                var filePath = path + "/" + file;
                if (fs.lstatSync(filePath).isDirectory()) {
                    module.exports.unlinkDir(filePath);
                } else {
                    fs.unlinkSync(filePath);
                }
            });

            fs.rmdirSync(path);
        }
    },

    verifyExecutable: function(path) { 

        var mode = fs.statSync(path).mode;

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

