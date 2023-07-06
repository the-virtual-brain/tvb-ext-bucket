import {getExtension} from '../utils/bucketUtils';
import {assertIsNode} from "../utils/domUtils";


describe('test getExtension', () => {
    it('returns empty string if name has no extension', () => {
        const name = 'test';
        const expected = '';
        expect(getExtension(name)).toEqual(expected);
    });

    it('returns extension with dot included when present in the name', () => {
        const name = 'test.py';
        const expected = '.py';
        expect(getExtension(name)).toEqual(expected);
    });

    it('returns last suffix containing a . if multiple are in it\'s name', () => {
        const name = 'test.config.json';
        const expected = '.json';
        expect(getExtension(name)).toEqual(expected);
    });

    it('returns entire name if name starts with "." and no multiple dots', () => {
        const name = '.gitignore';
        expect(getExtension(name)).toEqual(name);
    });

    it('returns last suffix starting with "." even if name starts with "."', () => {
       const name = '.eslintrc.js';
       const expected = '.js';
       expect(getExtension(name)).toEqual(expected);
    });

    it('returns empty string from empty string', () => {
        const name = '';
        expect(getExtension(name)).toEqual(name);
    })
})

describe('test domUtils.ts', () => {
   it('tests assertIsNode with Node as argument', () => {
       const node = document.createElement('div');
       expect(() => assertIsNode(node)).not.toThrow(TypeError);
   });

   it('tests assertIsNode with null as argument', () => {
      expect(() => assertIsNode(null)).toThrow(TypeError);
   });
});
