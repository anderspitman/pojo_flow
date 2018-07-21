const assert = require('assert');
const { expect } = require('chai');
const { buildUpdateSchema } = require('../src/server');
const { applyUpdate } = require('../src/common');


describe('buildUpdateSchema', function() {
  describe('no changes', function() {

    it("both empty", function() {
      expect(buildUpdateSchema({}, {})).to.eql({})
    })

    it("simple value", function() {
      expect(buildUpdateSchema({ x: 1 }, { x: 1 })).to.eql({})
    })

    it("array value", function() {
      expect(buildUpdateSchema({ x: [1] }, { x: [1] })).to.eql({})
    })

    it("array multiple values", function() {
      expect(buildUpdateSchema({ x: [1, 2] }, { x: [1, 2] })).to.eql({})
    })

    it("simple nested", function() {
      expect(buildUpdateSchema({ x: { y: 1 } }, { x: { y: 1 } })).to.eql({})
    })
  })

  describe('simple', function() {

    it("both empty", function() {
      expect(buildUpdateSchema({}, {})).to.eql({})
    })

    it("add", function() {
      expect(buildUpdateSchema({}, { x: 2 })).to.eql({ x: 2 })
    })

    it("edit", function() {
      expect(buildUpdateSchema({ x: 1 }, { x: 2 })).to.eql({ x: 2 })
    })

    it("delete", function() {
      expect(buildUpdateSchema({ x: 1 }, {})).to.eql({ x: null })
    })
  })

  describe('siblings not affected', function() {

    it("add", function() {
      expect(buildUpdateSchema({ x: 1 }, { x: 1, y: 1 }))
        .to.eql({ y: 1 })
    })

    it("edit", function() {
      expect(buildUpdateSchema({ x: 1 }, { x: 2, y: 1 }))
        .to.eql({ x: 2, y: 1 })
    })

    it("delete", function() {
      expect(buildUpdateSchema({ x: 1, y: 2 }, { x: 1 }))
        .to.eql({ y: null })
    })
  })

  describe('arrays', function() {

    it("add empty", function() {
      expect(buildUpdateSchema({}, { x: [] })).to.eql({ x: [] })
    })

    it("add with value", function() {
      expect(buildUpdateSchema({}, { x: [1] })).to.eql({ x: [1] })
    })

    it("add with multiple values", function() {
      expect(buildUpdateSchema({}, { x: [1, 2] })).to.eql({ x: [1, 2] })
    })

    // TODO: watch out for this
    it("edit", function() {
      expect(buildUpdateSchema({ x: [1] }, { x: [2] }))
        .to.eql({ x: { 0: 2 } })
    })

    it("delete empty", function() {
      expect(buildUpdateSchema({ x: [] }, {})).to.eql({ x: null })
    })

    it("delete with value", function() {
      expect(buildUpdateSchema({ x: [1] }, {})).to.eql({ x: null })
    })

    it("delete value", function() {
      expect(buildUpdateSchema({ x: [1] }, { x: [] }))
        .to.eql({ x: { 0: null } })
    })
  })

  describe('nested', function() {

    it("add empty", function() {
      expect(buildUpdateSchema({}, { x: {} })).to.eql({ x: {} })
    })

    it("add with value", function() {
      expect(buildUpdateSchema({}, { x: { y: 1 } })).to.eql({ x: { y: 1 } })
    })

    it("add inner value", function() {
      expect(buildUpdateSchema({ x: { y: 1 } }, { x: { y: 1 , z: 2 } }))
        .to.eql({ x: { z: 2 } })
    })

    it("delete inner", function() {
      expect(buildUpdateSchema({ x: { y: 1 } }, { x: {} }))
        .to.eql({ x: { y: null } })
    })

    it("delete outer", function() {
      expect(buildUpdateSchema({ x: { y: 1 } }, {}))
        .to.eql({ x: null })
    })
  })
})


describe('applyUpdate', function() {
  describe("simple", function() {
    it("add", function() {
      expect(applyUpdate({ x: 1 }, {})).to.eql({ x: 1 })
    })

    it("edit", function() {
      expect(applyUpdate({ x: 1 }, { x: 2 })).to.eql({ x: 1 })
    })

    it("delete", function() {
      expect(applyUpdate({ x: null }, { x: 2 })).to.eql({})
    })
  })

  describe("nested", function() {
    it("add", function() {
      expect(applyUpdate({ x: { y: 1 } }, {})).to.eql({ x: { y: 1 } })
    })

    it("edit", function() {
      expect(applyUpdate({ x: { y: 2 } }, { x: { y: 1 } }))
        .to.eql({ x: { y: 2 } })
    })

    it("delete inner", function() {
      expect(applyUpdate({ x: { y: null } }, { x: { y: 1 } }))
        .to.eql({ x: {} })
    })

    it("delete outer", function() {
      expect(applyUpdate({ x: null }, { x: { y: 1 } })).to.eql({})
    })
  })

  describe("arrays", function() {
    it("add", function() {
      expect(applyUpdate({ x: [1] }, {})).to.eql({ x: [1] })
    })

    // TODO: don't know how I feel about both of these next 2 working
    it("edit array notation", function() {
      expect(applyUpdate({ x: [2] }, { x: [1] })).to.eql({ x: [2] })
    })
    it("edit object notation", function() {
      expect(applyUpdate({ x: { 0: 2 } }, { x: [1] })).to.eql({ x: [2] })
    })

    it("delete last element remove parents", function() {
      expect(applyUpdate({ x: { 0: null } }, { x: [1] })).to.eql({ x: [] })
    })

    it("delete still has siblings", function() {
      expect(applyUpdate({ x: { 0: null } }, { x: [1, 2] }))
        .to.eql({ x: [2] })
    })
  })

  // TODO: re-enable parent removal
  //describe("parent removal", function() {
  //  it("nested arrays", function() {
  //    expect(applyUpdate({ x: { 0: { 0: null } } }, { x: [[1]] }))
  //      .to.eql({ x: [[]] })
  //  })
  //})
})


describe('round trip', function() {

  describe('simple', function() {
    it('both empty', function() {
      const a = {};
      const b = {};
      const update = buildUpdateSchema(a, b);
      expect(applyUpdate(update, a)).to.eql(b)
    })

    it('add', function() {
      const a = {};
      const b = { x: 1 };
      const update = buildUpdateSchema(a, b);
      expect(applyUpdate(update, a)).to.eql(b)
    })

    it('edit', function() {
      const a = { x: 1 };
      const b = { x: 2 };
      const update = buildUpdateSchema(a, b);
      expect(applyUpdate(update, a)).to.eql(b)
    })

    it('delete', function() {
      const a = { x: 1 };
      const b = {};
      const update = buildUpdateSchema(a, b);
      expect(applyUpdate(update, a)).to.eql(b)
    })
  })

  describe('nested', function() {
    // TODO: handle when the user sets null explicitly. Probably need to use
    // some sort of a special value to indicate deletion in the updates
    //it('both empty', function() {
    //  const a = { x: { y: 0 } };
    //  const b = { x: null };
    //  const update = buildUpdateSchema(a, b);
    //  expect(applyUpdate(update, a)).to.eql(b)
    //})
  })
})
