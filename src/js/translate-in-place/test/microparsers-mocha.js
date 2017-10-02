/**
 * Depending on the key name, certain chcs data values can be strings or objects that must be further parsed.
 * The functions that parse them have been nicknamed microparsers. Usually a regular expression is enough. But not always.
 *
 */

var assert = require('assert');
var chai = require('chai');
var _ = require('underscore');
var chcs = require('../../translate/chcs');


// http://chaijs.com/api/bdd/

describe('microparser', function() {

    it('is obsolete!', function () {
        console.error("\nTHE TRANSLATE-IN-PLACE TRANSLATORS ARE OBSOLETE.  DO NOT USE!\n");
        console.error("\nTHESE TRANSLATORS WERE RETAINED FOR REFERENCE PURPOSES ONLY.\n");
    });

    describe.skip('for names', function() {

        it.skip('should always have a {{last}}, {{first}}', function () {
            var result;
            chai.expect(function() { result = chcs.chcsPatientName('bunny, bugs'); }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('object');
            chai.expect(result).to.have.property('last');
            chai.expect(result).to.have.property('first');
            chai.expect(result.last).to.equal('bunny');
            chai.expect(result.first).to.equal('bugs');
            // result.first.should.equal('bugs'); // TODO: why not?
            chai.expect(result).to.not.have.property('mi');
            chai.expect(result).to.not.have.property('title');
        });

        it.skip('can have a middle initial {{last}}, {{first}} {{mi}}', function () {
            var result;
            chai.expect(function() { result = chcs.chcsPatientName('l, f m'); }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('object');
            chai.expect(result).to.have.property('last');
            chai.expect(result).to.have.property('first');
            chai.expect(result).to.have.property('mi');
            chai.expect(result.last).to.equal('l');
            chai.expect(result.first).to.equal('f');
            chai.expect(result.mi).to.equal('m');
            chai.expect(result).to.not.have.property('title');
        });

        it.skip('can have a title if it has a middle initial {{last}}, {{first}} {{mi}} {{title}}', function () {
            var result;
            chai.expect(function() { result = chcs.chcsPatientName('l, f m title'); }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('object');
            chai.expect(result).to.have.property('last');
            chai.expect(result).to.have.property('first');
            chai.expect(result).to.have.property('mi');
            chai.expect(result).to.have.property('title');
            chai.expect(result.last).to.equal('l');
            chai.expect(result.first).to.equal('f');
            chai.expect(result.mi).to.equal('m');
            chai.expect(result.title).to.equal('title');
        });

        it.skip('throws an error if last name is missing ", {{first}}"', function () {
            var name = ', bunny'; // missing last name
            chai.expect(function() { chcs.chcsPatientName(name); }).to.throw(Error, /last name/);
        });

        it.skip('throws an error if first is missing (no comma) "{{last}},"', function () {
            var name = 'bugs,'; // missing first name
            chai.expect(function() { chcs.chcsPatientName(name); }).to.throw(Error, /first name/);
        });

        it.skip('throws an error if missing comma', function () {
            var name = 'bunch o last names'; // missing comman
            chai.expect(function() { chcs.chcsPatientName(name); }).to.throw(Error, /first name/); // misleading
        });


        // more esoteric tests
        it.skip('whitespace surrounding comma does not matter "{{last}}    , {{first}}"', function () {
            var result;
            name = "bunny   \t,\t\t   bugs";
            chai.expect(function() {
                result = chcs.chcsPatientName(name);
            }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('object');
            chai.expect(result).to.have.property('last');
            chai.expect(result).to.have.property('first');
            chai.expect(result.last).to.equal('bunny');
            chai.expect(result.first).to.equal('bugs');
            chai.expect(result).to.not.have.property('mi');
            chai.expect(result).to.not.have.property('title');
        });

        it.skip('last name can contain whitespace', function () {
            var result;
            name = "happy  little  bunny, bugs";  // two spaces apiece
            chai.expect(function() {
                result = chcs.chcsPatientName(name);
            }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('object');
            chai.expect(result).to.have.property('last');
            chai.expect(result).to.have.property('first');
            chai.expect(result.last).to.equal('happy  little  bunny');
            chai.expect(result.first).to.equal('bugs');
            chai.expect(result).to.not.have.property('mi');
            chai.expect(result).to.not.have.property('title');
        });

        it.skip('will remove leading whitespace', function () {
            var result;
            var last = '   last name three leading spaces';
            var first = 'first0';
            name = last + ',' + first;
            chai.expect(function() {
                result = chcs.chcsPatientName(name);
            }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('object');
            chai.expect(result).to.have.property('last');
            chai.expect(result).to.have.property('first');
            chai.expect(result.last).to.equal(last.trim());
            chai.expect(result.first).to.equal(first);
            chai.expect(result).to.not.have.property('mi');
            chai.expect(result).to.not.have.property('title');
        });



        // dates
        describe.skip('for dates', function () {
            it.skip('will parse a date', function() {
                var result;
                var year = '1809'; var month = '02'; day = '12'; // abe lincoln
                var aDate = year + '-' + month + '-' + day;
                chai.expect(function() {
                    result = chcs.chcsDate(aDate);
                }).to.not.throw(Error);
                chai.expect(result).not.to.be.null;
                chai.expect(result).to.be.an('object');
                chai.expect(result).to.have.property('year');
                chai.expect(result).to.have.property('month');
                chai.expect(result).to.have.property('day');

                chai.expect(result.year).equals(year);
                chai.expect(result.month).equals(month);
                chai.expect(result.day).equals(day);
            });

            it.skip('will parse a short date', function() {
                var result;
                var year = '09'; var month = '02'; day = '12'; // abe + 100y
                var aDate = year + '-' + month + '-' + day;
                chai.expect(function() {
                    result = chcs.chcsDate(aDate);
                }).to.not.throw(Error);
                chai.expect(result).not.to.be.null;
                chai.expect(result).to.be.an('object');
                chai.expect(result).to.have.property('year');
                chai.expect(result).to.have.property('month');
                chai.expect(result).to.have.property('day');

                chai.expect(result.year).equals('19' + year); // add 19 on automatically
                chai.expect(result.month).equals(month);
                chai.expect(result.day).equals(day);
            });

            // misformed input year
            it.skip('will not parse a bad year', function() {
                var result;
                var year = '9'; var month = '02'; day = '12'; // abe + 100y
                var a_date = year + '-' + month + '-' + day;
            });

            // misformed input month
            it.skip('will not parse a bad month', function() {
                var result;
                var year = '1809'; var month = '2'; day = '12'; // abe
                var aDate = year + '-' + month + '-' + day;
                try {
                    result = chcs.chcsDate(aDate);  // should throw
                    chai.assert(false, "expected a throw");
                } catch(e) {
                    chai.expect(e).to.match(/Bad chcs date/);
                }
            });

            // misformed input day
            it.skip('will not parse a bad day', function() {
                var result;
                var year = '9'; var month = '02'; day = '120'; // abe + 100y
                var a_date = year + '-' + month + '-' + day;
                chai.expect(function() { chcs.chcsDate(a_date); }).to.throw(Error, /Bad chcs date/);
            });


        });

    });
});


