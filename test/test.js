const assert = require('assert');
const { expect } = require('chai');
const { objectDiff } = require('../src/diff');

describe('diff', function() {
  describe('objectDiff', function() {

    it("both empty", function() {
      expect(objectDiff({}, {}, [])).to.eql([])
    })

    it("a has 1 extra key", function() {
      expect(objectDiff({ a: 1 }, {}, [])).to.eql([
        {
          type: 'delete',
          path: [ 'a' ]
        }
      ])
    })

    it("b has 1 extra key", function() {
      expect(objectDiff({}, { a: 1 }, [])).to.eql([
        {
          type: 'add',
          path: [ 'a' ],
          value: 1,
        }
      ])
    })

    it("add and delete", function() {
      expect(objectDiff({ a: 1 }, { b: 2 }, [])).to.eql([
        {
          type: 'delete',
          path: [ 'a' ],
        },
        {
          type: 'add',
          path: [ 'b' ],
          value: 2
        },
      ]);
    })

    it("numerical value changed", function() {
      expect(objectDiff({ a: 1 }, { a: 2 }, [])).to.eql([
        {
          type: 'change',
          path: [ 'a' ],
          value: 2,
        }
      ])
    })

    it("boolean value changed", function() {
      expect(objectDiff({ a: true }, { a: false }, [])).to.eql([
        {
          type: 'change',
          path: [ 'a' ],
          value: false,
        }
      ])
    })

    //it("string value changed", function() {
    //  expect(objectDiff({ a: 'a' }, { a: 'b' }, [])).to.eql([
    //    {
    //      type: 'change',
    //      path: [ 'a' ],
    //      value: 'b',
    //    }
    //  ])
    //})

    // TODO: different types
  });
});
