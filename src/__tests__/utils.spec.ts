import {isValidFileName} from "../utils";


describe('Test isValidFileName', () => {
   it('Tests valid file names', () => {
       const name1 = 'test'
       const name2 = 'test.py'
       const name3 = '.test'
       const name4 = 'test123'
       const name5 = 'test test.test'
       const name6 = 'test_test.test'
       expect(isValidFileName(name1)).toBeTruthy();
       expect(isValidFileName(name2)).toBeTruthy();
       expect(isValidFileName(name3)).toBeTruthy();
       expect(isValidFileName(name4)).toBeTruthy();
       expect(isValidFileName(name5)).toBeTruthy();
       expect(isValidFileName(name6)).toBeTruthy();
   });

   it('Tests invalid file names', () => {
       const name1 = 'nul';
       const name2 = '';
       const name3 = ' .';
       const name4 = '/';
       const name5 = '/file.py';
       expect(isValidFileName(name1)).toBeFalsy();
       expect(isValidFileName(name2)).toBeFalsy();
       expect(isValidFileName(name3)).toBeFalsy();
       expect(isValidFileName(name4)).toBeFalsy();
       expect(isValidFileName(name5)).toBeFalsy();
   })
});