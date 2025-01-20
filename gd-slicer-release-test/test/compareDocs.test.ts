import { compareTexts_ } from '../src/compareDocs';
describe('compareTexts_', () => {
  it('should not throw an error when texts match', () => {
    const texts1 = ['Line 1', 'Line 2', 'Line 3'];
    const texts2 = ['Line 1', 'Line 2', 'Line 3'];

    expect(() => {
      compareTexts_(texts1, texts2, 'testFile');
    }).not.toThrow();
  });

  it('should throw an error when texts do not match', () => {
    const texts1 = ['Line 1', 'Line 2', 'Line 3'];
    const texts2 = ['Line 1', 'Different Line', 'Line 3'];

    expect(() => {
      compareTexts_(texts1, texts2, 'testFile');
    }).toThrow('Different text');
  });

  it('should throw an error when texts have different lengths', () => {
    const texts1 = ['Line 1', 'Line 2'];
    const texts2 = ['Line 1', 'Line 2', 'Line 3'];

    expect(() => {
      compareTexts_(texts1, texts2, 'testFile');
    }).toThrow('Different number of paragraphs');
  });

  it('should throw an error when the number of blank lines differs', () => {
    const texts1 = ['Line 1', '', '', '', '', 'Line 2', 'Line 3'];
    const texts2 = ['Line 1', '', 'Line 2', '', 'Line 3', '', ''];

    expect(() => {
      compareTexts_(texts1, texts2, 'testFile');
    }).toThrow('Different text');
  });
});
