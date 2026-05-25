import { extractYoutubeVideoId } from './youtube';

describe('extractYoutubeVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=PBXlWHpYaYY', 'PBXlWHpYaYY'],
    ['https://www.youtube.com/watch?v=PBXlWHpYaYY&t=42s', 'PBXlWHpYaYY'],
    ['https://youtube.com/watch?v=PBXlWHpYaYY', 'PBXlWHpYaYY'],
    ['https://m.youtube.com/watch?v=PBXlWHpYaYY', 'PBXlWHpYaYY'],
    ['https://youtu.be/PBXlWHpYaYY', 'PBXlWHpYaYY'],
    ['https://www.youtube.com/embed/PBXlWHpYaYY', 'PBXlWHpYaYY'],
    ['https://www.youtube.com/shorts/PBXlWHpYaYY', 'PBXlWHpYaYY'],
    ['https://www.youtube.com/live/PBXlWHpYaYY', 'PBXlWHpYaYY'],
    ['https://www.youtube.com/v/PBXlWHpYaYY', 'PBXlWHpYaYY'],
  ])('extracts ID from "%s"', (url, expected) => {
    expect(extractYoutubeVideoId(url)).toBe(expected);
  });

  it.each([
    ['https://example.com/foo'],
    ['https://www.youtube.com/'],
    ['https://www.youtube.com/playlist?list=PL'],
    ['not a url at all'],
    [''],
    ['https://youtu.be/'],
    ['https://www.youtube.com/watch'],
  ])('returns null for invalid input "%s"', (url) => {
    expect(extractYoutubeVideoId(url)).toBeNull();
  });
});
